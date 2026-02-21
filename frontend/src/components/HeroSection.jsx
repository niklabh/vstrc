import React from 'react';
import './HeroSection.css';
import { ArrowRightIcon, PaperDocIcon } from './ProtocolIcons';

const WHITEPAPER_URL = 'https://github.com/niklabh/vstrc/blob/main/docs/WHITEPAPER.md';

function HeroSection() {
  return (
    <section className="hero">
      <div className="hero-content">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          On-chain treasury protocol
        </div>

        <h1 className="hero-title">
          <span className="gradient-text">Bitcoin Treasury Yield</span>
          <br />
          for Stablecoin Capital
        </h1>

        <p className="hero-subtitle">
          Deposit USDC into a rules-based ERC-4626 vault backed by BTC exposure and liquid reserves.
          <br />
          vSTRC targets a $100 share value and adjusts yield each epoch to defend the peg.
        </p>

        <div className="hero-metrics">
          <div className="hero-metric">
            <span className="hero-metric-value">$100</span>
            <span className="hero-metric-label">Share Target</span>
          </div>
          <div className="hero-metric-divider" />
          <div className="hero-metric">
            <span className="hero-metric-value">8-25%</span>
            <span className="hero-metric-label">Adaptive Yield Band</span>
          </div>
          <div className="hero-metric-divider" />
          <div className="hero-metric">
            <span className="hero-metric-value">80/20</span>
            <span className="hero-metric-label">BTC / Reserve Mix</span>
          </div>
          <div className="hero-metric-divider" />
          <div className="hero-metric">
            <span className="hero-metric-value">ERC-4626</span>
            <span className="hero-metric-label">Vault Standard</span>
          </div>
        </div>

        <div className="hero-cta">
          <a href="#vault" className="btn-primary">
            Enter Vault
            <ArrowRightIcon />
          </a>
          <a href={WHITEPAPER_URL} className="btn-secondary" target="_blank" rel="noopener">
            <PaperDocIcon />
            Read Protocol Paper
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
