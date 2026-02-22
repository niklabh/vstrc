import React from 'react';
import './TreasuryDashboard.css';
import {
  BtcCoreIcon,
  CashReserveIcon,
  LockVaultIcon,
  PriceFeedIcon,
} from './ProtocolIcons';

function TreasuryDashboard({ data, demoMode }) {
  const formatUSD = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '$0';
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
    return `$${num.toFixed(2)}`;
  };

  const totalAssetsNum = parseFloat(data.totalAssets || '0');
  const fetchedBtcValue = parseFloat(data.btcTreasuryValue);
  const fetchedCashValue = parseFloat(data.cashReserveValue);
  const btcValue = fetchedBtcValue > 0 ? fetchedBtcValue : (totalAssetsNum * 0.8);
  const cashValue = fetchedCashValue > 0 ? fetchedCashValue : (totalAssetsNum * 0.2);
  const totalValue = btcValue + cashValue;

  const btcPercent = totalValue > 0 ? (btcValue / totalValue * 100).toFixed(1) : 80;
  const cashPercent = totalValue > 0 ? (cashValue / totalValue * 100).toFixed(1) : 20;

  const cr = parseFloat(data.collateralRatio || 1.23);
  const crStatus = cr >= 1.5 ? 'healthy' : cr >= 1.0 ? 'adequate' : 'critical';
  const crColor = cr >= 1.5 ? 'green' : cr >= 1.0 ? 'yellow' : 'red';
  const btcPrice = parseFloat(data.btcPrice || '0');
  const btcPriceChange24h = parseFloat(data.btcPriceChange24h || '0');
  const marketUpdatedAt = Number(data.marketUpdatedAt || 0);

  const resolvedBtcPrice = btcPrice > 0 ? btcPrice : 97000;
  const isPriceChangePositive = btcPriceChange24h >= 0;
  const formattedPriceChange = Number.isFinite(btcPriceChange24h)
    ? `${isPriceChangePositive ? '+' : ''}${btcPriceChange24h.toFixed(2)}%`
    : '--';
  const marketAgeMinutes = marketUpdatedAt > 0
    ? Math.max(0, Math.floor((Date.now() - marketUpdatedAt) / 60000))
    : null;

  return (
    <div className="treasury-dashboard card" id="treasury">
      <div className="panel-header">
        <h2 className="panel-title">BTC Treasury Allocation</h2>
        <div className={`status-chip ${crColor}`}>
          {crStatus.toUpperCase()}
        </div>
      </div>

      {/* Allocation Bar */}
      <div className="alloc-bar">
        <div className="alloc-btc" style={{ width: `${btcPercent}%` }}>
          <span className="alloc-label">BTC {btcPercent}%</span>
        </div>
        <div className="alloc-cash" style={{ width: `${cashPercent}%` }}>
          <span className="alloc-label">Cash {cashPercent}%</span>
        </div>
      </div>

      {/* Treasury Details */}
      <div className="treasury-details">
        <div className="treasury-row">
          <div className="treasury-item">
            <div className="treasury-icon btc">
              <BtcCoreIcon />
            </div>
            <div className="treasury-info">
              <span className="treasury-label">BTC Reserve</span>
              <span className="treasury-value">{formatUSD(btcValue)}</span>
            </div>
          </div>
          <span className="treasury-sub">Uniswap V3 routed exposure</span>
        </div>

        <div className="treasury-row">
          <div className="treasury-item">
            <div className="treasury-icon cash">
              <CashReserveIcon />
            </div>
            <div className="treasury-info">
              <span className="treasury-label">USDC Reserve</span>
              <span className="treasury-value">{formatUSD(cashValue)}</span>
            </div>
          </div>
          <span className="treasury-sub">Aave V3 liquidity buffer</span>
        </div>

        <div className="treasury-divider" />

        <div className="treasury-row total">
          <div className="treasury-item">
            <div className="treasury-icon total">
              <LockVaultIcon />
            </div>
            <div className="treasury-info">
              <span className="treasury-label">Total Treasury Value</span>
              <span className="treasury-value">{formatUSD(totalValue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Collateral Ratio */}
      <div className="cr-section">
        <div className="cr-header">
          <span className="cr-title">Collateral Coverage</span>
          <span className={`cr-value ${crColor}`}>{cr.toFixed(2)}x</span>
        </div>
        <div className="cr-bar">
          <div
            className={`cr-fill ${crColor}`}
            style={{ width: `${Math.min(cr / 2 * 100, 100)}%` }}
          />
          <div className="cr-threshold" style={{ left: '50%' }}>
            <span className="threshold-label">1.0x</span>
          </div>
        </div>
        <div className="cr-legend">
          <span>0x</span>
          <span>1x</span>
          <span>2x+</span>
        </div>
      </div>

      {/* BTC Price */}
      <div className="btc-price-box">
        <PriceFeedIcon className="btc-price-icon" />
        <span className="btc-price-label">BTC Price</span>
        <span className="btc-price-value">
          ${resolvedBtcPrice.toLocaleString()}
        </span>
        <span className={`btc-price-change ${isPriceChangePositive ? 'up' : 'down'}`}>
          {formattedPriceChange}
        </span>
        <span className="btc-price-source">
          {marketAgeMinutes === null ? 'Live market feed' : `Live market feed · ${marketAgeMinutes}m ago`}
        </span>
      </div>
    </div>
  );
}

export default TreasuryDashboard;
