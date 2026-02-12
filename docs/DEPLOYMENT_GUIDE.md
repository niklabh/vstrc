# vSTRC Protocol — Deployment & Production Guide

Step-by-step instructions to deploy the smart contracts, connect them to the frontend, and ship to production.

**Author: Nikhil Ranjan ([@niklabh](https://github.com/niklabh))**

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Setup](#2-environment-setup)
3. [Compile Contracts](#3-compile-contracts)
4. [Run Tests](#4-run-tests)
5. [Deploy to Sepolia Testnet](#5-deploy-to-sepolia-testnet)
6. [Verify Contracts on Etherscan](#6-verify-contracts-on-etherscan)
7. [Connect Frontend to Deployed Contracts](#7-connect-frontend-to-deployed-contracts)
8. [Test the Full Stack Locally](#8-test-the-full-stack-locally)
9. [Build Frontend for Production](#9-build-frontend-for-production)
10. [Deploy Frontend to Hosting](#10-deploy-frontend-to-hosting)
11. [Post-Deployment Checklist](#11-post-deployment-checklist)
12. [Mainnet Deployment](#12-mainnet-deployment)
13. [Keeper Setup (Automated Yield Rebalancing)](#13-keeper-setup-automated-yield-rebalancing)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Prerequisites

Before you begin, ensure you have the following installed and ready:

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | >= 18.x | Runtime |
| npm | >= 9.x | Package manager |
| Git | any | Version control |
| MetaMask | latest | Browser wallet for testing |
| Sepolia ETH | ~0.5 ETH | Gas for deployment (~8 contract deploys + config txns) |

### Get Sepolia ETH

You'll need testnet ETH to pay for gas. Use one of these faucets:

- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)
- [Google Cloud Sepolia Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)

### Get API Keys

| Service | URL | Purpose |
|---------|-----|---------|
| Infura or Alchemy | infura.io / alchemy.com | Sepolia RPC endpoint |
| Etherscan | etherscan.io/apis | Contract verification |

---

## 2. Environment Setup

### 2.1 Clone and install

```bash
git clone https://github.com/niklabh/vstrc.git
cd vstrc
npm install
```

### 2.2 Create the root `.env` file

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Your Sepolia RPC URL (from Infura or Alchemy)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID

# Your deployer wallet private key (DO NOT commit this!)
# Export from MetaMask: Account Details → Export Private Key
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Etherscan API key (for contract verification)
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
```

> **SECURITY WARNING**: Never commit your `.env` file. It is already in `.gitignore`.

---

## 3. Compile Contracts

```bash
npx hardhat compile
```

Expected output:

```
Compiled 40 Solidity files successfully (evm target: paris).
```

This generates ABI files in `artifacts/` and type information in `typechain-types/`.

---

## 4. Run Tests

```bash
npx hardhat test
```

Expected output:

```
  vSTRC Protocol
    ERC-4626 Vault Basic Operations
      ✔ should accept deposits and mint vSTRC shares
      ✔ should allow withdrawals
      ✔ should enforce minimum deposit
      ✔ should report correct decimals (6 for USDC)
    Self-Tuning Dividend Logic
      ✔ should revert rebalanceYield if epoch not elapsed
      ✔ should execute rebalanceYield after epoch duration
      ✔ should increase yield rate when price is below target
      ✔ should decrease yield rate when price is above target
      ✔ should clamp rate to min/max bounds
    Circuit Breaker
      ✔ should allow manager to pause minting
      ✔ should allow manager to pause redeeming
    Access Control
      ✔ should prevent non-managers from setting strategy
      ✔ should prevent non-keepers from calling rebalanceYield
      ✔ should allow manager to update dividend params
    Collateral Ratio
      ✔ should return correct collateral ratio
    SelfTuningMath Library
      ✔ should calculate variable rate correctly for below-peg
      ✔ should calculate variable rate correctly for above-peg

  17 passing (1s)
```

All 17 tests must pass before deploying. Do not deploy if any test fails.

---

## 5. Deploy to Sepolia Testnet

### 5.1 Run the deployment script

```bash
npx hardhat run scripts/deploy-sepolia.js --network sepolia
```

The script will:
1. Deploy 3 mock tokens (USDC, WBTC, aUSDC)
2. Deploy 3 mock Chainlink price feeds (BTC/USD, USDC/USD, vSTRC/USD)
3. Deploy the **vSTRC Vault** contract
4. Deploy the **BTCStrategy** contract
5. Configure all roles and connections
6. Mint 1,000,000 test USDC to the deployer

### 5.2 Save the output

The script automatically writes all addresses to **`deployment-sepolia.json`** in the project root.

Example output:

```json
{
  "network": "sepolia",
  "deployer": "0xYourDeployerAddress",
  "contracts": {
    "usdc": "0x1111111111111111111111111111111111111111",
    "wbtc": "0x2222222222222222222222222222222222222222",
    "aUsdc": "0x3333333333333333333333333333333333333333",
    "btcUsdFeed": "0x4444444444444444444444444444444444444444",
    "usdcUsdFeed": "0x5555555555555555555555555555555555555555",
    "vstrcUsdFeed": "0x6666666666666666666666666666666666666666",
    "vSTRC": "0x7777777777777777777777777777777777777777",
    "btcStrategy": "0x8888888888888888888888888888888888888888"
  },
  "timestamp": "2026-02-12T20:00:00.000Z"
}
```

**Keep this file safe** — you'll need these addresses for the frontend and verification.

---

## 6. Verify Contracts on Etherscan

Verification makes your contract source code publicly readable on Etherscan.

### 6.1 Verify vSTRC Vault

```bash
npx hardhat verify --network sepolia \
  VAULT_ADDRESS \
  USDC_ADDRESS \
  DEPLOYER_ADDRESS
```

Replace with actual addresses from `deployment-sepolia.json`:

```bash
npx hardhat verify --network sepolia \
  0x7777777777777777777777777777777777777777 \
  0x1111111111111111111111111111111111111111 \
  0xYourDeployerAddress
```

### 6.2 Verify BTCStrategy

```bash
npx hardhat verify --network sepolia \
  STRATEGY_ADDRESS \
  USDC_ADDRESS \
  WBTC_ADDRESS \
  AUSDC_ADDRESS \
  BTC_FEED_ADDRESS \
  USDC_FEED_ADDRESS \
  UNISWAP_ROUTER \
  AAVE_POOL \
  VAULT_ADDRESS \
  DEPLOYER_ADDRESS
```

### 6.3 Verify mock contracts (optional)

```bash
# MockERC20 (USDC)
npx hardhat verify --network sepolia USDC_ADDRESS "USD Coin" "USDC" 6

# MockPriceFeed (BTC/USD)
npx hardhat verify --network sepolia BTC_FEED_ADDRESS 9700000000000 8 "BTC / USD"
```

---

## 7. Connect Frontend to Deployed Contracts

This is the critical step that makes the frontend talk to your deployed contracts.

### 7.1 Create the frontend `.env` file

```bash
cd frontend
cp .env.example .env
```

### 7.2 Paste your contract addresses

Open `frontend/.env` and fill in the addresses from `deployment-sepolia.json`:

```env
# Network: "sepolia" or "mainnet"
VITE_NETWORK=sepolia

# Contract addresses (from deployment-sepolia.json)
VITE_VAULT_ADDRESS=0x7777777777777777777777777777777777777777
VITE_USDC_ADDRESS=0x1111111111111111111111111111111111111111
VITE_STRATEGY_ADDRESS=0x8888888888888888888888888888888888888888
```

> **How it works**: The frontend reads these via `frontend/src/config.js`, which uses Vite's `import.meta.env` to inject them at build time.

### 7.3 Quick-reference: where addresses are used

| File | What it does |
|------|-------------|
| `frontend/src/config.js` | Central config — reads env vars, exposes `config.vaultAddress`, etc. |
| `frontend/src/App.jsx` | Uses `config.vaultAddress` to create ethers.js `Contract` instances |
| `frontend/src/abi.js` | ABI definitions for `vSTRC`, `ERC20`, and `Strategy` contracts |

---

## 8. Test the Full Stack Locally

### 8.1 Start the frontend dev server

```bash
cd frontend
npm install
npm run dev
```

This opens `http://localhost:3000`.

### 8.2 Connect MetaMask

1. Open the website in your browser
2. Make sure MetaMask is set to **Sepolia testnet**
3. Click **"Connect Wallet"** in the header
4. Approve the connection in MetaMask

### 8.3 Test a deposit

1. You should see your USDC balance (1,000,000 from deployment)
2. Enter an amount (e.g., `1000`)
3. Click **"Deposit USDC"**
4. Approve the USDC spending in MetaMask (first time only)
5. Confirm the deposit transaction in MetaMask
6. Wait for confirmation — your vSTRC balance should appear

### 8.4 Test a redemption

1. Switch to the **"Redeem"** tab
2. Enter your vSTRC share amount
3. Click **"Redeem vSTRC"**
4. Confirm in MetaMask
5. Your USDC balance should increase

### 8.5 Verify protocol data

Check that these display correctly:
- Total Value Locked (TVL)
- vSTRC share price (~$100)
- Current APY (8.0% initially)
- Collateral Ratio
- Epoch count

---

## 9. Build Frontend for Production

### 9.1 Build the static files

```bash
cd frontend
npm run build
```

This creates an optimized production build in `frontend/dist/`:

```
dist/
├── index.html
├── whitepaper.pdf
├── logo.svg
└── assets/
    ├── index-XXXX.css    (~22 KB gzip)
    └── index-XXXX.js     (~163 KB gzip)
```

### 9.2 Preview locally

```bash
npm run preview
```

Opens `http://localhost:4173` with the production build.

---

## 10. Deploy Frontend to Hosting

### Option A: Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from the frontend directory
cd frontend
vercel

# Follow the prompts:
#   - Link to existing project? No
#   - Project name: vstrc
#   - Framework: Vite
#   - Build command: npm run build
#   - Output directory: dist
```

Set environment variables in Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add `VITE_NETWORK`, `VITE_VAULT_ADDRESS`, `VITE_USDC_ADDRESS`, `VITE_STRATEGY_ADDRESS`

### Option B: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
cd frontend
netlify deploy --prod --dir=dist
```

### Option C: GitHub Pages

Add to `frontend/vite.config.js`:

```js
export default defineConfig({
  base: '/vstrc/',  // your repo name
  plugins: [react()],
});
```

Build and deploy:

```bash
cd frontend
npm run build
# Push dist/ contents to gh-pages branch
```

### Option D: Static hosting (any server)

Just copy the `frontend/dist/` folder to any static file server (Nginx, Apache, S3, etc).

Nginx example config:

```nginx
server {
    listen 80;
    server_name vstrc.yourdomain.com;
    root /var/www/vstrc/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 11. Post-Deployment Checklist

Run through this checklist after deploying:

### Smart Contracts

- [ ] All 17 tests pass
- [ ] Contracts deployed to Sepolia
- [ ] `deployment-sepolia.json` saved
- [ ] Contracts verified on Etherscan
- [ ] Strategy linked to vault (`vault.setStrategy()`)
- [ ] vSTRC price oracle set (`vault.setVSTRCOracle()`)
- [ ] Test USDC minted to deployer
- [ ] Test deposit works on-chain
- [ ] Test redemption works on-chain
- [ ] Circuit breaker is not tripped

### Frontend

- [ ] `frontend/.env` has correct contract addresses
- [ ] Dev server connects to contracts successfully
- [ ] Wallet connection works
- [ ] Deposit flow works end-to-end
- [ ] Redeem flow works end-to-end
- [ ] Protocol stats display correctly (TVL, APY, price, CR, epoch)
- [ ] Demo mode shows when wallet not connected
- [ ] Whitepaper PDF link works
- [ ] Production build succeeds (`npm run build`)
- [ ] Production build deployed to hosting

### Security

- [ ] Private key NOT committed to git
- [ ] `.env` files are in `.gitignore`
- [ ] MANAGER_ROLE is set to a secure address (ideally a multisig)
- [ ] KEEPER_ROLE is assigned for automated rebalancing
- [ ] Circuit breaker parameters are reasonable (20% / 1 hour)
- [ ] Deposit caps are set appropriately

---

## 12. Mainnet Deployment

> **WARNING**: Mainnet deployment involves real funds. Ensure a professional audit before deploying.

### 12.1 Key differences from Sepolia

On mainnet, you do **NOT** deploy mock tokens or price feeds. Instead, use real protocol addresses:

| Contract | Mainnet Address |
|----------|----------------|
| USDC | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| WBTC | `0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599` |
| Chainlink BTC/USD | `0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c` |
| Chainlink USDC/USD | `0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6` |
| Uniswap V3 Router | `0xE592427A0AEce92De3Edee1F18E0157C05861564` |
| Aave V3 Pool | `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2` |

### 12.2 Mainnet deployment steps

1. Create a separate `scripts/deploy-mainnet.js` (or modify the existing script)
2. Replace mock deploys with the real addresses above
3. Only deploy the **vSTRC Vault** and **BTCStrategy** contracts
4. Update `frontend/.env` with `VITE_NETWORK=mainnet`

### 12.3 Pre-mainnet checklist

- [ ] Full security audit completed
- [ ] Bug bounty program active
- [ ] MANAGER_ROLE assigned to a Gnosis Safe multisig
- [ ] KEEPER_ROLE assigned to Chainlink Automation or Gelato
- [ ] Deposit caps set conservatively for launch
- [ ] Emergency withdrawal tested on testnet
- [ ] Circuit breaker tested on testnet

---

## 13. Keeper Setup (Automated Yield Rebalancing)

The `rebalanceYield()` function must be called once per epoch (every 7 days). This can be automated.

### Option A: Chainlink Automation

1. Go to [automation.chain.link](https://automation.chain.link)
2. Register a new upkeep
3. Set the target contract to the **vSTRC Vault** address
4. Function: `rebalanceYield()`
5. Interval: 604800 seconds (7 days)
6. Fund the upkeep with LINK tokens

### Option B: Gelato Network

1. Go to [app.gelato.network](https://app.gelato.network)
2. Create a new automated task
3. Target: vSTRC Vault address
4. Function: `rebalanceYield()`
5. Schedule: Every 7 days

### Option C: Manual/Cron

If you prefer manual control, set up a cron job:

```bash
# crontab entry: run every Monday at 00:00 UTC
0 0 * * 1 cd /path/to/vstrc && npx hardhat run scripts/rebalance.js --network sepolia
```

Create `scripts/rebalance.js`:

```javascript
const { ethers } = require("hardhat");
const deployment = require("../deployment-sepolia.json");

async function main() {
  const [keeper] = await ethers.getSigners();
  const vault = await ethers.getContractAt("vSTRC", deployment.contracts.vSTRC, keeper);

  console.log("Calling rebalanceYield()...");
  const tx = await vault.rebalanceYield();
  await tx.wait();
  console.log("Yield rebalanced successfully:", tx.hash);
}

main().catch(console.error);
```

---

## 14. Troubleshooting

### "Contracts not loading in frontend"

- Check that `frontend/.env` has the correct addresses
- Restart the dev server after changing `.env` (Vite caches env vars)
- Ensure MetaMask is on the correct network (Sepolia chain ID: 11155111)

### "Transaction reverted"

- Check you have enough Sepolia ETH for gas
- Check you have enough USDC balance for the deposit amount
- Check that minting/redeeming is not paused (circuit breaker)
- Check the console for the specific revert reason

### "rebalanceYield() reverts with EpochNotElapsed"

- The epoch duration is 7 days. You must wait for the full epoch before calling again
- On testnet, you can use Hardhat's `time.increase()` in a script to fast-forward

### "Circuit breaker tripped"

- The BTC price feed dropped more than 20% within the monitoring window
- The MANAGER must call `resetCircuitBreaker()` on the BTCStrategy contract
- Verify the oracle is returning valid data before resetting

### "Frontend shows demo data even after connecting wallet"

- The vault address in `config.js` is still the zero address
- Update `frontend/.env` and restart the dev server

### "Build fails"

```bash
# Clear caches and rebuild
cd frontend
rm -rf node_modules dist
npm install
npm run build
```

---

## Quick Reference: All Commands

```bash
# ─── Smart Contracts ────────────────────
npm run compile                  # Compile Solidity
npm run test                     # Run test suite
npm run deploy:sepolia           # Deploy to Sepolia
npm run deploy:local             # Deploy to local Hardhat node

# ─── Frontend ───────────────────────────
npm run frontend:dev             # Start dev server (localhost:3000)
npm run frontend:build           # Production build → frontend/dist/

# ─── From frontend/ directory ───────────
cd frontend
npm run dev                      # Start dev server
npm run build                    # Production build
npm run preview                  # Preview production build

# ─── Hardhat Direct ─────────────────────
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy-sepolia.js --network sepolia
npx hardhat verify --network sepolia CONTRACT_ADDRESS ...args
```

---

*Last updated: February 2026*
