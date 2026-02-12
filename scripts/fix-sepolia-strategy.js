const { ethers } = require("hardhat");
const fs = require("fs");

/**
 * Quick fix: Replace BTCStrategy with MockStrategy on the live Sepolia deployment.
 * BTCStrategy can't work on testnet because the Uniswap/Aave addresses are placeholders.
 */
async function main() {
    const [deployer] = await ethers.getSigners();
    const deployment = JSON.parse(fs.readFileSync("deployment-sepolia.json", "utf8"));

    console.log("Deployer:", deployer.address);
    console.log("Vault:   ", deployment.contracts.vSTRC);

    // 1. Deploy MockStrategy
    console.log("\n📦 Deploying MockStrategy...");
    const MockStrategy = await ethers.getContractFactory("MockStrategy");
    const mockStrategy = await MockStrategy.deploy(
        deployment.contracts.usdc,
        deployment.contracts.vSTRC
    );
    await mockStrategy.waitForDeployment();
    const mockAddr = await mockStrategy.getAddress();
    console.log(`  MockStrategy: ${mockAddr}`);

    // 2. Point vault to the new MockStrategy
    console.log("\n🔧 Updating vault strategy...");
    const vault = await ethers.getContractAt("vSTRC", deployment.contracts.vSTRC);
    await vault.setStrategy(mockAddr);
    console.log("  ✓ Vault now points to MockStrategy");

    // 3. Update deployment file
    deployment.contracts.btcStrategy = mockAddr;
    deployment.contracts._note = "Using MockStrategy for testnet (BTCStrategy needs real Uniswap/Aave)";
    fs.writeFileSync("deployment-sepolia.json", JSON.stringify(deployment, null, 2));
    console.log("\n📄 deployment-sepolia.json updated");
    console.log("\nDone! Deposits should work now.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
