import React from 'react';
import './YieldEngine.css';
import { ArrowRightIcon, LoopIcon } from './ProtocolIcons';

function YieldEngine({ data, demoMode }) {
  const currentRate = (data.currentRate || 800) / 100;
  const baseRate = 8;
  const minRate = 1;
  const maxRate = 25;

  // Calculate position on the rate gauge (0-100%)
  const gaugePercent = ((currentRate - minRate) / (maxRate - minRate)) * 100;

  // Determine status color
  const getStatusColor = () => {
    if (currentRate > baseRate + 3) return 'red'; // Aggressively boosting (price well below peg)
    if (currentRate > baseRate) return 'yellow';   // Slightly boosting
    if (currentRate < baseRate - 2) return 'blue'; // Reducing (price above peg)
    return 'green'; // Normal
  };

  const getStatusText = () => {
    if (currentRate > baseRate + 3) return 'Strong Boost (Below Peg)';
    if (currentRate > baseRate) return 'Mild Boost (Below Peg)';
    if (currentRate < baseRate - 2) return 'Cooldown (Above Peg)';
    return 'Peg Aligned';
  };

  return (
    <div className="yield-engine card" id="yield">
      <div className="panel-header">
        <h2 className="panel-title">Adaptive Yield Controller</h2>
        <div className={`status-chip ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>

      {/* Rate Gauge */}
      <div className="gauge-container">
        <div className="gauge-labels">
          <span>{minRate}%</span>
          <span className="gauge-current">{currentRate.toFixed(1)}% APY</span>
          <span>{maxRate}%</span>
        </div>
        <div className="gauge-track">
          <div className="gauge-fill" style={{ width: `${gaugePercent}%` }} />
          <div className="gauge-marker base" style={{ left: `${((baseRate - minRate) / (maxRate - minRate)) * 100}%` }}>
            <span className="marker-label">Base</span>
          </div>
        </div>
      </div>

      {/* Formula */}
      <div className="formula-box">
        <div className="formula-title">Rate Control Formula</div>
        <code className="formula-code">
          VDR = 8% + 20% × ($100 - P<sub>market</sub>) / $100
        </code>
      </div>

      {/* Parameters */}
      <div className="param-grid">
        <div className="param-item">
          <span className="param-label">Base Rate</span>
          <span className="param-value">8.0%</span>
        </div>
        <div className="param-item">
          <span className="param-label">Sensitivity (K)</span>
          <span className="param-value">20%</span>
        </div>
        <div className="param-item">
          <span className="param-label">Min Rate</span>
          <span className="param-value">1.0%</span>
        </div>
        <div className="param-item">
          <span className="param-label">Max Rate</span>
          <span className="param-value">25.0%</span>
        </div>
        <div className="param-item">
          <span className="param-label">Epoch Duration</span>
          <span className="param-value">7 days</span>
        </div>
        <div className="param-item">
          <span className="param-label">Epoch Count</span>
          <span className="param-value">#{data.epochCount || 0}</span>
        </div>
      </div>

      {/* Feedback explanation */}
      <div className="feedback-box">
        <div className="feedback-title">Peg Control Loop</div>
        <div className="feedback-steps">
          <div className="feedback-step">
            <div className="step-num">1</div>
            <div className="step-text">Oracle posts vSTRC price</div>
          </div>
          <div className="feedback-arrow" aria-hidden="true">
            <ArrowRightIcon />
          </div>
          <div className="feedback-step">
            <div className="step-num">2</div>
            <div className="step-text">Epoch rate updates on-chain</div>
          </div>
          <div className="feedback-arrow" aria-hidden="true">
            <ArrowRightIcon />
          </div>
          <div className="feedback-step">
            <div className="step-num">3</div>
            <div className="step-text">Deposits and redeems rebalance price</div>
          </div>
          <div className="feedback-arrow loop" aria-hidden="true">
            <LoopIcon />
          </div>
        </div>
      </div>
    </div>
  );
}

export default YieldEngine;
