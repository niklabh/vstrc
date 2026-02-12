const { ethers } = require("hardhat");

/**
 * vSTRC Protocol — Sepolia Testnet Deployment Script
 *
 * Deployment Order:
 *   1. Deploy Mock tokens (USDC, WBTC, aUSDC) — on testnet only
 *   2. Deploy Mock Price Feeds — on testnet only
 *   3. Deploy BTCStrategy
 *   4. Deploy vSTRC Vault
 *   5. Configure roles and connections
 *
 * For mainnet, replace mocks with real addresses:
 *   - USDC:  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
 *   - WBTC:  0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599
 *   - Chainlink BTC/USD: 0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c
 *   - Chainlink USDC/USD: 0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6
 *   - Uniswap V3 Router: 0xE592427A0AEce92De3Edee1F18E0157C05861564
 *   - Aave V3 Pool: 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
 */
async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("╔═══════════════════════════════════════════════════╗");
    console.log("║       vSTRC Protocol — Sepolia Deployment         ║");
    console.log("╚═══════════════════════════════════════════════════╝");
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

    // ────────────────────────────────────────────────────────────────
    // Step 1: Deploy Mock Tokens
    // ────────────────────────────────────────────────────────────────
    console.log("📦 Deploying mock tokens...");

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();
    console.log(`  USDC:  ${await usdc.getAddress()}`);

    const wbtc = await MockERC20.deploy("Wrapped BTC", "WBTC", 8);
    await wbtc.waitForDeployment();
    console.log(`  WBTC:  ${await wbtc.getAddress()}`);

    const aUsdc = await MockERC20.deploy("Aave USDC", "aUSDC", 6);
    await aUsdc.waitForDeployment();
    console.log(`  aUSDC: ${await aUsdc.getAddress()}`);

    // ────────────────────────────────────────────────────────────────
    // Step 2: Deploy Mock Price Feeds
    // ────────────────────────────────────────────────────────────────
    console.log("\n📡 Deploying mock price feeds...");

    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");

    // BTC/USD = $97,000 (8 decimals)
    const btcFeed = await MockPriceFeed.deploy(
        ethers.parseUnits("97000", 8),
        8,
        "BTC / USD"
    );
    await btcFeed.waitForDeployment();
    console.log(`  BTC/USD Feed:  ${await btcFeed.getAddress()} ($97,000)`);

    // USDC/USD = $1.00 (8 decimals)
    const usdcFeed = await MockPriceFeed.deploy(
        ethers.parseUnits("1", 8),
        8,
        "USDC / USD"
    );
    await usdcFeed.waitForDeployment();
    console.log(`  USDC/USD Feed: ${await usdcFeed.getAddress()} ($1.00)`);

    // vSTRC/USD = $100 (6 decimals for USDC compatibility)
    const vstrcFeed = await MockPriceFeed.deploy(
        ethers.parseUnits("100", 6),
        6,
        "vSTRC / USD"
    );
    await vstrcFeed.waitForDeployment();
    console.log(`  vSTRC/USD Feed: ${await vstrcFeed.getAddress()} ($100.00)`);

    // ────────────────────────────────────────────────────────────────
    // Step 3: Deploy vSTRC Vault
    // ────────────────────────────────────────────────────────────────
    console.log("\n🏦 Deploying vSTRC Vault...");

    const VSTRC = await ethers.getContractFactory("vSTRC");
    const vault = await VSTRC.deploy(
        await usdc.getAddress(),
        deployer.address
    );
    await vault.waitForDeployment();
    console.log(`  vSTRC Vault: ${await vault.getAddress()}`);

    // ────────────────────────────────────────────────────────────────
    // Step 4: Deploy Strategy
    // ────────────────────────────────────────────────────────────────
    // On testnet, use MockStrategy (BTCStrategy needs real Uniswap/Aave).
    // On mainnet, deploy BTCStrategy with real protocol addresses.
    console.log("\n⚡ Deploying MockStrategy (testnet)...");

    const MockStrategy = await ethers.getContractFactory("MockStrategy");
    const strategy = await MockStrategy.deploy(
        await usdc.getAddress(),
        await vault.getAddress()
    );
    await strategy.waitForDeployment();
    console.log(`  MockStrategy: ${await strategy.getAddress()}`);

    // ────────────────────────────────────────────────────────────────
    // Step 5: Configure Protocol
    // ────────────────────────────────────────────────────────────────
    console.log("\n🔧 Configuring protocol...");

    // Set strategy on vault
    await vault.setStrategy(await strategy.getAddress());
    console.log("  ✓ Strategy linked to vault");

    // Set vSTRC price oracle
    await vault.setVSTRCOracle(await vstrcFeed.getAddress());
    console.log("  ✓ vSTRC price oracle set");

    // Mint test USDC to deployer
    const mintAmount = ethers.parseUnits("1000000", 6); // 1M USDC
    await usdc.mint(deployer.address, mintAmount);
    console.log(`  ✓ Minted 1,000,000 USDC to deployer`);

    // ────────────────────────────────────────────────────────────────
    // Summary
    // ────────────────────────────────────────────────────────────────
    console.log("\n╔═══════════════════════════════════════════════════╗");
    console.log("║            Deployment Summary                     ║");
    console.log("╠═══════════════════════════════════════════════════╣");
    console.log(`║ USDC:           ${await usdc.getAddress()}`);
    console.log(`║ WBTC:           ${await wbtc.getAddress()}`);
    console.log(`║ aUSDC:          ${await aUsdc.getAddress()}`);
    console.log(`║ BTC/USD Feed:   ${await btcFeed.getAddress()}`);
    console.log(`║ USDC/USD Feed:  ${await usdcFeed.getAddress()}`);
    console.log(`║ vSTRC/USD Feed: ${await vstrcFeed.getAddress()}`);
    console.log(`║ vSTRC Vault:    ${await vault.getAddress()}`);
    console.log(`║ BTCStrategy:    ${await strategy.getAddress()}`);
    console.log("╚═══════════════════════════════════════════════════╝");

    // Save deployment addresses to JSON
    const fs = require("fs");
    const addresses = {
        network: "sepolia",
        deployer: deployer.address,
        contracts: {
            usdc: await usdc.getAddress(),
            wbtc: await wbtc.getAddress(),
            aUsdc: await aUsdc.getAddress(),
            btcUsdFeed: await btcFeed.getAddress(),
            usdcUsdFeed: await usdcFeed.getAddress(),
            vstrcUsdFeed: await vstrcFeed.getAddress(),
            vSTRC: await vault.getAddress(),
            btcStrategy: await strategy.getAddress(),
        },
        timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(
        "deployment-sepolia.json",
        JSON.stringify(addresses, null, 2)
    );
    console.log("\n📄 Addresses saved to deployment-sepolia.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
