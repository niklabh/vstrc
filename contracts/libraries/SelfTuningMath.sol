// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SelfTuningMath
 * @notice Library for the self-tuning dividend rate calculations
 *
 * === SELF-TUNING MECHANISM ===
 *
 * The variable dividend rate (VDR) is calculated as:
 *
 *   VDR = BaseRate + Adjustment
 *
 * Where:
 *   - BaseRate is the minimum yield rate (e.g., 8% annualized)
 *   - Adjustment = K * (TargetPrice - MarketPrice) / TargetPrice
 *   - K is the sensitivity coefficient (tuning parameter)
 *
 * When MarketPrice < TargetPrice:
 *   → Adjustment is positive → Higher yield → Attracts buyers → Price rises
 *
 * When MarketPrice > TargetPrice:
 *   → Adjustment is negative → Lower yield → Reduces buy pressure → Price falls
 *
 * The rate is bounded by [MIN_RATE, MAX_RATE] to prevent extreme behavior.
 *
 * === DIVIDEND DISTRIBUTION ===
 *
 * Dividends are distributed per epoch (e.g., weekly):
 *   DividendPerShare = (TotalAssets * VDR * EpochDuration) / (365 days * TotalShares)
 *
 * === COLLATERAL HEALTH ===
 *
 * CollateralRatio = BTCTreasuryValue / TotalSharesOutstanding
 * If CollateralRatio < 1.0, the system is undercollateralized.
 */
library SelfTuningMath {
    uint256 constant PRECISION = 1e18;
    uint256 constant BPS = 10000; // basis points
    uint256 constant YEAR = 365 days;

    /**
     * @notice Calculate the variable dividend rate based on price deviation
     * @param targetPrice Target peg price (scaled by 1e6, e.g., 100e6 for $100)
     * @param marketPrice Current market price (scaled by 1e6)
     * @param baseRateBps Base yield rate in basis points (e.g., 800 = 8%)
     * @param sensitivityBps Sensitivity coefficient in basis points (e.g., 2000 = 20%)
     * @param minRateBps Minimum yield rate in basis points
     * @param maxRateBps Maximum yield rate in basis points
     * @return rateBps The calculated variable dividend rate in basis points
     */
    function calculateVariableRate(
        uint256 targetPrice,
        uint256 marketPrice,
        uint256 baseRateBps,
        uint256 sensitivityBps,
        uint256 minRateBps,
        uint256 maxRateBps
    ) internal pure returns (uint256 rateBps) {
        if (targetPrice == 0) return baseRateBps;

        // Calculate price deviation: (target - market) / target
        // This can be negative (when market > target), so we handle both cases
        if (marketPrice <= targetPrice) {
            // Price below target → increase yield
            uint256 deviation = ((targetPrice - marketPrice) * BPS) / targetPrice;
            uint256 adjustment = (sensitivityBps * deviation) / BPS;
            rateBps = baseRateBps + adjustment;
        } else {
            // Price above target → decrease yield
            uint256 deviation = ((marketPrice - targetPrice) * BPS) / targetPrice;
            uint256 adjustment = (sensitivityBps * deviation) / BPS;
            if (adjustment >= baseRateBps) {
                rateBps = minRateBps;
            } else {
                rateBps = baseRateBps - adjustment;
            }
        }

        // Clamp to [min, max]
        if (rateBps < minRateBps) rateBps = minRateBps;
        if (rateBps > maxRateBps) rateBps = maxRateBps;
    }

    /**
     * @notice Calculate dividend amount for an epoch
     * @param totalAssets Total assets under management (USDC, scaled by 1e6)
     * @param rateBps Current variable rate in basis points
     * @param epochDuration Duration of the epoch in seconds
     * @return dividend The dividend amount for this epoch
     */
    function calculateEpochDividend(
        uint256 totalAssets,
        uint256 rateBps,
        uint256 epochDuration
    ) internal pure returns (uint256 dividend) {
        // dividend = totalAssets * rate * epochDuration / (BPS * YEAR)
        dividend = (totalAssets * rateBps * epochDuration) / (BPS * YEAR);
    }

    /**
     * @notice Calculate collateral ratio
     * @param btcTreasuryValue Value of BTC holdings in USDC terms
     * @param cashReserve Cash reserve value in USDC terms
     * @param totalLiabilities Total share value at target price
     * @return ratio Collateral ratio scaled by PRECISION (1e18 = 100%)
     */
    function collateralRatio(
        uint256 btcTreasuryValue,
        uint256 cashReserve,
        uint256 totalLiabilities
    ) internal pure returns (uint256 ratio) {
        if (totalLiabilities == 0) return type(uint256).max;
        ratio = ((btcTreasuryValue + cashReserve) * PRECISION) / totalLiabilities;
    }
}
