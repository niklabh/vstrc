/**
 * vSTRC Protocol — Frontend Configuration
 *
 * After deploying contracts, paste the addresses from deployment-sepolia.json
 * into the appropriate network section below.
 *
 * For production, create a .env file in the frontend/ directory:
 *   VITE_NETWORK=sepolia
 *   VITE_VAULT_ADDRESS=0x...
 *   VITE_USDC_ADDRESS=0x...
 */

const NETWORKS = {
  // ─── Sepolia Testnet ────────────────────────────────────────
  sepolia: {
    chainId: 11155111,
    chainName: "Sepolia",
    rpcUrl: "https://rpc.sepolia.org",
    blockExplorer: "https://sepolia.etherscan.io",
    contracts: {
      // Defaults from current sepolia deployment for read-only/live dashboard mode
      vault: import.meta.env.VITE_VAULT_ADDRESS || "0x201b86F2959478576FCc2318bfB005e059c2f569",
      usdc: import.meta.env.VITE_USDC_ADDRESS || "0x64c3384fD4EC66f290C06ac3516B61EEE78A7486",
      strategy: import.meta.env.VITE_STRATEGY_ADDRESS || "0xaE825a1201c678668dc09eBBb9D413fE9763caa9",
    },
  },

  // ─── Ethereum Mainnet ───────────────────────────────────────
  mainnet: {
    chainId: 1,
    chainName: "Ethereum",
    rpcUrl: "https://eth.llamarpc.com",
    blockExplorer: "https://etherscan.io",
    contracts: {
      vault: import.meta.env.VITE_VAULT_ADDRESS || "0x0000000000000000000000000000000000000000",
      usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      strategy: import.meta.env.VITE_STRATEGY_ADDRESS || "0x0000000000000000000000000000000000000000",
    },
  },
};

// Active network (set via VITE_NETWORK env variable, default: sepolia)
const ACTIVE_NETWORK = import.meta.env.VITE_NETWORK || "sepolia";

const config = {
  network: NETWORKS[ACTIVE_NETWORK] || NETWORKS.sepolia,
  activeNetwork: ACTIVE_NETWORK,

  // Convenience getters
  get vaultAddress() {
    return this.network.contracts.vault;
  },
  get usdcAddress() {
    return this.network.contracts.usdc;
  },
  get strategyAddress() {
    return this.network.contracts.strategy;
  },
  get chainId() {
    return this.network.chainId;
  },
  get blockExplorer() {
    return this.network.blockExplorer;
  },

  // Check if addresses are configured (not zero address)
  get isConfigured() {
    return this.vaultAddress !== "0x0000000000000000000000000000000000000000";
  },
};

export default config;
