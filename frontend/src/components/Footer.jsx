import React from 'react';
import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">
            <img src="/logo.svg" alt="vSTRC" width="32" height="32" />
            <span className="footer-name gradient-text">vSTRC</span>
          </div>
          <p className="footer-tagline">
            Bitcoin-backed yield protocol with self-tuning peg stability.
            Inspired by MicroStrategy STRC.
          </p>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <h4 className="footer-col-title">Protocol</h4>
            <a href="#vault">Vault</a>
            <a href="#yield">Yield Engine</a>
            <a href="#treasury">Treasury</a>
            <a href="#how-it-works">Documentation</a>
          </div>
          <div className="footer-col">
            <h4 className="footer-col-title">Resources</h4>
            <a href="/docs/WHITEPAPER.md" target="_blank">Whitepaper</a>
            <a href="https://github.com" target="_blank" rel="noopener">GitHub</a>
            <a href="https://sepolia.etherscan.io" target="_blank" rel="noopener">Etherscan</a>
          </div>
          <div className="footer-col">
            <h4 className="footer-col-title">Standards</h4>
            <a href="https://eips.ethereum.org/EIPS/eip-4626" target="_blank" rel="noopener">ERC-4626</a>
            <a href="https://chain.link" target="_blank" rel="noopener">Chainlink</a>
            <a href="https://uniswap.org" target="_blank" rel="noopener">Uniswap V3</a>
            <a href="https://aave.com" target="_blank" rel="noopener">Aave V3</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2026 vSTRC Protocol. For educational purposes only. Not audited.</p>
        <p className="footer-disclaimer">
          This is experimental software. Do not use with real funds without a comprehensive security audit.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
