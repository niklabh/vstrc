import React from 'react';
import './TreasuryDashboard.css';

function TreasuryDashboard({ data, demoMode }) {
  const formatUSD = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '$0';
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
    return `$${num.toFixed(2)}`;
  };

  const btcValue = parseFloat(data.btcTreasuryValue || (parseFloat(data.totalAssets) * 0.8));
  const cashValue = parseFloat(data.cashReserveValue || (parseFloat(data.totalAssets) * 0.2));
  const totalValue = btcValue + cashValue;

  const btcPercent = totalValue > 0 ? (btcValue / totalValue * 100).toFixed(1) : 80;
  const cashPercent = totalValue > 0 ? (cashValue / totalValue * 100).toFixed(1) : 20;

  const cr = parseFloat(data.collateralRatio || 1.23);
  const crStatus = cr >= 1.5 ? 'healthy' : cr >= 1.0 ? 'adequate' : 'critical';
  const crColor = cr >= 1.5 ? 'green' : cr >= 1.0 ? 'yellow' : 'red';

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
            <div className="treasury-dot btc" />
            <div className="treasury-info">
              <span className="treasury-label">BTC Reserve</span>
              <span className="treasury-value">{formatUSD(btcValue)}</span>
            </div>
          </div>
          <span className="treasury-sub">Uniswap V3 routed exposure</span>
        </div>

        <div className="treasury-row">
          <div className="treasury-item">
            <div className="treasury-dot cash" />
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
        <span className="btc-price-label">BTC Price</span>
        <span className="btc-price-value">
          ${parseFloat(data.btcPrice || 97000).toLocaleString()}
        </span>
        <span className="btc-price-source">Chainlink BTC/USD feed</span>
      </div>
    </div>
  );
}

export default TreasuryDashboard;
