import { ethers, upgrades } from "hardhat";

/**
 * Deploy CargoCoin L1 Token
 *
 * Este script deploya o token CargoCoin na Polygon PoS (L1).
 * O token será usado como gas token na CargoCoin Chain (L3).
 *
 * Distribuição inicial (conforme tokenomics):
 *   - 5% Liquidez inicial: 50.000.000 CC
 *   - 20% Equipe/Fundadores: 200.000.000 CC (com vesting)
 *   - 15% Investidores: 150.000.000 CC (com vesting)
 *   - 10% Ecossistema: 100.000.000 CC
 *   - 10% Reserva: 100.000.000 CC
 *   - 40% Recompensas: 400.000.000 CC (bridgeado para L3)
 */
async function main() {
  console.log("============================================");
  console.log("  CargoCoin L1 Token Deployment");
  console.log("  (Polygon PoS - Gas Token for L3)");
  console.log("============================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "MATIC\n");

  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log("");

  // Configuration
  const adminAddress = process.env.ADMIN_ADDRESS || deployer.address;

  // Initial supply: 60% (600M CC) - to be distributed
  // 40% (400M CC) will be minted and bridged to L3 for rewards
  const initialSupply = ethers.parseEther("600000000"); // 600 million

  console.log("Configuration:");
  console.log("- Admin Address:", adminAddress);
  console.log("- Initial Supply:", ethers.formatEther(initialSupply), "CC");
  console.log("");

  // Deploy CargoCoinL1
  console.log("Deploying CargoCoinL1 (UUPS Proxy)...");
  const CargoCoinL1 = await ethers.getContractFactory("CargoCoinL1");

  const cargoCoinL1 = await upgrades.deployProxy(
    CargoCoinL1,
    [adminAddress, adminAddress, initialSupply],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );

  await cargoCoinL1.waitForDeployment();
  const proxyAddress = await cargoCoinL1.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("\n============================================");
  console.log("       L1 Deployment Successful!");
  console.log("============================================");
  console.log("Proxy Address:", proxyAddress);
  console.log("Implementation Address:", implementationAddress);
  console.log("");

  // Verify deployment
  console.log("Verifying deployment...");
  const name = await cargoCoinL1.name();
  const symbol = await cargoCoinL1.symbol();
  const totalSupply = await cargoCoinL1.totalSupply();
  const maxSupply = await cargoCoinL1.maxSupply();

  console.log("- Token Name:", name);
  console.log("- Token Symbol:", symbol);
  console.log("- Total Supply:", ethers.formatEther(totalSupply), "CC");
  console.log("- Max Supply:", ethers.formatEther(maxSupply), "CC");
  console.log("- Remaining:", ethers.formatEther(maxSupply - totalSupply), "CC");
  console.log("");

  console.log("============================================");
  console.log("            Next Steps");
  console.log("============================================");
  console.log("");
  console.log("1. Update genesis.json with this address:");
  console.log(`   "gasTokenAddress": "${proxyAddress}"`);
  console.log("");
  console.log("2. Mint remaining 400M CC for rewards pool:");
  console.log("   await cargoCoinL1.mint(rewardsPoolAddress, ethers.parseEther('400000000'))");
  console.log("");
  console.log("3. Set bridge address when CDK bridge is deployed:");
  console.log("   await cargoCoinL1.setBridgeAddress(bridgeAddress)");
  console.log("");
  console.log("4. Verify on PolygonScan:");
  console.log(`   npx hardhat verify --network polygon ${implementationAddress}`);
  console.log("");

  // Save addresses
  console.log("Environment variables to save:");
  console.log(`CARGOCOIN_L1_PROXY=${proxyAddress}`);
  console.log(`CARGOCOIN_L1_IMPLEMENTATION=${implementationAddress}`);

  return { proxyAddress, implementationAddress };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
