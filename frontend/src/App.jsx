import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { vSTRC_ABI, ERC20_ABI, STRATEGY_ABI } from './abi';
import config from './config';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import StatsBar from './components/StatsBar';
import VaultPanel from './components/VaultPanel';
import YieldEngine from './components/YieldEngine';
import TreasuryDashboard from './components/TreasuryDashboard';
import HowItWorks from './components/HowItWorks';
import Footer from './components/Footer';
import './App.css';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const MARKET_FEED_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true';

function App() {
  // Wallet state
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);

  // Contract state (wallet + read-only)
  const vaultAddress = config.vaultAddress;
  const [walletVaultContract, setWalletVaultContract] = useState(null);
  const [walletUsdcContract, setWalletUsdcContract] = useState(null);
  const [publicVaultContract, setPublicVaultContract] = useState(null);
  const [strategyContract, setStrategyContract] = useState(null);

  // Protocol + market data
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
    btcTreasuryValue: '0',
    cashReserveValue: '0',
    lastOnchainUpdate: 0,
  });
  const [marketData, setMarketData] = useState({
    btcPrice: '0',
    btcPriceChange24h: '0',
    ethPrice: '0',
    marketUpdatedAt: 0,
  });
  const [hasLiveProtocolData, setHasLiveProtocolData] = useState(false);

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

      // Setup contract instances
      if (config.isConfigured) {
        const vault = new ethers.Contract(vaultAddress, vSTRC_ABI, signer);
        setWalletVaultContract(vault);

        const assetAddr = await vault.asset();
        const usdc = new ethers.Contract(assetAddr, ERC20_ABI, signer);
        setWalletUsdcContract(usdc);
      }
    } catch (err) {
      console.error('Connection failed:', err);
    }
  }, [vaultAddress]);

  // ─── Setup Read-Only Contracts ───────────────────────
  useEffect(() => {
    if (!config.isConfigured) return;

    try {
      const readProvider = new ethers.JsonRpcProvider(config.network.rpcUrl);
      const readVault = new ethers.Contract(vaultAddress, vSTRC_ABI, readProvider);
      setPublicVaultContract(readVault);

      if (config.strategyAddress && config.strategyAddress !== ZERO_ADDRESS) {
        const readStrategy = new ethers.Contract(config.strategyAddress, STRATEGY_ABI, readProvider);
        setStrategyContract(readStrategy);
      } else {
        setStrategyContract(null);
      }
    } catch (err) {
      console.error('Failed to setup read-only contracts:', err);
      setPublicVaultContract(null);
      setStrategyContract(null);
    }
  }, [vaultAddress]);

  // ─── Load Protocol Data ───────────────────────────────
  const loadProtocolData = useCallback(async () => {
    const activeVault = walletVaultContract || publicVaultContract;
    if (!activeVault) return;

    try {
      const [
        totalAssets,
        totalSupply,
        currentRate,
        targetPrice,
        epochCount,
        collateralRatio,
        projectedAnnualDividend,
        mintingPaused,
        redeemingPaused,
      ] = await Promise.all([
        activeVault.totalAssets(),
        activeVault.totalSupply(),
        activeVault.currentRateBps().catch(() => 800n),
        activeVault.targetPrice().catch(() => ethers.parseUnits('100', 6)),
        activeVault.epochCount().catch(() => 0n),
        activeVault.collateralRatio().catch(() => 0n),
        activeVault.projectedAnnualDividend().catch(() => 0n),
        activeVault.mintingPaused().catch(() => false),
        activeVault.redeemingPaused().catch(() => false),
      ]);

      let btcTreasuryValue = '0';
      let cashReserveValue = '0';
      if (strategyContract) {
        const [btcTreasury, cashReserve] = await Promise.all([
          strategyContract.btcTreasuryValue().catch(() => 0n),
          strategyContract.cashReserveValue().catch(() => 0n),
        ]);
        btcTreasuryValue = ethers.formatUnits(btcTreasury, 6);
        cashReserveValue = ethers.formatUnits(cashReserve, 6);
      }

      const totalAssetsFormatted = ethers.formatUnits(totalAssets, 6);
      const totalSupplyFormatted = ethers.formatUnits(totalSupply, 6);
      const totalAssetsNum = parseFloat(totalAssetsFormatted);
      const totalSupplyNum = parseFloat(totalSupplyFormatted);
      const sharePrice = totalSupplyNum > 0 ? (totalAssetsNum / totalSupplyNum) * 100 : 100;

      setProtocolData({
        totalAssets: totalAssetsFormatted,
        totalSupply: totalSupplyFormatted,
        currentRate: Number(currentRate),
        targetPrice: ethers.formatUnits(targetPrice, 6),
        epochCount: Number(epochCount),
        collateralRatio: collateralRatio > 0n
          ? (Number(collateralRatio) / 1e18).toFixed(2)
          : '0',
        projectedDividend: ethers.formatUnits(projectedAnnualDividend, 6),
        sharePrice: sharePrice.toFixed(2),
        mintingPaused,
        redeemingPaused,
        btcTreasuryValue,
        cashReserveValue,
        lastOnchainUpdate: Date.now(),
      });
      setHasLiveProtocolData(true);
    } catch (err) {
      console.error('Failed to load protocol data:', err);
    }
  }, [walletVaultContract, publicVaultContract, strategyContract]);

  // ─── Load Market Data (Free API, low-frequency poll) ───────────
  const loadMarketData = useCallback(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(MARKET_FEED_URL, { signal: controller.signal });
      if (!response.ok) throw new Error(`Market feed error: ${response.status}`);

      const payload = await response.json();
      const btcUsd = Number(payload?.bitcoin?.usd || 0);
      const btcChange24h = Number(payload?.bitcoin?.usd_24h_change || 0);
      const ethUsd = Number(payload?.ethereum?.usd || 0);
      const btcUpdatedAt = Number(payload?.bitcoin?.last_updated_at || 0);

      setMarketData((prev) => ({
        btcPrice: btcUsd > 0 ? btcUsd.toFixed(2) : prev.btcPrice,
        btcPriceChange24h: Number.isFinite(btcChange24h)
          ? btcChange24h.toFixed(2)
          : prev.btcPriceChange24h,
        ethPrice: ethUsd > 0 ? ethUsd.toFixed(2) : prev.ethPrice,
        marketUpdatedAt: btcUpdatedAt > 0 ? btcUpdatedAt * 1000 : prev.marketUpdatedAt,
      }));
    } catch (err) {
      console.warn('Failed to load market data:', err.message);
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  // ─── Load User Data ────────────────────────────────────
  const loadUserData = useCallback(async () => {
    if (!walletVaultContract || !walletUsdcContract || !account) return;

    try {
      const [vSTRCBalance, usdcBalance, usdcAllowance] = await Promise.all([
        walletVaultContract.balanceOf(account),
        walletUsdcContract.balanceOf(account),
        walletUsdcContract.allowance(account, vaultAddress),
      ]);

      const shareValue = vSTRCBalance > 0n
        ? await walletVaultContract.convertToAssets(vSTRCBalance)
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
  }, [walletVaultContract, walletUsdcContract, account, vaultAddress]);

  // ─── Deposit ─────────────────────────────────────────
  const handleDeposit = async (amount) => {
    if (!walletVaultContract || !walletUsdcContract || !account) return;

    setLoading(true);
    setTxStatus('Approving USDC...');

    try {
      const parsedAmount = ethers.parseUnits(amount, 6);

      // Check allowance
      const currentAllowance = await walletUsdcContract.allowance(account, vaultAddress);
      if (currentAllowance < parsedAmount) {
        const approveTx = await walletUsdcContract.approve(vaultAddress, parsedAmount);
        await approveTx.wait();
        setTxStatus('USDC approved. Depositing...');
      }

      const depositTx = await walletVaultContract.deposit(parsedAmount, account);
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
    if (!walletVaultContract || !account) return;

    setLoading(true);
    setTxStatus('Redeeming vSTRC...');

    try {
      const parsedShares = ethers.parseUnits(shares, 6);
      const redeemTx = await walletVaultContract.redeem(parsedShares, account, account);
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
    if (!walletVaultContract && !publicVaultContract) return;
    loadProtocolData();
    const interval = setInterval(loadProtocolData, 30000);
    return () => clearInterval(interval);
  }, [walletVaultContract, publicVaultContract, loadProtocolData]);

  useEffect(() => {
    if (account && walletVaultContract && walletUsdcContract) {
      loadUserData();
    }
  }, [account, walletVaultContract, walletUsdcContract, loadUserData]);

  useEffect(() => {
    loadMarketData();
    const interval = setInterval(loadMarketData, 60000);
    return () => clearInterval(interval);
  }, [loadMarketData]);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setAccount(null);
        setProvider(null);
        setSigner(null);
        setWalletVaultContract(null);
        setWalletUsdcContract(null);
      } else {
        setAccount(accounts[0]);
      }
    };
    const handleChainChanged = () => window.location.reload();

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  const demoMode = !account;
  const displayData = { ...protocolData, ...marketData };

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
        <StatsBar
          data={displayData}
          demoMode={demoMode}
          hasLiveData={hasLiveProtocolData || Number(marketData.btcPrice) > 0}
        />
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
