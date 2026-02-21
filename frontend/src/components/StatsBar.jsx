import React from 'react';
import './StatsBar.css';
import {
  LockVaultIcon,
  CoinStackIcon,
  TrendUpIcon,
  ShieldCheckIcon,
  EpochClockIcon,
} from './ProtocolIcons';

function StatsBar({ data, demoMode }) {
  const formatUSD = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '$0.00';
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
    return `$${num.toFixed(2)}`;
  };

  const stats = [
    {
      label: 'Treasury Value Locked',
      value: formatUSD(data.totalAssets || '0'),
      icon: LockVaultIcon,
      iconTone: 'orange',
    },
    {
      label: 'vSTRC Share Price',
      value: `$${parseFloat(data.sharePrice || '100').toFixed(2)}`,
      icon: CoinStackIcon,
      iconTone: 'orange',
      highlight: true,
    },
    {
      label: 'Live APY',
      value: `${((data.currentRate || 800) / 100).toFixed(1)}%`,
      icon: TrendUpIcon,
      iconTone: 'green',
      color: 'green',
    },
    {
      label: 'Collateral Buffer',
      value: `${parseFloat(data.collateralRatio || '0').toFixed(0)}x`,
      icon: ShieldCheckIcon,
      iconTone: parseFloat(data.collateralRatio) >= 1 ? 'green' : 'red',
      color: parseFloat(data.collateralRatio) >= 1 ? 'green' : 'red',
    },
    {
      label: 'Epoch',
      value: `#${data.epochCount || 0}`,
      icon: EpochClockIcon,
      iconTone: 'blue',
    },
  ];

  return (
    <div className="stats-bar" id="vault">
      {demoMode && (
        <div className="demo-banner">
          <span className="demo-dot" />
          Preview Mode - connect wallet for live on-chain data
        </div>
      )}
      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={i} className={`stat-item ${stat.highlight ? 'highlight' : ''}`}>
            <div className={`stat-icon ${stat.iconTone || ''}`}>
              <stat.icon className="icon-svg" />
            </div>
            <div className="stat-content">
              <div className={`stat-value ${stat.color || ''}`}>
                {stat.value}
              </div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StatsBar;
