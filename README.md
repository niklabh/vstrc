# vSTRC — Vaulted STRC Protocol

> A Bitcoin-backed, yield-bearing DeFi token inspired by MicroStrategy's STRC preferred stock, targeting a stable $100 peg through a self-tuning variable dividend rate.

<p align="center">
  <img src="frontend/public/logo.svg" alt="vSTRC Logo" width="120" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [The Self-Tuning Mechanism](#the-self-tuning-mechanism)
- [Smart Contracts](#smart-contracts)
- [Security Features](#security-features)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Testing](#testing)
- [Frontend](#frontend)

---

## Overview

**vSTRC** is an ERC-4626 yield-bearing vault token that:

1. Accepts **USDC** deposits and mints **vSTRC** shares
2. Deploys **80%** of capital into **WBTC** (Bitcoin treasury) via Uniswap V3
3. Keeps **20%** as a **cash reserve** in Aave V3 for liquidity and dividends
4. Automatically adjusts its **yield rate** to maintain a **$100 peg** on secondary markets

This mirrors the real-world mechanics of MicroStrategy's STRC preferred stock, which offers a variable cumulative dividend backed by a Bitcoin treasury.

---

## Architecture

```
┌──────────────┐       deposit USDC       ┌─────────────────┐
│              │ ──────────────────────→   │                 │
│   Users      │                          │   vSTRC Vault   │
│              │ ←──────────────────────  │   (ERC-4626)    │
└──────────────┘     redeem for USDC      └────────┬────────┘
                                                   │
                                          deploy / withdraw
                                                   │
                                          ┌────────▼────────┐
                                          │  BTC Strategy    │
                                          │                  │
                                          │  ┌────────────┐  │
                                          │  │ 80% → WBTC │  │  ← Uniswap V3
                                          │  │ (Treasury) │  │  ← Chainlink BTC/USD
                                          │  └────────────┘  │
                                          │  ┌────────────┐  │
                                          │  │ 20% → Aave │  │  ← Aave V3 Lending
                                          │  │ (Cash Rsv) │  │
                                          │  └────────────┘  │
                                          └─────────────────┘
                                                   │
                                          ┌────────▼────────┐
                                          │  Self-Tuning    │
                                          │  Dividend Engine │
                                          │                  │
                                          │  Epoch: Weekly   │
                                          │  Oracle: vSTRC   │
                                          │  Rate: Variable  │
                                          └─────────────────┘
```

### Component Flow

| Step | Action | Contract |
|------|--------|----------|
| 1 | User deposits USDC | `vSTRC.deposit()` |
| 2 | Vault mints vSTRC shares | ERC-4626 standard |
| 3 | Capital deployed to strategy | `BTCStrategy.deploy()` |
| 4 | 80% swapped to WBTC | Uniswap V3 Router |
| 5 | 20% deposited to Aave | Aave V3 `supply()` |
| 6 | Weekly keeper calls rebalance | `vSTRC.rebalanceYield()` |
| 7 | Rate adjusts based on peg | `SelfTuningMath` library |

---

## The Self-Tuning Mechanism

### Mathematical Model: Variable Dividend Rate (VDR)

The core innovation of vSTRC is its **self-tuning variable dividend rate** that automatically adjusts to maintain the $100 peg.

#### Formula

```
VDR = BaseRate + K × (TargetPrice − MarketPrice) / TargetPrice
```

Where:
- **VDR** = Variable Dividend Rate (annualized)
- **BaseRate** = Minimum base yield (default: 8%)
- **K** = Sensitivity coefficient (default: 20%)
- **TargetPrice** = $100.00 (the peg)
- **MarketPrice** = Current vSTRC market price (from oracle/TWAP)

#### Bounded Range

The rate is clamped to prevent extreme behavior:

```
MinRate ≤ VDR ≤ MaxRate
1%     ≤ VDR ≤ 25%
```

#### Worked Examples

| Market Price | Deviation | Adjustment | Final Rate |
|-------------|-----------|------------|------------|
| $100.00 | 0% | +0.0% | 8.0% |
| $95.00 | -5% | +1.0% | 9.0% |
| $90.00 | -10% | +2.0% | 10.0% |
| $80.00 | -20% | +4.0% | 12.0% |
| $60.00 | -40% | +8.0% | 16.0% |
| $105.00 | +5% | -1.0% | 7.0% |
| $110.00 | +10% | -2.0% | 6.0% |
| $120.00 | +20% | -4.0% | 4.0% |

#### Feedback Loop

```
Price Below Peg → Higher Yield → More Deposits → Buy Pressure → Price Rises ↻
Price Above Peg → Lower Yield → Fewer Deposits → Less Demand → Price Falls ↻
```

### Epoch Dividend Calculation

Dividends are distributed per epoch (default: weekly):

```
EpochDividend = TotalAssets × VDR × EpochDuration / (BPS × 365 days)
```

For a $10M vault at 10% VDR with weekly epochs:
```
= $10,000,000 × 0.10 × 7/365
= $19,178.08 per week
= $1,000,000 per year
```

### Collateral Health

```
CollateralRatio = (BTCTreasuryValue + CashReserve) / TotalLiabilities
```

- **> 1.0**: Overcollateralized (healthy)
- **= 1.0**: Fully collateralized
- **< 1.0**: Undercollateralized (circuit breaker territory)

---

## Smart Contracts

### `vSTRC.sol` — The Vault (ERC-4626)

The main user-facing contract. Inherits from OpenZeppelin's ERC4626, ERC20Permit, AccessControl, and Pausable.

**Key functions:**
- `deposit(assets, receiver)` — Deposit USDC, receive vSTRC
- `redeem(shares, receiver, owner)` — Burn vSTRC, receive USDC
- `rebalanceYield()` — Keeper function to adjust dividend rate
- `collateralRatio()` — View the protocol health metric

### `BTCStrategy.sol` — The BTC Engine

Manages the actual capital deployment:

- Swaps USDC → WBTC via Uniswap V3 (80% of deposits)
- Deposits USDC to Aave V3 for yield (20% of deposits)
- Tracks BTC treasury value via Chainlink price feeds
- Handles rebalancing between BTC and cash positions

### `SelfTuningMath.sol` — The Dividend Library

Pure math library for:
- Variable rate calculation with sensitivity coefficient
- Epoch dividend computation
- Collateral ratio calculation

---

## Security Features

### Circuit Breaker

If BTC price drops more than **20% within 1 hour**, the strategy contract automatically:
- Pauses all new deployments
- Prevents new minting
- Requires manager to manually assess and reset

### Access Control (Roles)

| Role | Permissions |
|------|-------------|
| `MANAGER_ROLE` | Set strategy, update parameters, pause/unpause, emergency withdraw |
| `KEEPER_ROLE` | Call `rebalanceYield()` each epoch |
| `VAULT_ROLE` | (Internal) Strategy-vault communication |
| `DEFAULT_ADMIN_ROLE` | Grant/revoke roles |

### Additional Safeguards

- **ReentrancyGuard** on all state-changing functions
- **Slippage protection** on Uniswap swaps (configurable, default 1%)
- **Stale price detection** on Chainlink feeds (BTC: 1h, USDC: 24h)
- **Deposit caps** to prevent excessive concentration
- **ERC20Permit** for gasless approvals

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm or yarn

### Installation

```bash
git clone https://github.com/your-org/vSTRC.git
cd vSTRC
npm install
```

### Configuration

```bash
cp .env.example .env
# Edit .env with your keys
```

### Compile

```bash
npx hardhat compile
```

### Test

```bash
npx hardhat test
```

### Gas Report

```bash
REPORT_GAS=true npx hardhat test
```

---

## Deployment

### Sepolia Testnet

```bash
npx hardhat run scripts/deploy-sepolia.js --network sepolia
```

This deploys:
1. Mock tokens (USDC, WBTC, aUSDC)
2. Mock Chainlink price feeds
3. vSTRC Vault
4. BTC Strategy
5. Configures all connections and roles

Addresses are saved to `deployment-sepolia.json`.

### Mainnet Deployment

For mainnet, update `scripts/deploy-sepolia.js` with real addresses:
- USDC: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- WBTC: `0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599`
- Chainlink BTC/USD: `0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c`
- Uniswap V3 Router: `0xE592427A0AEce92De3Edee1F18E0157C05861564`
- Aave V3 Pool: `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2`

---

## Frontend

The frontend is a React app with Vite, ethers.js, and a modern dark UI.

```bash
cd frontend
npm install
npm run dev
```

See the [frontend README](frontend/README.md) for details.

---

## License

MIT

---

## Disclaimer

This is experimental software for educational purposes. It has not been audited. Do not use in production with real funds without a comprehensive security audit. DeFi protocols carry significant financial risk including but not limited to smart contract bugs, oracle manipulation, and market volatility.
