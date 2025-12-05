import { ethers, upgrades } from "hardhat";

async function main() {
  console.log("============================================");
  console.log("    CargoCoin (CC) Token Deployment");
  console.log("============================================\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "MATIC\n");

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log("");

  // Configuration
  // In production, these should come from environment variables
  const adminAddress = process.env.ADMIN_ADDRESS || deployer.address;
  const minterAddress = process.env.REWARDS_CONTRACT_ADDRESS || deployer.address;

  console.log("Configuration:");
  console.log("- Admin Address:", adminAddress);
  console.log("- Initial Minter (Rewards Contract):", minterAddress);
  console.log("");

  // Deploy CargoCoin as UUPS Proxy
  console.log("Deploying CargoCoin token (UUPS Proxy)...");
  const CargoCoin = await ethers.getContractFactory("CargoCoin");

  const cargoCoin = await upgrades.deployProxy(
    CargoCoin,
    [adminAddress, minterAddress],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );

  await cargoCoin.waitForDeployment();
  const proxyAddress = await cargoCoin.getAddress();

  // Get implementation address
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("\n============================================");
  console.log("         Deployment Successful!");
  console.log("============================================");
  console.log("Proxy Address:", proxyAddress);
  console.log("Implementation Address:", implementationAddress);
  console.log("");

  // Verify deployment
  console.log("Verifying deployment...");
  const name = await cargoCoin.name();
  const symbol = await cargoCoin.symbol();
  const decimals = await cargoCoin.decimals();
  const maxSupply = await cargoCoin.maxSupply();
  const autoBurnEnabled = await cargoCoin.autoBurnEnabled();

  console.log("- Token Name:", name);
  console.log("- Token Symbol:", symbol);
  console.log("- Decimals:", decimals.toString());
  console.log("- Max Supply:", ethers.formatEther(maxSupply), "CC");
  console.log("- Auto Burn Enabled:", autoBurnEnabled);
  console.log("");

  // Verify roles
  console.log("Verifying roles...");
  const hasAdminRole = await cargoCoin.hasRole(await cargoCoin.ADMIN_ROLE(), adminAddress);
  const hasMinterRole = await cargoCoin.hasRole(await cargoCoin.MINTER_ROLE(), minterAddress);

  console.log("- Admin has ADMIN_ROLE:", hasAdminRole);
  console.log("- Minter has MINTER_ROLE:", hasMinterRole);
  console.log("");

  console.log("============================================");
  console.log("          Deployment Summary");
  console.log("============================================");
  console.log("");
  console.log("Add these addresses to your .env file:");
  console.log("");
  console.log(`CARGOCOIN_PROXY_ADDRESS=${proxyAddress}`);
  console.log(`CARGOCOIN_IMPLEMENTATION_ADDRESS=${implementationAddress}`);
  console.log("");
  console.log("To verify on PolygonScan:");
  console.log(`npx hardhat verify --network <network> ${implementationAddress}`);
  console.log("");

  return {
    proxyAddress,
    implementationAddress,
  };
}

main()
  .then((addresses) => {
    console.log("Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
