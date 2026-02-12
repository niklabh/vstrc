// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol"; // L-1: Import SafeERC20
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "./interfaces/IStrategy.sol";
import "./libraries/SelfTuningMath.sol";

/**
 * @title vSTRC — Vaulted STRC
 * @notice Bitcoin-backed, yield-bearing ERC-4626 vault token
 * @dev
 *  - Asset: USDC (stablecoin deposits/withdrawals)
 *  - Share: vSTRC (represents stake in the BTC treasury)
 *  - Yield: Variable dividend rate auto-tuned to maintain $100 peg
 *
 * Architecture:
 *  ┌──────────┐     deposit      ┌──────────────┐     deploy     ┌──────────────┐
 *  │   User   │ ──────────────→  │  vSTRC Vault  │ ────────────→ │ BTCStrategy  │
 *  │          │ ←──────────────  │  (ERC-4626)   │ ←──────────── │  80% WBTC    │
 *  └──────────┘    withdraw      └──────────────┘   withdraw     │  20% Aave    │
 *                                       │                        └──────────────┘
 *                                       │ rebalanceYield()
 *                                       ▼
 *                               ┌──────────────┐
 *                               │  Self-Tuning  │
 *                               │  Dividend     │
 *                               │  Engine       │
 *                               └──────────────┘
 */
