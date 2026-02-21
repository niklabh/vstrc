import React, { useState } from 'react';
import './VaultPanel.css';
import {
  DepositActionIcon,
  RedeemActionIcon,
  SparkIcon,
  WalletConnectIcon,
} from './ProtocolIcons';

function VaultPanel({ account, userData, protocolData, onDeposit, onRedeem, loading, txStatus, demoMode, onConnect }) {
  const [activeTab, setActiveTab] = useState('deposit');
  const [amount, setAmount] = useState('');

  const formatNum = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    if (activeTab === 'deposit') {
      onDeposit(amount);
    } else {
      onRedeem(amount);
    }
    setAmount('');
  };

  const setMaxAmount = () => {
    if (demoMode) return;
    if (activeTab === 'deposit') {
      setAmount(userData.usdcBalance);
    } else {
      setAmount(userData.vSTRCBalance);
    }
  };

  const previewOutput = () => {
    const num = parseFloat(amount) || 0;
    if (activeTab === 'deposit') {
      const price = parseFloat(protocolData.sharePrice) || 100;
      return (num / price * 100).toFixed(4);
    } else {
      const price = parseFloat(protocolData.sharePrice) || 100;
      return (num * price / 100).toFixed(2);
    }
  };

  return (
    <div className="vault-panel card">
      <div className="panel-header">
        <h2 className="panel-title">vSTRC Vault</h2>
        <div className="panel-badge">ERC-4626</div>
      </div>

      {/* Tabs */}
      <div className="vault-tabs">
        <button
          className={`vault-tab ${activeTab === 'deposit' ? 'active' : ''}`}
          onClick={() => { setActiveTab('deposit'); setAmount(''); }}
        >
          <DepositActionIcon className="tab-icon" />
          Deposit
        </button>
        <button
          className={`vault-tab ${activeTab === 'redeem' ? 'active' : ''}`}
          onClick={() => { setActiveTab('redeem'); setAmount(''); }}
        >
          <RedeemActionIcon className="tab-icon" />
          Redeem
        </button>
      </div>

      {/* Balances */}
      {!demoMode && account && (
        <div className="vault-balances">
          <div className="balance-row">
            <span className="balance-label">USDC Balance</span>
            <span className="balance-value">{formatNum(userData.usdcBalance)} USDC</span>
          </div>
          <div className="balance-row">
            <span className="balance-label">vSTRC Balance</span>
            <span className="balance-value">{formatNum(userData.vSTRCBalance)} vSTRC</span>
          </div>
          <div className="balance-row highlight">
            <span className="balance-label">Portfolio Value</span>
            <span className="balance-value">${formatNum(userData.shareValue)}</span>
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="vault-form">
        <div className="input-group">
          <label className="input-label">
            {activeTab === 'deposit' ? 'Deposit Amount' : 'Redeem Shares'}
          </label>
          <div className="input-wrapper">
            <input
              type="number"
              className="vault-input"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
            <div className="input-suffix">
              <button type="button" className="max-btn" onClick={setMaxAmount}>
                <SparkIcon className="max-icon" />
                MAX
              </button>
              <span className="input-token">
                {activeTab === 'deposit' ? 'USDC' : 'vSTRC'}
              </span>
            </div>
          </div>
        </div>

        {/* Preview */}
        {amount && parseFloat(amount) > 0 && (
          <div className="preview-box">
            <div className="preview-row">
              <span>You will receive</span>
              <span className="preview-value">
                ~{previewOutput()} {activeTab === 'deposit' ? 'vSTRC' : 'USDC'}
              </span>
            </div>
            <div className="preview-row">
              <span>Exchange Rate</span>
              <span className="preview-value mono">
                1 vSTRC = ${parseFloat(protocolData.sharePrice || 100).toFixed(2)}
              </span>
            </div>
            <div className="preview-row">
              <span>Current APY</span>
              <span className="preview-value green">
                {((protocolData.currentRate || 800) / 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* Status message */}
        {txStatus && (
          <div className={`tx-status ${txStatus.includes('Error') ? 'error' : 'success'}`}>
            {txStatus}
          </div>
        )}

        {/* Submit Button */}
        {!account ? (
          <button type="button" className="submit-btn" onClick={onConnect}>
            <WalletConnectIcon className="vault-btn-icon" />
            Connect Wallet
          </button>
        ) : (
          <button
            type="submit"
            className={`submit-btn ${loading ? 'loading' : ''}`}
            disabled={loading || !amount || parseFloat(amount) <= 0}
          >
            {loading ? (
              <span className="spinner" />
            ) : (
              <>
                {activeTab === 'deposit' ? (
                  <DepositActionIcon className="vault-btn-icon" />
                ) : (
                  <RedeemActionIcon className="vault-btn-icon" />
                )}
                {activeTab === 'deposit' ? 'Deposit USDC' : 'Redeem vSTRC'}
              </>
            )}
          </button>
        )}
      </form>

      {/* Info */}
      <div className="vault-info">
        <div className="info-row">
          <span>Share Price</span>
          <span className="mono">${parseFloat(protocolData.sharePrice || 100).toFixed(2)}</span>
        </div>
        <div className="info-row">
          <span>Target Peg</span>
          <span className="mono">${parseFloat(protocolData.targetPrice || 100).toFixed(2)}</span>
        </div>
        <div className="info-row">
          <span>Minting</span>
          <span className={protocolData.mintingPaused ? 'red' : 'green'}>
            {protocolData.mintingPaused ? 'Paused' : 'Active'}
          </span>
        </div>
        <div className="info-row">
          <span>Redeeming</span>
          <span className={protocolData.redeemingPaused ? 'red' : 'green'}>
            {protocolData.redeemingPaused ? 'Paused' : 'Active'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default VaultPanel;
