import React from 'react';
import './HowItWorks.css';
import {
  WalletDepositIcon,
  SplitRouteIcon,
  SignalRateIcon,
  RedeemCycleIcon,
} from './ProtocolIcons';

function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Deposit USDC',
      description: 'Connect your wallet and deposit USDC. The vault mints vSTRC shares that represent your claim on protocol reserves.',
      icon: WalletDepositIcon,
      iconTone: 'orange',
    },
    {
      num: '02',
      title: 'Split and Deploy',
      description: 'Roughly 80% is routed to WBTC through Uniswap V3. Roughly 20% remains in Aave V3 USDC as a liquid reserve for redemptions.',
      icon: SplitRouteIcon,
      iconTone: 'blue',
    },
    {
      num: '03',
      title: 'Yield Tracks the Peg',
      description: 'At each epoch, oracle price data feeds the VDR formula. Below $100, yield rises. Above $100, yield cools.',
      icon: SignalRateIcon,
      iconTone: 'green',
    },
    {
      num: '04',
      title: 'Redeem on Demand',
      description: 'Burn vSTRC shares to receive USDC at the current vault rate. The reserve handles normal exits, and BTC can be rebalanced for larger outflows.',
      icon: RedeemCycleIcon,
      iconTone: 'orange',
    },
  ];

  return (
    <section className="how-it-works" id="how-it-works">
      <div className="section-header">
        <span className="section-badge">Protocol Overview</span>
        <h2 className="section-title">How the Protocol Defends Value</h2>
        <p className="section-subtitle">
          vSTRC is a rules-based BTC treasury vault. It balances upside exposure with liquid reserves,
          then tunes yield to keep shares anchored near $100.
        </p>
      </div>

      <div className="steps-grid">
        {steps.map((step) => (
          <div key={step.num} className="step-card">
            <div className="step-header">
              <span className={`step-icon ${step.iconTone || ''}`}>
                <step.icon />
              </span>
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
            <li><code>vSTRC.sol</code> - ERC-4626 vault share accounting</li>
            <li><code>BTCStrategy.sol</code> - BTC allocation and reserve routing</li>
            <li><code>SelfTuningMath.sol</code> - epoch rate updates from peg deviation</li>
          </ul>
        </div>
        <div className="tech-card">
          <h3 className="tech-title">Integrations</h3>
          <ul className="tech-list">
            <li>Chainlink - BTC/USD and USDC/USD price feeds</li>
            <li>Uniswap V3 - USDC/WBTC routing for treasury allocation</li>
            <li>Aave V3 - reserve-side liquidity and base yield</li>
          </ul>
        </div>
        <div className="tech-card">
          <h3 className="tech-title">Risk Controls</h3>
          <ul className="tech-list">
            <li>Circuit breaker on sharp BTC downside moves</li>
            <li>OpenZeppelin role-based access controls</li>
            <li>Reentrancy guards and swap slippage checks</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
