const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("vSTRC Protocol", function () {
    let usdc, vault, strategy, btcFeed, usdcFeed, vstrcFeed;
    let deployer, alice, bob, keeper;

    const USDC_DECIMALS = 6;
    const parseUSDC = (amount) => ethers.parseUnits(amount.toString(), USDC_DECIMALS);

    beforeEach(async function () {
        [deployer, alice, bob, keeper] = await ethers.getSigners();

        // Deploy mock tokens
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        usdc = await MockERC20.deploy("USD Coin", "USDC", 6);

        // Deploy mock price feeds
        const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
        btcFeed = await MockPriceFeed.deploy(ethers.parseUnits("97000", 8), 8, "BTC/USD");
        usdcFeed = await MockPriceFeed.deploy(ethers.parseUnits("1", 8), 8, "USDC/USD");
        vstrcFeed = await MockPriceFeed.deploy(parseUSDC("100"), 6, "vSTRC/USD");

        // Deploy vSTRC vault
        const VSTRC = await ethers.getContractFactory("vSTRC");
        vault = await VSTRC.deploy(await usdc.getAddress(), deployer.address);

        // Deploy mock strategy
        const MockStrategy = await ethers.getContractFactory("MockStrategy");
        strategy = await MockStrategy.deploy(
            await usdc.getAddress(),
            await vault.getAddress()
        );

        // Configure
        await vault.setStrategy(await strategy.getAddress());
        await vault.setVSTRCOracle(await vstrcFeed.getAddress());
        await vault.grantRole(await vault.KEEPER_ROLE(), keeper.address);

        // Mint USDC to users
        await usdc.mint(alice.address, parseUSDC("100000"));
        await usdc.mint(bob.address, parseUSDC("100000"));
    });

    describe("ERC-4626 Vault Basic Operations", function () {
        it("should accept deposits and mint vSTRC shares", async function () {
            const depositAmount = parseUSDC("10000");
            await usdc.connect(alice).approve(await vault.getAddress(), depositAmount);
            await vault.connect(alice).deposit(depositAmount, alice.address);

            expect(await vault.balanceOf(alice.address)).to.be.gt(0);
            expect(await vault.totalAssets()).to.be.gt(0);
        });

        it("should allow withdrawals", async function () {
            const depositAmount = parseUSDC("10000");
            await usdc.connect(alice).approve(await vault.getAddress(), depositAmount);
            await vault.connect(alice).deposit(depositAmount, alice.address);

            const shares = await vault.balanceOf(alice.address);
            await vault.connect(alice).redeem(shares, alice.address, alice.address);

            expect(await vault.balanceOf(alice.address)).to.equal(0);
        });

        it("should enforce minimum deposit", async function () {
            const tinyDeposit = parseUSDC("0.5"); // Below $1 minimum
            await usdc.connect(alice).approve(await vault.getAddress(), tinyDeposit);
            await expect(
                vault.connect(alice).deposit(tinyDeposit, alice.address)
            ).to.be.revertedWithCustomError(vault, "DepositTooSmall");
        });

        it("should report correct decimals (6 for USDC)", async function () {
            expect(await vault.decimals()).to.equal(6);
        });
    });

    describe("Self-Tuning Dividend Logic", function () {
        beforeEach(async function () {
            // Alice deposits
            const depositAmount = parseUSDC("50000");
            await usdc.connect(alice).approve(await vault.getAddress(), depositAmount);
            await vault.connect(alice).deposit(depositAmount, alice.address);
        });

        it("should revert rebalanceYield if epoch not elapsed", async function () {
            await expect(
                vault.connect(keeper).rebalanceYield()
            ).to.be.revertedWithCustomError(vault, "EpochNotElapsed");
        });

        it("should execute rebalanceYield after epoch duration", async function () {
            // Fast forward 7 days
            await time.increase(7 * 24 * 60 * 60);

            await expect(vault.connect(keeper).rebalanceYield())
                .to.emit(vault, "YieldRebalanced");

            expect(await vault.epochCount()).to.equal(1);
        });

        it("should increase yield rate when price is below target", async function () {
            // Set vSTRC price below target ($90 < $100)
            await vstrcFeed.setPrice(parseUSDC("90"));
            await time.increase(7 * 24 * 60 * 60);

            await vault.connect(keeper).rebalanceYield();

            // Rate should be higher than base rate (800 bps = 8%)
            const rate = await vault.currentRateBps();
            expect(rate).to.be.gt(800);
        });

        it("should decrease yield rate when price is above target", async function () {
            // Set vSTRC price above target ($110 > $100)
            await vstrcFeed.setPrice(parseUSDC("110"));
            await time.increase(7 * 24 * 60 * 60);

            await vault.connect(keeper).rebalanceYield();

            // Rate should be lower than base rate
            const rate = await vault.currentRateBps();
            expect(rate).to.be.lt(800);
        });

        it("should clamp rate to min/max bounds", async function () {
            // Extreme low price → should hit max rate
            await vstrcFeed.setPrice(parseUSDC("50"));
            await time.increase(7 * 24 * 60 * 60);
            await vault.connect(keeper).rebalanceYield();

            const rate = await vault.currentRateBps();
            expect(rate).to.be.lte(2500); // maxRateBps
        });
    });

    describe("Circuit Breaker", function () {
        it("should allow manager to pause minting", async function () {
            await vault.setCircuitBreaker(true, false);

            const depositAmount = parseUSDC("10000");
            await usdc.connect(alice).approve(await vault.getAddress(), depositAmount);
            await expect(
                vault.connect(alice).deposit(depositAmount, alice.address)
            ).to.be.revertedWithCustomError(vault, "MintingPaused");
        });

        it("should allow manager to pause redeeming", async function () {
            // First deposit
            const depositAmount = parseUSDC("10000");
            await usdc.connect(alice).approve(await vault.getAddress(), depositAmount);
            await vault.connect(alice).deposit(depositAmount, alice.address);

            // Pause redeeming
            await vault.setCircuitBreaker(false, true);

            const shares = await vault.balanceOf(alice.address);
            await expect(
                vault.connect(alice).redeem(shares, alice.address, alice.address)
            ).to.be.revertedWithCustomError(vault, "RedeemingPaused");
        });
    });

    describe("Access Control", function () {
        it("should prevent non-managers from setting strategy", async function () {
            await expect(
                vault.connect(alice).setStrategy(ethers.ZeroAddress)
            ).to.be.reverted;
        });

        it("should prevent non-keepers from calling rebalanceYield", async function () {
            await time.increase(7 * 24 * 60 * 60);
            await expect(
                vault.connect(alice).rebalanceYield()
            ).to.be.reverted;
        });

        it("should allow manager to update dividend params", async function () {
            await vault.setDividendParams(1000, 3000, 200, 3000);
            expect(await vault.baseRateBps()).to.equal(1000);
            expect(await vault.sensitivityBps()).to.equal(3000);
        });
    });

    describe("Collateral Ratio", function () {
        it("should return correct collateral ratio", async function () {
            const depositAmount = parseUSDC("50000");
            await usdc.connect(alice).approve(await vault.getAddress(), depositAmount);
            await vault.connect(alice).deposit(depositAmount, alice.address);

            const ratio = await vault.collateralRatio();
            // Should be close to 1e18 (100%) for fresh deposits
            expect(ratio).to.be.gt(0);
        });
    });

    describe("SelfTuningMath Library", function () {
        it("should calculate variable rate correctly for below-peg", async function () {
            // This is tested indirectly through vault.rebalanceYield()
            // Price at $90 (10% below $100 target)
            // Expected adjustment = sensitivity * deviation = 2000 * 1000/10000 = 200 bps
            // Expected rate = 800 + 200 = 1000 bps
            await vstrcFeed.setPrice(parseUSDC("90"));

            const depositAmount = parseUSDC("10000");
            await usdc.connect(alice).approve(await vault.getAddress(), depositAmount);
            await vault.connect(alice).deposit(depositAmount, alice.address);

            await time.increase(7 * 24 * 60 * 60);
            await vault.connect(keeper).rebalanceYield();

            const rate = await vault.currentRateBps();
            expect(rate).to.equal(1000); // 10%
        });

        it("should calculate variable rate correctly for above-peg", async function () {
            // Price at $110 (10% above $100 target)
            // Expected adjustment = sensitivity * deviation = 2000 * 1000/10000 = 200 bps
            // Expected rate = 800 - 200 = 600 bps
            await vstrcFeed.setPrice(parseUSDC("110"));

            const depositAmount = parseUSDC("10000");
            await usdc.connect(alice).approve(await vault.getAddress(), depositAmount);
            await vault.connect(alice).deposit(depositAmount, alice.address);

            await time.increase(7 * 24 * 60 * 60);
            await vault.connect(keeper).rebalanceYield();

            const rate = await vault.currentRateBps();
            expect(rate).to.equal(600); // 6%
        });
    });
});
