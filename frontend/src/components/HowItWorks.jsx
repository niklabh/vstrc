import React from 'react';
import './HowItWorks.css';

function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Deposit USDC',
      description: 'Connect your wallet and deposit USDC into the vSTRC vault. You receive vSTRC shares representing your stake in the Bitcoin treasury.',
      icon: '💵',
    },
    {
      num: '02',
      title: 'Capital Deployed',
      description: '80% of deposits are converted to WBTC via Uniswap V3 for the Bitcoin treasury. 20% goes to Aave V3 as a cash reserve for liquidity.',
      icon: '⚡',
    },
    {
      num: '03',
      title: 'Earn Variable Yield',
      description: 'The self-tuning engine adjusts your yield rate each epoch (weekly) based on vSTRC\'s market price relative to the $100 target peg.',
      icon: '📈',
    },
    {
      num: '04',
      title: 'Redeem Anytime',
      description: 'Burn your vSTRC shares to receive USDC back at the current exchange rate. The vault draws from the cash reserve or liquidates BTC as needed.',
      icon: '🔄',
    },
  ];

  return (
    <section className="how-it-works" id="how-it-works">
      <div className="section-header">
        <span className="section-badge">Protocol Overview</span>
        <h2 className="section-title">How vSTRC Works</h2>
        <p className="section-subtitle">
          A self-tuning yield protocol backed by Bitcoin, designed to maintain a stable $100 peg
        </p>
      </div>

      <div className="steps-grid">
        {steps.map((step) => (
          <div key={step.num} className="step-card">
            <div className="step-header">
              <span className="step-icon">{step.icon}</span>
              <span className="step-number">{step.num}</span>
            </div>
            <h3 className="step-title">{step.title}</h3>
            <p className="step-desc">{step.description}</p>
          </div>
        ))}
      </div>

      {/* Technical Details */}
      <div className="tech-grid">
        <div className="tech-card">
          <h3 className="tech-title">Smart Contracts</h3>
          <ul className="tech-list">
            <li><code>vSTRC.sol</code> — ERC-4626 yield vault</li>
            <li><code>BTCStrategy.sol</code> — BTC treasury engine</li>
            <li><code>SelfTuningMath.sol</code> — VDR calculations</li>
          </ul>
        </div>
        <div className="tech-card">
          <h3 className="tech-title">Integrations</h3>
          <ul className="tech-list">
            <li>Chainlink — BTC/USD + USDC/USD price feeds</li>
            <li>Uniswap V3 — USDC/WBTC swap execution</li>
            <li>Aave V3 — Cash reserve yield generation</li>
          </ul>
        </div>
        <div className="tech-card">
          <h3 className="tech-title">Security</h3>
          <ul className="tech-list">
            <li>Circuit breaker (20% BTC drop in 1h)</li>
            <li>OpenZeppelin AccessControl roles</li>
            <li>Reentrancy guards + slippage protection</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
