// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IStrategy.sol";

/**
 * @title MockStrategy
 * @notice Simplified strategy for testing — holds USDC directly
 */
contract MockStrategy is IStrategy {
    using SafeERC20 for IERC20;

    IERC20 public usdc;
    address public vault;

    uint256 public mockBtcValue;
    uint256 public mockCashValue;
    uint256 public simulatedYield;

    constructor(address _usdc, address _vault) {
        usdc = IERC20(_usdc);
        vault = _vault;
    }

    function deploy(uint256 usdcAmount) external override {
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        uint256 btcPortion = (usdcAmount * 80) / 100;
        uint256 cashPortion = usdcAmount - btcPortion;
        mockBtcValue += btcPortion;
        mockCashValue += cashPortion;
    }

    function withdraw(uint256 usdcAmount) external override returns (uint256) {
        uint256 available = usdc.balanceOf(address(this));
        uint256 toReturn = usdcAmount > available ? available : usdcAmount;

        if (toReturn <= mockCashValue) {
            mockCashValue -= toReturn;
        } else {
            uint256 fromBtc = toReturn - mockCashValue;
            mockCashValue = 0;
            mockBtcValue = mockBtcValue > fromBtc ? mockBtcValue - fromBtc : 0;
        }

        usdc.safeTransfer(msg.sender, toReturn);
        return toReturn;
    }

    function totalValue() external view override returns (uint256) {
        return mockBtcValue + mockCashValue;
    }

    function btcTreasuryValue() external view override returns (uint256) {
        return mockBtcValue;
    }

    function cashReserveValue() external view override returns (uint256) {
        return mockCashValue;
    }

    function rebalance(bool sellBtc, uint256 amount) external override {
        if (sellBtc) {
            mockBtcValue = mockBtcValue > amount ? mockBtcValue - amount : 0;
            mockCashValue += amount;
        } else {
            mockCashValue = mockCashValue > amount ? mockCashValue - amount : 0;
            mockBtcValue += amount;
        }
    }

    function harvestYield() external override returns (uint256) {
        uint256 yield_ = simulatedYield;
        simulatedYield = 0;
        mockCashValue += yield_;
        return yield_;
    }

    // Test helpers
    function setSimulatedYield(uint256 _yield) external {
        simulatedYield = _yield;
    }

    function setBtcValue(uint256 _value) external {
        mockBtcValue = _value;
    }
}
