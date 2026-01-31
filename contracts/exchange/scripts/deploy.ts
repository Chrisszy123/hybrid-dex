import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Hybrid DEX Contracts...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy Exchange (which automatically deploys Vault and Settlement)
  console.log("\nDeploying Exchange...");
  const ExchangeFactory = await ethers.getContractFactory("Exchange");
  const exchange = await ExchangeFactory.deploy();
  await exchange.waitForDeployment();
  const exchangeAddress = await exchange.getAddress();
  console.log("Exchange deployed to:", exchangeAddress);

  // Get deployed contract addresses
  const vaultAddress = await exchange.vault();
  const settlementAddress = await exchange.settlement();
  
  console.log("Vault deployed to:", vaultAddress);
  console.log("Settlement deployed to:", settlementAddress);

  // Configure settlement operator (in production, use a secure operator wallet)
  const operatorAddress = process.env.OPERATOR_ADDRESS || deployer.address;
  console.log("\nSetting settlement operator to:", operatorAddress);
  await exchange.setSettlementOperator(operatorAddress);

  // Deploy mock tokens for testing
  console.log("\nDeploying mock tokens...");
  
  const MockERC20Factory = await ethers.getContractFactory("MockERC20");
  
  const mockBTC = await MockERC20Factory.deploy("Mock Bitcoin", "BTC", 8);
  await mockBTC.waitForDeployment();
  const mockBTCAddress = await mockBTC.getAddress();
  console.log("Mock BTC deployed to:", mockBTCAddress);

  const mockETH = await MockERC20Factory.deploy("Mock Ethereum", "ETH", 18);
  await mockETH.waitForDeployment();
  const mockETHAddress = await mockETH.getAddress();
  console.log("Mock ETH deployed to:", mockETHAddress);

  const mockUSDC = await MockERC20Factory.deploy("Mock USD Coin", "USDC", 6);
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("Mock USDC deployed to:", mockUSDCAddress);

  // Add markets with actual token addresses
  console.log("\nAdding markets...");
  
  await exchange.addMarket(
    "BTC-USD",
    mockBTCAddress,
    mockUSDCAddress,
    ethers.parseUnits("0.0001", 8), // Min order size (in BTC decimals)
    ethers.parseUnits("1", 6)        // Tick size (in USDC decimals)
  );
  console.log("Added market: BTC-USD");

  await exchange.addMarket(
    "ETH-USD",
    mockETHAddress,
    mockUSDCAddress,
    ethers.parseUnits("0.001", 18),  // Min order size (in ETH decimals)
    ethers.parseUnits("0.01", 6)     // Tick size (in USDC decimals)
  );
  console.log("Added market: ETH-USD");

  // Print configuration summary
  console.log("\n=== Deployment Summary ===");
  console.log("Exchange:", exchangeAddress);
  console.log("Vault:", vaultAddress);
  console.log("Settlement:", settlementAddress);
  console.log("Operator:", operatorAddress);
  console.log("\nMock Tokens:");
  console.log("BTC:", mockBTCAddress);
  console.log("ETH:", mockETHAddress);
  console.log("USDC:", mockUSDCAddress);
  console.log("\nSave these addresses to your .env file:");
  console.log(`EXCHANGE_ADDRESS=${exchangeAddress}`);
  console.log(`VAULT_ADDRESS=${vaultAddress}`);
  console.log(`SETTLEMENT_ADDRESS=${settlementAddress}`);
  console.log(`MOCK_BTC_ADDRESS=${mockBTCAddress}`);
  console.log(`MOCK_ETH_ADDRESS=${mockETHAddress}`);
  console.log(`MOCK_USDC_ADDRESS=${mockUSDCAddress}`);
  console.log("\n=========================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

