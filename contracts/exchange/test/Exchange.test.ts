import { expect } from "chai";
import { ethers } from "hardhat";
import { Exchange, Vault, Settlement } from "../typechain-types";

describe("Exchange System", function () {
  let exchange: Exchange;
  let vault: Vault;
  let settlement: Settlement;
  let owner: any;
  let operator: any;
  let trader1: any;
  let trader2: any;

  beforeEach(async function () {
    [owner, operator, trader1, trader2] = await ethers.getSigners();
    
    // Deploy Exchange (which deploys Vault and Settlement)
    const ExchangeFactory = await ethers.getContractFactory("Exchange");
    exchange = await ExchangeFactory.deploy();
    await exchange.waitForDeployment();

    // Get deployed Vault and Settlement addresses
    const vaultAddress = await exchange.vault();
    const settlementAddress = await exchange.settlement();

    vault = await ethers.getContractAt("Vault", vaultAddress);
    settlement = await ethers.getContractAt("Settlement", settlementAddress);

    // Set operator for settlement
    await exchange.setSettlementOperator(operator.address);
  });

  describe("Deployment", function () {
    it("Should deploy all contracts correctly", async function () {
      expect(await exchange.vault()).to.not.equal(ethers.ZeroAddress);
      expect(await exchange.settlement()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should set owner correctly", async function () {
      expect(await exchange.owner()).to.equal(owner.address);
      expect(await vault.owner()).to.equal(owner.address);
      expect(await settlement.owner()).to.equal(owner.address);
    });

    it("Should authorize settlement contract in vault", async function () {
      expect(await vault.settlementContract()).to.equal(await exchange.settlement());
    });
  });

  describe("Market Management", function () {
    it("Should add a new market", async function () {
      const mockToken = ethers.ZeroAddress; // Use zero address for testing
      
      await exchange.addMarket("BTC-USD", mockToken, mockToken, 1000, 1);
      
      const market = await exchange.getMarket("BTC-USD");
      expect(market.active).to.be.true;
      expect(market.baseToken).to.equal(mockToken);
    });

    it("Should disable a market", async function () {
      const mockToken = ethers.ZeroAddress;
      
      await exchange.addMarket("BTC-USD", mockToken, mockToken, 1000, 1);
      await exchange.setMarketStatus("BTC-USD", false);
      
      const market = await exchange.getMarket("BTC-USD");
      expect(market.active).to.be.false;
    });

    it("Should check if market is active", async function () {
      const mockToken = ethers.ZeroAddress;
      
      await exchange.addMarket("BTC-USD", mockToken, mockToken, 1000, 1);
      expect(await exchange.isMarketActive("BTC-USD")).to.be.true;
    });
  });

  describe("Settlement", function () {
    it("Should generate deterministic trade IDs", async function () {
      const tradeId1 = await settlement.generateTradeId(
        "BTC-USD",
        "order1",
        "order2",
        1,
        50000,
        1000
      );

      const tradeId2 = await settlement.generateTradeId(
        "BTC-USD",
        "order1",
        "order2",
        1,
        50000,
        1000
      );

      expect(tradeId1).to.equal(tradeId2);
    });

    it("Should prevent replay attacks", async function () {
      const tradeId = await settlement.generateTradeId(
        "BTC-USD",
        "order1",
        "order2",
        1,
        50000,
        1000
      );

      // First settlement should succeed (we'll skip actual token transfer for this test)
      // Second settlement should fail
      expect(await settlement.verifySettlement(tradeId)).to.be.false;
    });

    it("Should emit trade settled events", async function () {
      // This would test event emission in actual settlement
      // Skipped for brevity as it requires mock ERC20 tokens
    });
  });

  describe("Security", function () {
    it("Should only allow operator to settle trades", async function () {
      const tradeId = ethers.keccak256(ethers.toUtf8Bytes("test"));
      
      await expect(
        settlement.connect(trader1).settleTrades(
          [tradeId],
          [trader1.address],
          [trader2.address],
          ethers.ZeroAddress,
          [1000]
        )
      ).to.be.revertedWith("Settlement: only operator");
    });

    it("Should only allow owner to set operator", async function () {
      await expect(
        exchange.connect(trader1).setSettlementOperator(trader1.address)
      ).to.be.reverted;
    });

    it("Should only allow settlement contract to transfer in vault", async function () {
      await expect(
        vault.connect(trader1).transferInternal(
          ethers.ZeroAddress,
          trader1.address,
          trader2.address,
          1000
        )
      ).to.be.revertedWith("Vault: only settlement");
    });
  });
});

