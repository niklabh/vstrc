import React from 'react';
import './Footer.css';
import {
  CodeBracketsIcon,
  PaperDocIcon,
  ShieldCheckIcon,
} from './ProtocolIcons';

const WHITEPAPER_URL = 'https://github.com/niklabh/vstrc/blob/main/docs/WHITEPAPER.md';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">
            <img src="/logo.svg" alt="vSTRC protocol logo" width="32" height="32" />
            <span className="footer-name gradient-text">vSTRC</span>
          </div>
          <p className="footer-tagline">
            A Bitcoin treasury protocol for stablecoin holders:
            transparent rules, adaptive yield, and redeemable vault shares.
          </p>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <h4 className="footer-col-title">
              <ShieldCheckIcon className="footer-title-icon" />
              Protocol
            </h4>
            <a href="#vault">Vault</a>
            <a href="#yield">Yield Engine</a>
            <a href="#treasury">Treasury</a>
            <a href="#how-it-works">Documentation</a>
          </div>
          <div className="footer-col">
            <h4 className="footer-col-title">
              <PaperDocIcon className="footer-title-icon" />
              Resources
            </h4>
            <a href={WHITEPAPER_URL} target="_blank" rel="noopener">Whitepaper</a>
            <a href="https://github.com/niklabh/vstrc" target="_blank" rel="noopener">GitHub</a>
            <a href="https://sepolia.etherscan.io/address/0x201b86F2959478576FCc2318bfB005e059c2f569" target="_blank" rel="noopener">Etherscan</a>
          </div>
          <div className="footer-col">
            <h4 className="footer-col-title">
              <CodeBracketsIcon className="footer-title-icon" />
              Standards
            </h4>
            <a href="https://eips.ethereum.org/EIPS/eip-4626" target="_blank" rel="noopener">ERC-4626</a>
            <a href="https://chain.link" target="_blank" rel="noopener">Chainlink</a>
            <a href="https://uniswap.org" target="_blank" rel="noopener">Uniswap V3</a>
            <a href="https://aave.com" target="_blank" rel="noopener">Aave V3</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2026 vSTRC Protocol. Open, auditable, on-chain.</p>
      </div>
    </footer>
  );
}

export default Footer;
