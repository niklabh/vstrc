import React from 'react';
import './Header.css';
import { NetworkChainIcon, WalletConnectIcon } from './ProtocolIcons';

const WHITEPAPER_URL = 'https://github.com/niklabh/vstrc/blob/main/docs/WHITEPAPER.md';

const CHAIN_NAMES = {
  1: 'Ethereum',
  11155111: 'Sepolia',
  5: 'Goerli',
  137: 'Polygon',
};

function Header({ account, chainId, onConnect }) {
  const shortenAddress = (addr) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-logo">
          <img src="/logo.svg" alt="vSTRC protocol logo" className="logo-icon" />
          <div className="logo-text">
            <span className="logo-name">vSTRC</span>
            <span className="logo-tagline">Rules-Based BTC Yield</span>
          </div>
        </div>

        <nav className="header-nav">
          <a href="#vault" className="nav-link">Vault</a>
          <a href="#yield" className="nav-link">Yield</a>
          <a href="#treasury" className="nav-link">Treasury</a>
          <a href="#how-it-works" className="nav-link">How It Works</a>
          <a href={WHITEPAPER_URL} className="nav-link" target="_blank" rel="noopener">Whitepaper</a>
        </nav>

        <div className="header-actions">
          {account ? (
            <div className="wallet-info">
              {chainId && (
                <span className="chain-badge">
                  <NetworkChainIcon className="chain-icon" />
                  {CHAIN_NAMES[chainId] || `Chain ${chainId}`}
                </span>
              )}
              <button className="wallet-btn connected">
                <NetworkChainIcon className="header-btn-icon" />
                <span className="wallet-dot" />
                {shortenAddress(account)}
              </button>
            </div>
          ) : (
            <button className="wallet-btn connect" onClick={onConnect}>
              <WalletConnectIcon className="header-btn-icon" />
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
