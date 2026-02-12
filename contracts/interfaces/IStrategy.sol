// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IStrategy
 * @notice Interface for the BTC-backed strategy contract
 */
interface IStrategy {
    /// @notice Deploy capital from vault deposits into BTC + cash reserve
    function deploy(uint256 usdcAmount) external;

    /// @notice Withdraw capital back to the vault for redemptions
    function withdraw(uint256 usdcAmount) external returns (uint256 actualWithdrawn);

    /// @notice Get total value of all strategy holdings in USDC terms
    function totalValue() external view returns (uint256);

    /// @notice Get the current BTC treasury value in USDC terms
    function btcTreasuryValue() external view returns (uint256);

    /// @notice Get the current cash reserve value in USDC terms
    function cashReserveValue() external view returns (uint256);

    /// @notice Rebalance between BTC and cash reserve based on yield needs
    function rebalance(bool sellBtc, uint256 amount) external;

    /// @notice Harvest yield from Aave cash reserve
    function harvestYield() external returns (uint256);
}
