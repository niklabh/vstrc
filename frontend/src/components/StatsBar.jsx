import React from 'react';
import './StatsBar.css';

function StatsBar({ data, demoMode }) {
  const formatUSD = (value) => {
    const num = parseFloat(value);
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
    return `$${num.toFixed(2)}`;
  };

  const stats = [
    {
      label: 'Total Value Locked',
      value: formatUSD(data.totalAssets || '0'),
      icon: '🔒',
    },
    {
      label: 'vSTRC Price',
      value: `$${parseFloat(data.sharePrice || '100').toFixed(2)}`,
      icon: '💰',
      highlight: true,
    },
    {
      label: 'Current APY',
      value: `${((data.currentRate || 800) / 100).toFixed(1)}%`,
      icon: '📈',
      color: 'green',
    },
    {
      label: 'Collateral Ratio',
      value: `${parseFloat(data.collateralRatio || '0').toFixed(0)}x`,
      icon: '🛡️',
      color: parseFloat(data.collateralRatio) >= 1 ? 'green' : 'red',
    },
    {
      label: 'Epoch',
      value: `#${data.epochCount || 0}`,
      icon: '⏱️',
    },
  ];

  return (
    <div className="stats-bar" id="vault">
      {demoMode && (
        <div className="demo-banner">
          <span className="demo-dot" />
          Demo Mode — Connect wallet to see live data
        </div>
      )}
      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={i} className={`stat-item ${stat.highlight ? 'highlight' : ''}`}>
            <div className="stat-icon">{stat.icon}</div>
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
