import { ethers, upgrades } from "hardhat";

/**
 * Deploy CargoCoin L3 Contracts
 *
 * Este script deploya os contratos na CargoCoin Chain (L3):
 *   - WrappedCargoCoin (WCC): versão ERC-20 do CC nativo
 *   - CargoCoinRewards: contrato de recompensas PoSD
 *
 * Na L3, CC é o token NATIVO (gas), então não deployamos o token em si.
 * O CC é criado na genesis e bridgeado da L1.
 */
async function main() {
  console.log("============================================");
  console.log("  CargoCoin L3 Contracts Deployment");
  console.log("  (CargoCoin Chain - Native Gas Token)");
  console.log("============================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "CC (native)\n");

  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log("");

  // Configuration
  const adminAddress = process.env.ADMIN_ADDRESS || deployer.address;
  const oracleAddress = process.env.ORACLE_ADDRESS || deployer.address;

  console.log("Configuration:");
  console.log("- Admin Address:", adminAddress);
  console.log("- Oracle Address:", oracleAddress);
  console.log("");

  // =========================================
  // Deploy WrappedCargoCoin (WCC)
  // =========================================
  console.log("1. Deploying WrappedCargoCoin (WCC)...");
  const WrappedCargoCoin = await ethers.getContractFactory("WrappedCargoCoin");
  const wrappedCC = await WrappedCargoCoin.deploy();
  await wrappedCC.waitForDeployment();
  const wccAddress = await wrappedCC.getAddress();
  console.log("   WrappedCargoCoin deployed at:", wccAddress);
  console.log("");

  // =========================================
  // Deploy CargoCoinRewards
  // =========================================
  console.log("2. Deploying CargoCoinRewards (UUPS Proxy)...");
  const CargoCoinRewards = await ethers.getContractFactory("CargoCoinRewards");

  const rewards = await upgrades.deployProxy(
    CargoCoinRewards,
    [adminAddress, oracleAddress],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );

  await rewards.waitForDeployment();
  const rewardsProxyAddress = await rewards.getAddress();
  const rewardsImplAddress = await upgrades.erc1967.getImplementationAddress(rewardsProxyAddress);

  console.log("   Rewards Proxy:", rewardsProxyAddress);
  console.log("   Rewards Implementation:", rewardsImplAddress);
  console.log("");

  // =========================================
  // Verify Deployments
  // =========================================
  console.log("============================================");
  console.log("       L3 Deployment Successful!");
  console.log("============================================\n");

  console.log("Contracts Deployed:");
  console.log("-------------------");
  console.log("WrappedCargoCoin (WCC):", wccAddress);
  console.log("CargoCoinRewards Proxy:", rewardsProxyAddress);
  console.log("CargoCoinRewards Impl:", rewardsImplAddress);
  console.log("");

  // Verify WCC
  console.log("Verifying WrappedCargoCoin...");
  const wccName = await wrappedCC.name();
  const wccSymbol = await wrappedCC.symbol();
  console.log("- Name:", wccName);
  console.log("- Symbol:", wccSymbol);
  console.log("");

  // Verify Rewards
  console.log("Verifying CargoCoinRewards...");
  const networkFactor = await rewards.networkFactor();
  const rewardsPool = await rewards.rewardsPool();
  console.log("- Network Factor:", networkFactor.toString(), "(100 = 1.0x)");
  console.log("- Rewards Pool:", ethers.formatEther(rewardsPool), "CC");
  console.log("");

  // =========================================
  // Next Steps
  // =========================================
  console.log("============================================");
  console.log("            Next Steps");
  console.log("============================================\n");

  console.log("1. Fund the rewards pool:");
  console.log("   Send CC to:", rewardsProxyAddress);
  console.log("   Or call: await rewards.fundRewardsPool({ value: ethers.parseEther('1000000') })");
  console.log("");

  console.log("2. Set oracle address (if different):");
  console.log("   await rewards.grantRole(ORACLE_ROLE, newOracleAddress)");
  console.log("");

  console.log("3. Configure backend to use these contracts:");
  console.log(`   WRAPPED_CC_ADDRESS=${wccAddress}`);
  console.log(`   REWARDS_CONTRACT_ADDRESS=${rewardsProxyAddress}`);
  console.log("");

  console.log("4. Verify contracts:");
  console.log(`   npx hardhat verify --network cargocoin ${wccAddress}`);
  console.log(`   npx hardhat verify --network cargocoin ${rewardsImplAddress}`);
  console.log("");

  return {
    wrappedCargoCoin: wccAddress,
    rewardsProxy: rewardsProxyAddress,
    rewardsImplementation: rewardsImplAddress,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
