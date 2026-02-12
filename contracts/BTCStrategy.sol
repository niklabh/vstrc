// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "./interfaces/IAaveLendingPool.sol";
import "./interfaces/IStrategy.sol";

/**
 * @title BTCStrategy
 * @notice BTC-Backed Engine for the vSTRC protocol
 * @dev Takes deposited USDC, converts 80% to WBTC via Uniswap V3,
 *      keeps 20% in Aave as cash reserve for redemptions and dividends.
 *      Uses Chainlink price feeds for real-time BTC treasury valuation.
 */
contract BTCStrategy is IStrategy, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Roles ───────────────────────────────────────────────────────
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    // ─── Tokens ──────────────────────────────────────────────────────
    IERC20 public immutable usdc;
    IERC20 public immutable wbtc;
    IERC20 public immutable aUsdc; // Aave aToken for USDC

    // ─── External Protocols ──────────────────────────────────────────
    AggregatorV3Interface public immutable btcUsdPriceFeed;
    AggregatorV3Interface public immutable usdcUsdPriceFeed;
    address public immutable uniswapRouter;
    IAaveLendingPool public immutable aavePool;

    // ─── Configuration ───────────────────────────────────────────────
    uint256 public btcAllocationBps = 8000;  // 80% to BTC
    uint256 public cashAllocationBps = 2000; // 20% to cash reserve
    uint24 public uniswapPoolFee = 3000;     // 0.3% pool fee
    uint256 public maxSlippageBps = 100;     // 1% max slippage

    // ─── State ───────────────────────────────────────────────────────
    uint256 public totalWbtcHeld;        // Total WBTC in strategy
    uint256 public totalCashDeployed;    // Total USDC deployed to Aave

    // ─── Circuit Breaker ─────────────────────────────────────────────
    uint256 public lastBtcPrice;
    uint256 public lastPriceTimestamp;
    uint256 public circuitBreakerThresholdBps = 2000; // 20% drop
    uint256 public circuitBreakerWindow = 1 hours;
    bool public circuitBreakerTripped;

    // ─── Events ──────────────────────────────────────────────────────
    event Deployed(uint256 usdcAmount, uint256 btcBought, uint256 cashDeployed);
    event Withdrawn(uint256 usdcRequested, uint256 usdcReturned);
    event Rebalanced(bool soldBtc, uint256 amount);
    event CircuitBreakerTripped(uint256 previousPrice, uint256 currentPrice);
    event CircuitBreakerReset();
    event YieldHarvested(uint256 amount);
    event AllocationUpdated(uint256 btcBps, uint256 cashBps);
    // [L-3] Events for parameter changes
    event MaxSlippageUpdated(uint256 newSlippageBps);
    event CircuitBreakerParamsUpdated(uint256 thresholdBps, uint256 window);
    event EmergencyWithdrawExecuted(address indexed to);

    // ─── Errors ──────────────────────────────────────────────────────
    error CircuitBreakerActive();
    error InvalidAllocation();
    error InsufficientCashReserve();
    error StalePrice();
    error InvalidPrice();           // [C-1] Oracle returned non-positive price
    error ZeroAmount();
    error ZeroAddress();            // [L-6] Zero address in constructor
    error InvalidParams();          // [L-4, L-5, L-7] Invalid admin parameters
    error SwapReturnDataInvalid();  // [M-8] Invalid swap return data

    /**
     * @dev [L-6] All constructor parameters are validated against zero address
     */
    constructor(
        address _usdc,
        address _wbtc,
        address _aUsdc,
        address _btcUsdFeed,
        address _usdcUsdFeed,
        address _uniswapRouter,
        address _aavePool,
        address _vault,
        address _manager
    ) {
        // [L-6] Zero-address checks for all parameters
        if (_usdc == address(0)) revert ZeroAddress();
        if (_wbtc == address(0)) revert ZeroAddress();
        if (_aUsdc == address(0)) revert ZeroAddress();
        if (_btcUsdFeed == address(0)) revert ZeroAddress();
        if (_usdcUsdFeed == address(0)) revert ZeroAddress();
        if (_uniswapRouter == address(0)) revert ZeroAddress();
        if (_aavePool == address(0)) revert ZeroAddress();
        if (_vault == address(0)) revert ZeroAddress();
        if (_manager == address(0)) revert ZeroAddress();

        usdc = IERC20(_usdc);
        wbtc = IERC20(_wbtc);
        aUsdc = IERC20(_aUsdc);
        btcUsdPriceFeed = AggregatorV3Interface(_btcUsdFeed);
        usdcUsdPriceFeed = AggregatorV3Interface(_usdcUsdFeed);
        uniswapRouter = _uniswapRouter;
        aavePool = IAaveLendingPool(_aavePool);

        _grantRole(DEFAULT_ADMIN_ROLE, _manager);
        _grantRole(VAULT_ROLE, _vault);
        _grantRole(MANAGER_ROLE, _manager);

        // Initialize circuit breaker price
        lastBtcPrice = _getBtcPrice();
        lastPriceTimestamp = block.timestamp;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                        CORE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Deploy USDC capital: 80% → WBTC via Uniswap, 20% → Aave
     * @param usdcAmount Amount of USDC to deploy
     */
    function deploy(uint256 usdcAmount) external override onlyRole(VAULT_ROLE) nonReentrant {
        if (usdcAmount == 0) revert ZeroAmount();
        _checkCircuitBreaker();

        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);

        uint256 btcAmount = (usdcAmount * btcAllocationBps) / 10000;
        uint256 cashAmount = usdcAmount - btcAmount;

        // Deploy BTC portion via Uniswap V3
        uint256 wbtcReceived = _swapUsdcToWbtc(btcAmount);
        totalWbtcHeld += wbtcReceived;

        // Deploy cash portion to Aave
        _depositToAave(cashAmount);
        totalCashDeployed += cashAmount;

        emit Deployed(usdcAmount, wbtcReceived, cashAmount);
    }

    /**
     * @notice Withdraw USDC for vault redemptions
     * @dev First draws from cash reserve, then liquidates BTC if needed
     * @param usdcAmount Amount of USDC requested
     * @return actualWithdrawn Amount of USDC actually returned
     */
    function withdraw(uint256 usdcAmount) external override onlyRole(VAULT_ROLE) nonReentrant returns (uint256 actualWithdrawn) {
        if (usdcAmount == 0) revert ZeroAmount();

        uint256 cashAvailable = cashReserveValue();

        if (usdcAmount <= cashAvailable) {
            // Withdraw entirely from cash reserve
            actualWithdrawn = _withdrawFromAave(usdcAmount);
            totalCashDeployed = totalCashDeployed > actualWithdrawn ? totalCashDeployed - actualWithdrawn : 0;
        } else {
            // Withdraw all cash, then liquidate BTC for remainder
            uint256 fromCash = _withdrawFromAave(cashAvailable);
            totalCashDeployed = 0;

            uint256 remaining = usdcAmount - fromCash;
            uint256 fromBtc = _swapWbtcToUsdc(remaining);
            actualWithdrawn = fromCash + fromBtc;
        }

        usdc.safeTransfer(msg.sender, actualWithdrawn);
        emit Withdrawn(usdcAmount, actualWithdrawn);
    }

    /**
     * @notice Rebalance between BTC and cash reserve
     * @param sellBtc If true, sell BTC for cash; if false, buy BTC with cash
     * @param amount Amount in USDC terms to rebalance
     */
    function rebalance(bool sellBtc, uint256 amount) external override onlyRole(VAULT_ROLE) nonReentrant {
        if (amount == 0) revert ZeroAmount();
        _checkCircuitBreaker();

        if (sellBtc) {
            // Sell WBTC → USDC → Aave
            uint256 usdcReceived = _swapWbtcToUsdc(amount);
            _depositToAave(usdcReceived);
            totalCashDeployed += usdcReceived;
        } else {
            // Withdraw USDC from Aave → Buy WBTC
            uint256 cashAvailable = cashReserveValue();
            if (amount > cashAvailable) revert InsufficientCashReserve();

            uint256 usdcWithdrawn = _withdrawFromAave(amount);
            totalCashDeployed = totalCashDeployed > usdcWithdrawn ? totalCashDeployed - usdcWithdrawn : 0;

            uint256 wbtcBought = _swapUsdcToWbtc(usdcWithdrawn);
            totalWbtcHeld += wbtcBought;
        }

        emit Rebalanced(sellBtc, amount);
    }

    /**
     * @notice Harvest yield from Aave (difference between aToken balance and deployed)
     * @return yieldAmount USDC yield harvested
     */
    function harvestYield() external override onlyRole(VAULT_ROLE) nonReentrant returns (uint256 yieldAmount) {
        uint256 currentValue = cashReserveValue();
        if (currentValue <= totalCashDeployed) return 0;

        yieldAmount = currentValue - totalCashDeployed;
        uint256 withdrawn = _withdrawFromAave(yieldAmount);

        usdc.safeTransfer(msg.sender, withdrawn);
        emit YieldHarvested(withdrawn);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                        VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Total strategy value in USDC terms
     */
    function totalValue() external view override returns (uint256) {
        return btcTreasuryValue() + cashReserveValue();
    }

    /**
     * @notice BTC treasury value in USDC terms
     */
    function btcTreasuryValue() public view override returns (uint256) {
        if (totalWbtcHeld == 0) return 0;

        uint256 btcPrice = _getBtcPrice();     // 8 decimals
        uint256 usdcPrice = _getUsdcPrice();   // 8 decimals

        // WBTC has 8 decimals, USDC has 6 decimals
        // value = wbtcAmount * btcPrice / usdcPrice * (10^6 / 10^8)
        // Simplified: value = wbtcAmount * btcPrice / (usdcPrice * 100)
        return (totalWbtcHeld * btcPrice) / (usdcPrice * 100);
    }

    /**
     * @notice Cash reserve value (aToken balance) in USDC terms
     */
    function cashReserveValue() public view override returns (uint256) {
        return aUsdc.balanceOf(address(this));
    }

    // ═══════════════════════════════════════════════════════════════════
    //                     CIRCUIT BREAKER
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Check if BTC price dropped beyond threshold within window
     */
    function _checkCircuitBreaker() internal {
        uint256 currentPrice = _getBtcPrice();
        uint256 timeDelta = block.timestamp - lastPriceTimestamp;

        if (timeDelta <= circuitBreakerWindow && lastBtcPrice > 0) {
            uint256 dropBps = 0;
            if (currentPrice < lastBtcPrice) {
                dropBps = ((lastBtcPrice - currentPrice) * 10000) / lastBtcPrice;
            }

            if (dropBps >= circuitBreakerThresholdBps) {
                circuitBreakerTripped = true;
                emit CircuitBreakerTripped(lastBtcPrice, currentPrice);
            }
        }

        if (circuitBreakerTripped) revert CircuitBreakerActive();

        // Update price checkpoint
        lastBtcPrice = currentPrice;
        lastPriceTimestamp = block.timestamp;
    }

    /**
     * @notice Manager can reset circuit breaker after assessment
     */
    function resetCircuitBreaker() external onlyRole(MANAGER_ROLE) {
        circuitBreakerTripped = false;
        lastBtcPrice = _getBtcPrice();
        lastPriceTimestamp = block.timestamp;
        emit CircuitBreakerReset();
    }

    // ═══════════════════════════════════════════════════════════════════
    //                     ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function setAllocation(uint256 _btcBps, uint256 _cashBps) external onlyRole(MANAGER_ROLE) {
        if (_btcBps + _cashBps != 10000) revert InvalidAllocation();
        btcAllocationBps = _btcBps;
        cashAllocationBps = _cashBps;
        emit AllocationUpdated(_btcBps, _cashBps);
    }

    /**
     * @notice Set maximum slippage for Uniswap swaps
     * @dev [L-4] Capped at 1000 bps (10%) to prevent disabling slippage protection
     */
    function setMaxSlippage(uint256 _slippageBps) external onlyRole(MANAGER_ROLE) {
        if (_slippageBps > 1000) revert InvalidParams(); // [L-4] Max 10%
        maxSlippageBps = _slippageBps;
        emit MaxSlippageUpdated(_slippageBps); // [L-3]
    }

    /**
     * @notice Set circuit breaker parameters
     * @dev [L-5] Window minimum is 5 minutes to prevent effective disabling
     * @dev [L-7] Threshold bounded: 0 < threshold <= 5000 (50%)
     */
    function setCircuitBreakerParams(uint256 _thresholdBps, uint256 _window) external onlyRole(MANAGER_ROLE) {
        if (_thresholdBps == 0 || _thresholdBps > 5000) revert InvalidParams(); // [L-7]
        if (_window < 5 minutes) revert InvalidParams(); // [L-5]
        circuitBreakerThresholdBps = _thresholdBps;
        circuitBreakerWindow = _window;
        emit CircuitBreakerParamsUpdated(_thresholdBps, _window); // [L-3]
    }

    // ═══════════════════════════════════════════════════════════════════
    //                     EMERGENCY WITHDRAW
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Emergency withdraw all funds to a specified address
     * @dev Manager can call instantly. Use a multisig for MANAGER_ROLE
     *      in production to mitigate single-key compromise risk.
     * @param to Destination address for all strategy funds
     */
    function emergencyWithdraw(address to) external onlyRole(MANAGER_ROLE) {
        if (to == address(0)) revert ZeroAddress();

        // Withdraw all from Aave
        uint256 aaveBalance = aUsdc.balanceOf(address(this));
        if (aaveBalance > 0) {
            aavePool.withdraw(address(usdc), type(uint256).max, to);
        }

        // Transfer all WBTC
        uint256 wbtcBalance = wbtc.balanceOf(address(this));
        if (wbtcBalance > 0) {
            wbtc.safeTransfer(to, wbtcBalance);
        }

        // Transfer any remaining USDC
        uint256 usdcBalance = usdc.balanceOf(address(this));
        if (usdcBalance > 0) {
            usdc.safeTransfer(to, usdcBalance);
        }

        totalWbtcHeld = 0;
        totalCashDeployed = 0;

        emit EmergencyWithdrawExecuted(to);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                     INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @dev [C-1] Validates oracle price is positive to prevent uint256 wraparound.
     *      A negative Chainlink price cast to uint256 would become ~2^256,
     *      breaking all valuation logic.
     */
    function _getBtcPrice() internal view returns (uint256) {
        (, int256 price, , uint256 updatedAt, ) = btcUsdPriceFeed.latestRoundData();
        if (price <= 0) revert InvalidPrice(); // [C-1]
        if (block.timestamp - updatedAt > 3600) revert StalePrice();
        return uint256(price);
    }

    /**
     * @dev [C-1] Validates oracle price is positive
     */
    function _getUsdcPrice() internal view returns (uint256) {
        (, int256 price, , uint256 updatedAt, ) = usdcUsdPriceFeed.latestRoundData();
        if (price <= 0) revert InvalidPrice(); // [C-1]
        if (block.timestamp - updatedAt > 86400) revert StalePrice();
        return uint256(price);
    }

    /**
     * @notice Swap USDC → WBTC via Uniswap V3 exactInputSingle
     * @dev [H-2] Uses forceApprove instead of safeIncreaseAllowance to prevent
     *      stale allowance accumulation on failed swaps.
     *      [M-8] Validates return data length before decoding.
     *      [H-1] Explicit output validation after swap.
     *      Resets allowance to 0 after swap for defense in depth.
     */
    function _swapUsdcToWbtc(uint256 usdcAmount) internal returns (uint256 wbtcReceived) {
        usdc.forceApprove(uniswapRouter, usdcAmount); // [H-2]

        // Calculate minimum output with slippage protection
        uint256 btcPrice = _getBtcPrice();
        uint256 expectedWbtc = (usdcAmount * 1e8 * 1e2) / btcPrice; // USDC 6 dec → WBTC 8 dec
        uint256 minOut = (expectedWbtc * (10000 - maxSlippageBps)) / 10000;

        // ISwapRouter.ExactInputSingleParams
        bytes memory data = abi.encodeWithSignature(
            "exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))",
            address(usdc),
            address(wbtc),
            uniswapPoolFee,
            address(this),
            block.timestamp + 300,
            usdcAmount,
            minOut,
            0 // sqrtPriceLimitX96
        );

        (bool success, bytes memory result) = uniswapRouter.call(data);
        if (!success || result.length < 32) revert SwapReturnDataInvalid(); // [M-8]
        wbtcReceived = abi.decode(result, (uint256));
        require(wbtcReceived >= minOut, "Insufficient WBTC output"); // [H-1] Explicit check

        // [H-2] Reset allowance after swap to prevent stale accumulation
        usdc.forceApprove(uniswapRouter, 0);
    }

    /**
     * @notice Swap WBTC → USDC via Uniswap V3
     * @param usdcAmountNeeded Amount of USDC needed
     * @dev [C-3] Validates actual USDC received by checking balance delta,
     *      instead of returning the hardcoded usdcAmountNeeded value.
     *      [H-2] Uses forceApprove and resets after swap.
     *      [M-8] Validates return data from low-level call.
     */
    function _swapWbtcToUsdc(uint256 usdcAmountNeeded) internal returns (uint256 usdcReceived) {
        uint256 btcPrice = _getBtcPrice();
        // Estimate WBTC needed: usdcNeeded * 1e2 / btcPrice (accounting for decimal differences)
        uint256 wbtcNeeded = (usdcAmountNeeded * 1e2 * 1e8) / btcPrice;
        uint256 maxWbtcIn = (wbtcNeeded * (10000 + maxSlippageBps)) / 10000;

        if (maxWbtcIn > totalWbtcHeld) maxWbtcIn = totalWbtcHeld;

        wbtc.forceApprove(uniswapRouter, maxWbtcIn); // [H-2]

        // [C-3] Track USDC balance before swap to verify actual amount received
        uint256 usdcBefore = usdc.balanceOf(address(this));

        bytes memory data = abi.encodeWithSignature(
            "exactOutputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))",
            address(wbtc),
            address(usdc),
            uniswapPoolFee,
            address(this),
            block.timestamp + 300,
            usdcAmountNeeded,
            maxWbtcIn,
            0
        );

        (bool success, bytes memory result) = uniswapRouter.call(data);
        if (!success || result.length < 32) revert SwapReturnDataInvalid(); // [M-8]
        uint256 wbtcUsed = abi.decode(result, (uint256));
        totalWbtcHeld -= wbtcUsed;

        // [C-3] Verify actual USDC received from balance delta
        usdcReceived = usdc.balanceOf(address(this)) - usdcBefore;

        // [H-2] Reset allowance after swap
        wbtc.forceApprove(uniswapRouter, 0);
    }

    /**
     * @dev [H-2] Uses forceApprove and resets after deposit
     */
    function _depositToAave(uint256 amount) internal {
        usdc.forceApprove(address(aavePool), amount); // [H-2]
        aavePool.supply(address(usdc), amount, address(this), 0);
        usdc.forceApprove(address(aavePool), 0); // [H-2] Reset allowance
    }

    function _withdrawFromAave(uint256 amount) internal returns (uint256) {
        return aavePool.withdraw(address(usdc), amount, address(this));
    }
}