contract vSTRC is ERC4626, ERC20Permit, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20; // [L-1] Safe approval operations
    // [I-1] Removed: `using SelfTuningMath for *` — library is called explicitly

    // ─── Roles ───────────────────────────────────────────────────────
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

    // ─── Strategy ────────────────────────────────────────────────────
    IStrategy public strategy;

    // ─── Price Oracle (vSTRC secondary market) ───────────────────────
    /// @dev Can be a Chainlink feed, TWAP oracle, or manual feed
    AggregatorV3Interface public vSTRCPriceOracle;
    uint256 public constant VSTRC_ORACLE_STALENESS = 3600; // [M-6] 1 hour staleness threshold

    // ─── Dividend Configuration ──────────────────────────────────────
    uint256 public targetPrice = 100e6;          // $100 target peg (USDC 6 decimals)
    uint256 public baseRateBps = 800;            // 8% base yield
    uint256 public sensitivityBps = 2000;        // 20% sensitivity coefficient (K)
    uint256 public minRateBps = 100;             // 1% minimum yield
    uint256 public maxRateBps = 2500;            // 25% maximum yield
    uint256 public currentRateBps;               // Current calculated rate

    // ─── Epoch Tracking ──────────────────────────────────────────────
    uint256 public epochDuration = 7 days;       // Weekly epochs
    uint256 public lastEpochTimestamp;
    uint256 public totalDividendsPaid;
    uint256 public epochCount;

    // ─── Accumulated Yield (share price growth) ──────────────────────
    // [C-2] Tracks ACTUAL per-share yield based on totalAssets growth,
    //       not the theoretical epochDividend target. Updated each epoch.
    uint256 public accumulatedYieldPerShare;      // Scaled by YIELD_PRECISION
    uint256 public lastAssetsPerShare;            // Snapshot at end of each epoch
    uint256 private constant YIELD_PRECISION = 1e18;

    // ─── Circuit Breaker State ───────────────────────────────────────
    bool public mintingPaused;
    bool public redeemingPaused;

    // ─── Deposit Caps ────────────────────────────────────────────────
    uint256 public maxTotalDeposits = type(uint256).max;
    uint256 public maxSingleDeposit = type(uint256).max;
    uint256 public minDeposit = 1e6; // $1 USDC minimum

    // ─── Events ──────────────────────────────────────────────────────
    event StrategyUpdated(address newStrategy);
    event YieldRebalanced(uint256 newRate, uint256 marketPrice, uint256 targetPrice);
    event DividendDistributed(uint256 epoch, uint256 amount, uint256 rateBps);
    event DividendFunded(uint256 epoch, uint256 targetAmount, uint256 fundedToVault);
    event CircuitBreakerUpdate(bool mintPaused, bool redeemPaused);
    event EpochAdvanced(uint256 epoch, uint256 timestamp);
    event OracleUpdated(address newOracle);
    // [L-3] Events for parameter changes
    event DividendParamsUpdated(uint256 baseRate, uint256 sensitivity, uint256 minRate, uint256 maxRate);
    event TargetPriceUpdated(uint256 newTargetPrice);
    event EpochDurationUpdated(uint256 newDuration);
    event DepositCapsUpdated(uint256 maxTotal, uint256 maxSingle, uint256 minDep);

    // ─── Errors ──────────────────────────────────────────────────────
    error MintingPaused();
    error RedeemingPaused();
    error DepositTooSmall();
    error DepositTooLarge();
    error MaxDepositsExceeded();
    error EpochNotElapsed();
    error NoStrategy();
    error InvalidStrategy();
    error InvalidPrice();   // [C-1] Oracle returned non-positive price
    error StalePrice();     // [M-6] Oracle price is stale
    error InvalidParams();  // [M-2, M-3, M-4] Invalid admin parameter

    constructor(
        IERC20 _usdc,
        address _manager
    )
        ERC4626(_usdc)
        ERC20("Vaulted STRC", "vSTRC")
        ERC20Permit("Vaulted STRC")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, _manager);
        _grantRole(MANAGER_ROLE, _manager);
        _grantRole(KEEPER_ROLE, _manager);

        currentRateBps = baseRateBps;
        lastEpochTimestamp = block.timestamp;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                    ERC-4626 OVERRIDES
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Total assets include vault balance + strategy holdings
     */
    function totalAssets() public view override returns (uint256) {
        uint256 vaultBalance = IERC20(asset()).balanceOf(address(this));
        uint256 strategyValue = address(strategy) != address(0) ? strategy.totalValue() : 0;
        return vaultBalance + strategyValue;
    }

    /**
     * @notice Override deposit to add checks and deploy to strategy
     */
    function deposit(uint256 assets, address receiver)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256 shares)
    {
        if (mintingPaused) revert MintingPaused();
        if (assets < minDeposit) revert DepositTooSmall();
        if (assets > maxSingleDeposit) revert DepositTooLarge();
        if (totalAssets() + assets > maxTotalDeposits) revert MaxDepositsExceeded();

        shares = super.deposit(assets, receiver);

        // Deploy to strategy
        _deployToStrategy();
    }

    /**
     * @notice Override mint to add checks
     * @dev [H-4] Validates deposit limits BEFORE calling super.mint() to
     *      follow checks-effects-interactions pattern
     */
    function mint(uint256 shares, address receiver)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256 assets)
    {
        if (mintingPaused) revert MintingPaused();

        // [H-4] Pre-calculate assets and validate BEFORE minting
        uint256 expectedAssets = previewMint(shares);
        if (expectedAssets < minDeposit) revert DepositTooSmall();
        if (expectedAssets > maxSingleDeposit) revert DepositTooLarge();
        if (totalAssets() + expectedAssets > maxTotalDeposits) revert MaxDepositsExceeded();

        assets = super.mint(shares, receiver);

        _deployToStrategy();
    }

    /**
     * @notice Override withdraw to pull from strategy if needed
     * @dev [M-5] Added whenNotPaused for consistency — use setCircuitBreaker
     *      for granular pause control over redeeming only
     */
    function withdraw(uint256 assets, address receiver, address owner)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256 shares)
    {
        if (redeemingPaused) revert RedeemingPaused();

        // Ensure vault has enough liquidity
        _ensureLiquidity(assets);

        shares = super.withdraw(assets, receiver, owner);
    }

    /**
     * @notice Override redeem to pull from strategy if needed
     * @dev [M-5] Added whenNotPaused for consistency
     */
    function redeem(uint256 shares, address receiver, address owner)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256 assets)
    {
        if (redeemingPaused) revert RedeemingPaused();

        assets = previewRedeem(shares);
        _ensureLiquidity(assets);

        assets = super.redeem(shares, receiver, owner);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                 SELF-TUNING DIVIDEND ENGINE
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Core self-tuning function — adjusts yield to maintain peg
     * @dev Called by keepers each epoch. The yield rate adjusts based on
     *      the deviation of vSTRC's market price from the target price.
     *
     * Mathematical Model:
     *   VDR = BaseRate + K * (TargetPrice - MarketPrice) / TargetPrice
     *   Bounded by [minRate, maxRate]
     *
     * When price < target: yield increases → attracts deposits → price rises
     * When price > target: yield decreases → reduces demand → price normalizes
     *
     * [C-2] YIELD DISTRIBUTION MECHANISM (ERC-4626 share price appreciation):
     *
     *   In ERC-4626, the share price = totalAssets() / totalSupply(). Yield is
     *   NOT distributed by minting/transferring tokens — it accrues automatically
     *   as totalAssets() grows (BTC appreciation + Aave interest) while totalSupply()
     *   only changes on deposits/withdrawals. When a shareholder redeems, they receive
     *   proportionally more USDC than they deposited.
     *
     *   This function manages the strategy composition to target the VDR:
     *     1. ALWAYS harvests Aave yield → vault liquidity (every epoch)
     *     2. When price < target → sells BTC + withdraws from strategy to vault
     *        to fund the epoch dividend and ensure redemption liquidity
     *     3. When price > target → deploys vault USDC to strategy (buy more BTC)
     *
     *   accumulatedYieldPerShare tracks ACTUAL per-share growth in totalAssets,
     *   not the theoretical epochDividend target.
     *
     * [H-3] Epoch advances by epochDuration (not block.timestamp) to allow
     *       catch-up of missed epochs without skipping.
     */
    function rebalanceYield() external onlyRole(KEEPER_ROLE) {
        if (block.timestamp < lastEpochTimestamp + epochDuration) revert EpochNotElapsed();

        // Get current market price of vSTRC
        uint256 marketPrice = _getVSTRCPrice();

        // Calculate new variable rate
        uint256 newRate = SelfTuningMath.calculateVariableRate(
            targetPrice,
            marketPrice,
            baseRateBps,
            sensitivityBps,
            minRateBps,
            maxRateBps
        );

        currentRateBps = newRate;

        // Calculate epoch dividend target
        uint256 _totalAssets = totalAssets();
        uint256 supply = totalSupply();
        uint256 epochDividend = SelfTuningMath.calculateEpochDividend(
            _totalAssets,
            newRate,
            epochDuration
        );

        // ── Step 1: Track actual yield BEFORE rebalancing ──────────────
        // Capture the real per-share growth in totalAssets since last epoch.
        // This reflects ALL actual yield: BTC appreciation + Aave interest.
        // Deposits/withdrawals between epochs are proportional to both
        // totalAssets and totalSupply, so per-share value is unaffected.
        if (supply > 0) {
            uint256 currentAssetsPerShare = (_totalAssets * YIELD_PRECISION) / supply;
            if (lastAssetsPerShare > 0 && currentAssetsPerShare > lastAssetsPerShare) {
                accumulatedYieldPerShare += currentAssetsPerShare - lastAssetsPerShare;
            }
        }

        // ── Step 2: Harvest + rebalance strategy ───────────────────────
        uint256 fundedToVault = 0;

        if (address(strategy) != address(0)) {
            // ALWAYS harvest Aave yield — earned interest moves to vault
            // for liquidity regardless of price direction. Note: this does
            // NOT change totalAssets() (vault ↑, strategy ↓ by same amount),
            // but it makes USDC liquid for shareholder redemptions.
            strategy.harvestYield();

            if (marketPrice < targetPrice && epochDividend > 0) {
                // Price below target → boost yield, ensure vault liquidity
                // First, make sure strategy has enough liquid USDC
                uint256 cashAvailable = strategy.cashReserveValue();
                if (epochDividend > cashAvailable) {
                    // Sell BTC for USDC within the strategy
                    uint256 btcToSell = epochDividend - cashAvailable;
                    strategy.rebalance(true, btcToSell);
                }

                // Withdraw dividend-equivalent USDC from strategy to vault.
                // This ensures the vault has liquid USDC for redemptions.
                // (Zero-sum for totalAssets: vault ↑, strategy ↓)
                uint256 vaultBefore = IERC20(asset()).balanceOf(address(this));
                strategy.withdraw(epochDividend);
                fundedToVault = IERC20(asset()).balanceOf(address(this)) - vaultBefore;
            } else if (marketPrice > targetPrice) {
                // Price above target → deploy excess vault USDC to strategy
                // Still harvested Aave yield above for base liquidity
                uint256 vaultBalance = IERC20(asset()).balanceOf(address(this));
                if (vaultBalance > 0) {
                    IERC20(asset()).forceApprove(address(strategy), vaultBalance);
                    strategy.deploy(vaultBalance);
                }
            }
            // When marketPrice == targetPrice: harvest already ran above,
            // no additional rebalancing needed — price is at peg.
        }

        // ── Step 3: Snapshot post-rebalance share price ────────────────
        // Store the per-share value AFTER all strategy actions for next
        // epoch's yield calculation. Uses fresh totalAssets() to capture
        // any micro-changes from rebalancing.
        if (supply > 0) {
            lastAssetsPerShare = (totalAssets() * YIELD_PRECISION) / supply;
        }

        // ── Step 4: Advance epoch ──────────────────────────────────────
        // [H-3] Advance by epochDuration, not block.timestamp, to allow catch-up
        lastEpochTimestamp += epochDuration;
        epochCount++;
        totalDividendsPaid += epochDividend;

        emit YieldRebalanced(newRate, marketPrice, targetPrice);
        emit DividendDistributed(epochCount, epochDividend, newRate);
        emit DividendFunded(epochCount, epochDividend, fundedToVault);
        emit EpochAdvanced(epochCount, block.timestamp);
    }

    /**
     * @notice Get the current collateral ratio
     * @return ratio Scaled by 1e18 (1e18 = 100% collateralized)
     * @dev [M-1] Returns vault USDC balance as collateral when no strategy is set,
     *      instead of returning 0 (which incorrectly signals insolvency)
     */
    function collateralRatio() external view returns (uint256) {
        uint256 totalLiabilities = totalSupply() * targetPrice / 1e6; // In USDC terms

        if (address(strategy) == address(0)) {
            // [M-1] Use vault balance as collateral when no strategy
            uint256 vaultBalance = IERC20(asset()).balanceOf(address(this));
            if (totalLiabilities == 0) return type(uint256).max;
            return (vaultBalance * 1e18) / totalLiabilities;
        }

        return SelfTuningMath.collateralRatio(
            strategy.btcTreasuryValue(),
            strategy.cashReserveValue(),
            totalLiabilities
        );
    }

    /**
     * @notice Get current annualized yield rate
     * @return Current rate in basis points
     */
    function currentYieldRate() external view returns (uint256) {
        return currentRateBps;
    }

    /**
     * @notice Get the projected annual dividend per share
     * @return Annual dividend in USDC per vSTRC share
     * @dev [L-2] Combined formula to minimize intermediate integer truncation
     */
    function projectedAnnualDividend() external view returns (uint256) {
        if (totalSupply() == 0) return 0;
        return (totalAssets() * currentRateBps) / (10000 * totalSupply());
    }

    // ═══════════════════════════════════════════════════════════════════
    //                     INTERNAL HELPERS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @dev [H-6] Buffer is based on vaultBalance (not totalAssets()) to prevent
     *      large strategy holdings from blocking subsequent deployments.
     *      Also uses minDeposit as a floor to ensure a meaningful buffer.
     * @dev [L-1] Uses forceApprove for safe token approval
     */
    function _deployToStrategy() internal {
        if (address(strategy) == address(0)) return;

        uint256 vaultBalance = IERC20(asset()).balanceOf(address(this));
        // [H-6] Buffer based on vault balance, with minDeposit as floor
        uint256 buffer = vaultBalance / 100; // 1% of vault balance
        if (buffer < minDeposit) buffer = minDeposit;

        if (vaultBalance > buffer) {
            uint256 toDeploy = vaultBalance - buffer;
            IERC20(asset()).forceApprove(address(strategy), toDeploy); // [L-1]
            strategy.deploy(toDeploy);
        }
    }

    function _ensureLiquidity(uint256 amount) internal {
        uint256 vaultBalance = IERC20(asset()).balanceOf(address(this));
        if (vaultBalance < amount && address(strategy) != address(0)) {
            uint256 shortfall = amount - vaultBalance;
            strategy.withdraw(shortfall);
        }
    }

    /**
     * @dev [C-1] Validates oracle price is positive to prevent uint256 wraparound
     * @dev [M-6] Checks staleness of the vSTRC price oracle
     */
    function _getVSTRCPrice() internal view returns (uint256) {
        if (address(vSTRCPriceOracle) != address(0)) {
            (, int256 price, , uint256 updatedAt, ) = vSTRCPriceOracle.latestRoundData();
            if (price <= 0) revert InvalidPrice();  // [C-1]
            if (block.timestamp - updatedAt > VSTRC_ORACLE_STALENESS) revert StalePrice(); // [M-6]
            return uint256(price); // Assumes 6 decimal price
        }
        // Fallback: use NAV-based price
        if (totalSupply() == 0) return targetPrice;
        return (totalAssets() * 1e6) / totalSupply();
    }

    // ═══════════════════════════════════════════════════════════════════
    //                     ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function setStrategy(address _strategy) external onlyRole(MANAGER_ROLE) {
        if (_strategy == address(0)) revert InvalidStrategy();
        strategy = IStrategy(_strategy);
        emit StrategyUpdated(_strategy);
    }

    function setVSTRCOracle(address _oracle) external onlyRole(MANAGER_ROLE) {
        vSTRCPriceOracle = AggregatorV3Interface(_oracle);
        emit OracleUpdated(_oracle);
    }

    /**
     * @notice Update dividend rate parameters
     * @dev [M-2] Validates: minRate <= maxRate, baseRate in [min, max],
     *      sensitivity capped at 100% (10000 bps)
     */
    function setDividendParams(
        uint256 _baseRate,
        uint256 _sensitivity,
        uint256 _minRate,
        uint256 _maxRate
    ) external onlyRole(MANAGER_ROLE) {
        if (_minRate > _maxRate) revert InvalidParams();
        if (_baseRate < _minRate || _baseRate > _maxRate) revert InvalidParams();
        if (_sensitivity > 10000) revert InvalidParams(); // Max 100% sensitivity
        baseRateBps = _baseRate;
        sensitivityBps = _sensitivity;
        minRateBps = _minRate;
        maxRateBps = _maxRate;
        emit DividendParamsUpdated(_baseRate, _sensitivity, _minRate, _maxRate); // [L-3]
    }

    /**
     * @notice Update the target peg price
     * @dev [M-4] Prevents setting targetPrice to 0, which would cause division by zero
     */
    function setTargetPrice(uint256 _targetPrice) external onlyRole(MANAGER_ROLE) {
        if (_targetPrice == 0) revert InvalidParams(); // [M-4]
        targetPrice = _targetPrice;
        emit TargetPriceUpdated(_targetPrice); // [L-3]
    }

    /**
     * @notice Update epoch duration
     * @dev [M-3] Minimum 1 hour to prevent infinite rebalancing
     */
    function setEpochDuration(uint256 _duration) external onlyRole(MANAGER_ROLE) {
        if (_duration < 1 hours) revert InvalidParams(); // [M-3]
        epochDuration = _duration;
        emit EpochDurationUpdated(_duration); // [L-3]
    }

    /**
     * @notice Update deposit cap parameters
     * @dev Validates minDeposit > 0
     */
    function setDepositCaps(uint256 _maxTotal, uint256 _maxSingle, uint256 _minDep) external onlyRole(MANAGER_ROLE) {
        if (_minDep == 0) revert InvalidParams();
        maxTotalDeposits = _maxTotal;
        maxSingleDeposit = _maxSingle;
        minDeposit = _minDep;
        emit DepositCapsUpdated(_maxTotal, _maxSingle, _minDep); // [L-3]
    }

    function setCircuitBreaker(bool _mintPaused, bool _redeemPaused) external onlyRole(MANAGER_ROLE) {
        mintingPaused = _mintPaused;
        redeemingPaused = _redeemPaused;
        emit CircuitBreakerUpdate(_mintPaused, _redeemPaused);
    }

    function pause() external onlyRole(MANAGER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(MANAGER_ROLE) {
        _unpause();
    }

    // ═══════════════════════════════════════════════════════════════════
    //                 REQUIRED OVERRIDES (Solidity)
    // ═══════════════════════════════════════════════════════════════════

    function decimals() public pure override(ERC4626, ERC20) returns (uint8) {
        return 6; // Match USDC decimals
    }

    /**
     * @notice [M-7] ERC-4626 inflation attack mitigation
     * @dev Adds virtual shares (10^3) to the conversion math, making the
     *      first-depositor inflation attack economically impractical.
     *      The attacker would need to donate 1000x more to steal 1 unit.
     */
    function _decimalsOffset() internal pure override returns (uint8) {
        return 3;
    }
}
