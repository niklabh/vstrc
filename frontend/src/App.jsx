import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { vSTRC_ABI, ERC20_ABI } from './abi';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import StatsBar from './components/StatsBar';
import VaultPanel from './components/VaultPanel';
import YieldEngine from './components/YieldEngine';
import TreasuryDashboard from './components/TreasuryDashboard';
import HowItWorks from './components/HowItWorks';
import Footer from './components/Footer';
import './App.css';

// Default addresses (update after deployment)
const DEFAULT_VAULT_ADDRESS = '0x0000000000000000000000000000000000000000';

function App() {
  // Wallet state
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);

  // Contract state
  const [vaultAddress, setVaultAddress] = useState(DEFAULT_VAULT_ADDRESS);
  const [vaultContract, setVaultContract] = useState(null);
  const [usdcContract, setUsdcContract] = useState(null);

  // Protocol data
  const [protocolData, setProtocolData] = useState({
    totalAssets: '0',
    totalSupply: '0',
    currentRate: 800,
    targetPrice: '100',
    epochCount: 0,
    collateralRatio: '0',
    projectedDividend: '0',
    sharePrice: '100',
    mintingPaused: false,
    redeemingPaused: false,
  });

  // User data
  const [userData, setUserData] = useState({
    vSTRCBalance: '0',
    usdcBalance: '0',
    usdcAllowance: '0',
    shareValue: '0',
  });

  // Loading state
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState('');

  // Demo mode (when no wallet connected, show simulated data)
  const [demoMode, setDemoMode] = useState(true);

  const DEMO_DATA = {
    totalAssets: '12458932',
    totalSupply: '124589',
    currentRate: 1050,
    targetPrice: '100',
    epochCount: 47,
    collateralRatio: '1.23',
    projectedDividend: '10.50',
    sharePrice: '100.12',
    mintingPaused: false,
    redeemingPaused: false,
    btcTreasuryValue: '9967146',
    cashReserveValue: '2491786',
    btcPrice: '97234',
  };

  // ─── Connect Wallet ──────────────────────────────────
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();

      setProvider(provider);
      setSigner(signer);
      setAccount(accounts[0]);
      setChainId(Number(network.chainId));
      setDemoMode(false);

      // Setup contract instances
      if (vaultAddress !== DEFAULT_VAULT_ADDRESS) {
        const vault = new ethers.Contract(vaultAddress, vSTRC_ABI, signer);
        setVaultContract(vault);

        const assetAddr = await vault.asset();
        const usdc = new ethers.Contract(assetAddr, ERC20_ABI, signer);
        setUsdcContract(usdc);
      }
    } catch (err) {
      console.error('Connection failed:', err);
    }
  }, [vaultAddress]);

  // ─── Load Protocol Data ───────────────────────────────
  const loadProtocolData = useCallback(async () => {
    if (!vaultContract) return;
    try {
      const [
        totalAssets,
        totalSupply,
        currentRate,
        targetPrice,
        epochCount,
        collateralRatio,
      ] = await Promise.all([
        vaultContract.totalAssets(),
        vaultContract.totalSupply(),
        vaultContract.currentRateBps(),
        vaultContract.targetPrice(),
        vaultContract.epochCount(),
        vaultContract.collateralRatio().catch(() => 0n),
      ]);

      const sharePrice = totalSupply > 0n
        ? Number(totalAssets) / Number(totalSupply) * 100
        : 100;

      setProtocolData({
        totalAssets: ethers.formatUnits(totalAssets, 6),
        totalSupply: ethers.formatUnits(totalSupply, 6),
        currentRate: Number(currentRate),
        targetPrice: ethers.formatUnits(targetPrice, 6),
        epochCount: Number(epochCount),
        collateralRatio: collateralRatio > 0n
          ? (Number(collateralRatio) / 1e18).toFixed(2)
          : '0',
        sharePrice: sharePrice.toFixed(2),
        mintingPaused: false,
        redeemingPaused: false,
      });
    } catch (err) {
      console.error('Failed to load protocol data:', err);
    }
  }, [vaultContract]);

  // ─── Load User Data ────────────────────────────────────
  const loadUserData = useCallback(async () => {
    if (!vaultContract || !usdcContract || !account) return;
    try {
      const [vSTRCBalance, usdcBalance, usdcAllowance] = await Promise.all([
        vaultContract.balanceOf(account),
        usdcContract.balanceOf(account),
        usdcContract.allowance(account, vaultAddress),
      ]);

      const shareValue = vSTRCBalance > 0n
        ? await vaultContract.convertToAssets(vSTRCBalance)
        : 0n;

      setUserData({
        vSTRCBalance: ethers.formatUnits(vSTRCBalance, 6),
        usdcBalance: ethers.formatUnits(usdcBalance, 6),
        usdcAllowance: ethers.formatUnits(usdcAllowance, 6),
        shareValue: ethers.formatUnits(shareValue, 6),
      });
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  }, [vaultContract, usdcContract, account, vaultAddress]);

  // ─── Deposit ─────────────────────────────────────────
  const handleDeposit = async (amount) => {
    if (!vaultContract || !usdcContract) return;
    setLoading(true);
    setTxStatus('Approving USDC...');

    try {
      const parsedAmount = ethers.parseUnits(amount, 6);

      // Check allowance
      const currentAllowance = await usdcContract.allowance(account, vaultAddress);
      if (currentAllowance < parsedAmount) {
        const approveTx = await usdcContract.approve(vaultAddress, parsedAmount);
        await approveTx.wait();
        setTxStatus('USDC approved. Depositing...');
      }

      const depositTx = await vaultContract.deposit(parsedAmount, account);
      setTxStatus('Waiting for confirmation...');
      await depositTx.wait();
      setTxStatus('Deposit successful!');

      await loadUserData();
      await loadProtocolData();
    } catch (err) {
      console.error('Deposit failed:', err);
      setTxStatus(`Error: ${err.reason || err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setTxStatus(''), 5000);
    }
  };

  // ─── Redeem ──────────────────────────────────────────
  const handleRedeem = async (shares) => {
    if (!vaultContract) return;
    setLoading(true);
    setTxStatus('Redeeming vSTRC...');

    try {
      const parsedShares = ethers.parseUnits(shares, 6);
      const redeemTx = await vaultContract.redeem(parsedShares, account, account);
      setTxStatus('Waiting for confirmation...');
      await redeemTx.wait();
      setTxStatus('Redemption successful!');

      await loadUserData();
      await loadProtocolData();
    } catch (err) {
      console.error('Redeem failed:', err);
      setTxStatus(`Error: ${err.reason || err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setTxStatus(''), 5000);
    }
  };

  // ─── Effects ──────────────────────────────────────────
  useEffect(() => {
    if (vaultContract) {
      loadProtocolData();
      const interval = setInterval(loadProtocolData, 30000);
      return () => clearInterval(interval);
    }
  }, [vaultContract, loadProtocolData]);

  useEffect(() => {
    if (account && vaultContract) {
      loadUserData();
    }
  }, [account, vaultContract, loadUserData]);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          setAccount(null);
          setDemoMode(true);
        } else {
          setAccount(accounts[0]);
        }
      });
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
  }, []);

  const displayData = demoMode ? DEMO_DATA : protocolData;

  return (
    <div className="app">
      <div className="bg-glow" />
      <Header
        account={account}
        chainId={chainId}
        onConnect={connectWallet}
      />
      <main>
        <HeroSection />
        <StatsBar data={displayData} demoMode={demoMode} />
        <div className="main-grid">
          <VaultPanel
            account={account}
            userData={userData}
            protocolData={displayData}
            onDeposit={handleDeposit}
            onRedeem={handleRedeem}
            loading={loading}
            txStatus={txStatus}
            demoMode={demoMode}
            onConnect={connectWallet}
          />
          <div className="side-panels">
            <YieldEngine data={displayData} demoMode={demoMode} />
            <TreasuryDashboard data={displayData} demoMode={demoMode} />
          </div>
        </div>
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
}

export default App;
