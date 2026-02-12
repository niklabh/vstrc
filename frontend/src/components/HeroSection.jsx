import React from 'react';
import './HeroSection.css';

function HeroSection() {
  return (
    <section className="hero">
      <div className="hero-content">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          Powered by Bitcoin Treasury
        </div>

        <h1 className="hero-title">
          <span className="gradient-text">Bitcoin-Backed</span>
          <br />
          Yield-Bearing Vault
        </h1>

        <p className="hero-subtitle">
          Deposit USDC. Earn variable yield backed by a Bitcoin treasury.
          <br />
          Inspired by MicroStrategy's STRC — rebuilt for DeFi.
        </p>

        <div className="hero-metrics">
          <div className="hero-metric">
            <span className="hero-metric-value">$100</span>
            <span className="hero-metric-label">Target Peg</span>
          </div>
          <div className="hero-metric-divider" />
          <div className="hero-metric">
            <span className="hero-metric-value">8-25%</span>
            <span className="hero-metric-label">Variable APY</span>
          </div>
          <div className="hero-metric-divider" />
          <div className="hero-metric">
            <span className="hero-metric-value">80/20</span>
            <span className="hero-metric-label">BTC/Cash Split</span>
          </div>
          <div className="hero-metric-divider" />
          <div className="hero-metric">
            <span className="hero-metric-value">ERC-4626</span>
            <span className="hero-metric-label">Vault Standard</span>
          </div>
        </div>

        <div className="hero-cta">
          <a href="#vault" className="btn-primary">
            Start Earning
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
          <a href="https://github.com/niklabh/vstrc" className="btn-secondary" target="_blank" rel="noopener">
            Read Whitepaper
          </a>
        </div>
      </div>

      <div className="hero-visual">
        <div className="orbit-ring ring-1">
          <div className="orbit-dot btc-dot">BTC</div>
        </div>
        <div className="orbit-ring ring-2">
          <div className="orbit-dot usdc-dot">USDC</div>
        </div>
        <div className="orbit-center">
          <span className="orbit-label">vSTRC</span>
          <span className="orbit-price">$100</span>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
