import { ethers, upgrades } from "hardhat";

async function main() {
  console.log("============================================");
  console.log("    CargoCoin (CC) Token Upgrade");
  console.log("============================================\n");

  // Get the proxy address from environment or command line
  const proxyAddress = process.env.CARGOCOIN_PROXY_ADDRESS;

  if (!proxyAddress) {
    throw new Error(
      "CARGOCOIN_PROXY_ADDRESS environment variable is required. " +
        "Set it to the address of the deployed proxy contract."
    );
  }

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "MATIC\n");

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log("");

  console.log("Proxy Address:", proxyAddress);

  // Get old implementation address
  const oldImplementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("Old Implementation:", oldImplementationAddress);
  console.log("");

  // Verify upgrader role
  const CargoCoin = await ethers.getContractFactory("CargoCoin");
  const cargoCoin = CargoCoin.attach(proxyAddress);

  const upgraderRole = await cargoCoin.UPGRADER_ROLE();
  const hasUpgraderRole = await cargoCoin.hasRole(upgraderRole, deployer.address);

  if (!hasUpgraderRole) {
    throw new Error(
      `Account ${deployer.address} does not have UPGRADER_ROLE. ` +
        "Only accounts with UPGRADER_ROLE can upgrade the contract."
    );
  }

  console.log("Upgrading CargoCoin implementation...");

  // Upgrade to new implementation
  // Note: Replace "CargoCoin" with "CargoCoinV2" when you have a new version
  const upgraded = await upgrades.upgradeProxy(proxyAddress, CargoCoin, {
    kind: "uups",
  });

  await upgraded.waitForDeployment();

  // Get new implementation address
  const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("\n============================================");
  console.log("         Upgrade Successful!");
  console.log("============================================");
  console.log("Proxy Address:", proxyAddress);
  console.log("Old Implementation:", oldImplementationAddress);
  console.log("New Implementation:", newImplementationAddress);
  console.log("");

  // Verify the upgrade
  console.log("Verifying upgrade...");
  const name = await upgraded.name();
  const symbol = await upgraded.symbol();
  const totalSupply = await upgraded.totalSupply();

  console.log("- Token Name:", name);
  console.log("- Token Symbol:", symbol);
  console.log("- Total Supply:", ethers.formatEther(totalSupply), "CC");
  console.log("");

  console.log("To verify new implementation on PolygonScan:");
  console.log(`npx hardhat verify --network <network> ${newImplementationAddress}`);
  console.log("");

  return {
    proxyAddress,
    oldImplementationAddress,
    newImplementationAddress,
  };
}

main()
  .then(() => {
    console.log("Upgrade completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Upgrade failed:", error);
    process.exit(1);
  });
