import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { CargoCoin } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("CargoCoin", function () {
  // Constants
  const TOKEN_NAME = "CargoCoin";
  const TOKEN_SYMBOL = "CC";
  const DECIMALS = 18n;
  const MAX_SUPPLY = ethers.parseEther("1000000000"); // 1 billion
  const BURN_RATE = 200n; // 2%
  const PERCENTAGE_DENOMINATOR = 10000n;

  // Fixture for deploying the contract
  async function deployCargoCoinFixture() {
    const [admin, minter, user1, user2, user3] = await ethers.getSigners();

    const CargoCoin = await ethers.getContractFactory("CargoCoin");
    const cargoCoin = (await upgrades.deployProxy(
      CargoCoin,
      [admin.address, minter.address],
      {
        initializer: "initialize",
        kind: "uups",
      }
    )) as unknown as CargoCoin;

    await cargoCoin.waitForDeployment();

    return { cargoCoin, admin, minter, user1, user2, user3 };
  }

  describe("Deployment", function () {
    it("Should set the correct token name and symbol", async function () {
      const { cargoCoin } = await loadFixture(deployCargoCoinFixture);

      expect(await cargoCoin.name()).to.equal(TOKEN_NAME);
      expect(await cargoCoin.symbol()).to.equal(TOKEN_SYMBOL);
    });

    it("Should set the correct decimals", async function () {
      const { cargoCoin } = await loadFixture(deployCargoCoinFixture);

      expect(await cargoCoin.decimals()).to.equal(DECIMALS);
    });

    it("Should set the correct max supply", async function () {
      const { cargoCoin } = await loadFixture(deployCargoCoinFixture);

      expect(await cargoCoin.maxSupply()).to.equal(MAX_SUPPLY);
    });

    it("Should set initial total supply to zero", async function () {
      const { cargoCoin } = await loadFixture(deployCargoCoinFixture);

      expect(await cargoCoin.totalSupply()).to.equal(0);
    });

    it("Should grant ADMIN_ROLE to admin", async function () {
      const { cargoCoin, admin } = await loadFixture(deployCargoCoinFixture);

      const adminRole = await cargoCoin.ADMIN_ROLE();
      expect(await cargoCoin.hasRole(adminRole, admin.address)).to.be.true;
    });

    it("Should grant MINTER_ROLE to minter", async function () {
      const { cargoCoin, minter } = await loadFixture(deployCargoCoinFixture);

      const minterRole = await cargoCoin.MINTER_ROLE();
      expect(await cargoCoin.hasRole(minterRole, minter.address)).to.be.true;
    });

    it("Should grant PAUSER_ROLE to admin", async function () {
      const { cargoCoin, admin } = await loadFixture(deployCargoCoinFixture);

      const pauserRole = await cargoCoin.PAUSER_ROLE();
      expect(await cargoCoin.hasRole(pauserRole, admin.address)).to.be.true;
    });

    it("Should grant UPGRADER_ROLE to admin", async function () {
      const { cargoCoin, admin } = await loadFixture(deployCargoCoinFixture);

      const upgraderRole = await cargoCoin.UPGRADER_ROLE();
      expect(await cargoCoin.hasRole(upgraderRole, admin.address)).to.be.true;
    });

    it("Should enable auto burn by default", async function () {
      const { cargoCoin } = await loadFixture(deployCargoCoinFixture);

      expect(await cargoCoin.autoBurnEnabled()).to.be.true;
    });

    it("Should revert initialization with zero admin address", async function () {
      const CargoCoin = await ethers.getContractFactory("CargoCoin");
      const [, minter] = await ethers.getSigners();

      await expect(
        upgrades.deployProxy(
          CargoCoin,
          [ethers.ZeroAddress, minter.address],
          {
            initializer: "initialize",
            kind: "uups",
          }
        )
      ).to.be.revertedWithCustomError(CargoCoin, "InvalidAddress");
    });

    it("Should revert initialization with zero minter address", async function () {
      const CargoCoin = await ethers.getContractFactory("CargoCoin");
      const [admin] = await ethers.getSigners();

      await expect(
        upgrades.deployProxy(
          CargoCoin,
          [admin.address, ethers.ZeroAddress],
          {
            initializer: "initialize",
            kind: "uups",
          }
        )
      ).to.be.revertedWithCustomError(CargoCoin, "InvalidAddress");
    });
  });

  describe("Minting", function () {
    it("Should allow minter to mint tokens", async function () {
      const { cargoCoin, minter, user1 } = await loadFixture(deployCargoCoinFixture);

      const mintAmount = ethers.parseEther("1000");
      await cargoCoin.connect(minter).mint(user1.address, mintAmount);

      expect(await cargoCoin.balanceOf(user1.address)).to.equal(mintAmount);
      expect(await cargoCoin.totalSupply()).to.equal(mintAmount);
    });

    it("Should emit TokensMinted event on mint", async function () {
      const { cargoCoin, minter, user1 } = await loadFixture(deployCargoCoinFixture);

      const mintAmount = ethers.parseEther("1000");

      await expect(cargoCoin.connect(minter).mint(user1.address, mintAmount))
        .to.emit(cargoCoin, "TokensMinted")
        .withArgs(user1.address, mintAmount);
    });

    it("Should revert when non-minter tries to mint", async function () {
      const { cargoCoin, user1, user2 } = await loadFixture(deployCargoCoinFixture);

      const mintAmount = ethers.parseEther("1000");

      await expect(
        cargoCoin.connect(user1).mint(user2.address, mintAmount)
      ).to.be.revertedWithCustomError(cargoCoin, "AccessControlUnauthorizedAccount");
    });

    it("Should revert when minting to zero address", async function () {
      const { cargoCoin, minter } = await loadFixture(deployCargoCoinFixture);

      const mintAmount = ethers.parseEther("1000");

      await expect(
        cargoCoin.connect(minter).mint(ethers.ZeroAddress, mintAmount)
      ).to.be.revertedWithCustomError(cargoCoin, "InvalidAddress");
    });

    it("Should revert when minting zero amount", async function () {
      const { cargoCoin, minter, user1 } = await loadFixture(deployCargoCoinFixture);

      await expect(
        cargoCoin.connect(minter).mint(user1.address, 0)
      ).to.be.revertedWithCustomError(cargoCoin, "InvalidAmount");
    });

    it("Should revert when minting exceeds max supply", async function () {
      const { cargoCoin, minter, user1 } = await loadFixture(deployCargoCoinFixture);

      const exceedingAmount = MAX_SUPPLY + 1n;

      await expect(
        cargoCoin.connect(minter).mint(user1.address, exceedingAmount)
      ).to.be.revertedWithCustomError(cargoCoin, "ExceedsMaxSupply");
    });

    it("Should track available supply correctly", async function () {
      const { cargoCoin, minter, user1 } = await loadFixture(deployCargoCoinFixture);

      const mintAmount = ethers.parseEther("1000000");
      await cargoCoin.connect(minter).mint(user1.address, mintAmount);

      expect(await cargoCoin.availableSupply()).to.equal(MAX_SUPPLY - mintAmount);
    });
  });

  describe("Auto Burn (2% on transfers)", function () {
    async function mintedFixture() {
      const fixture = await loadFixture(deployCargoCoinFixture);
      const { cargoCoin, minter, user1, user2 } = fixture;

      // Mint tokens to user1
      const mintAmount = ethers.parseEther("10000");
      await cargoCoin.connect(minter).mint(user1.address, mintAmount);

      return { ...fixture, mintAmount };
    }

    it("Should burn 2% on transfer", async function () {
      const { cargoCoin, user1, user2, mintAmount } = await loadFixture(mintedFixture);

      const transferAmount = ethers.parseEther("1000");
      const burnAmount = (transferAmount * BURN_RATE) / PERCENTAGE_DENOMINATOR;
      const netAmount = transferAmount - burnAmount;

      await cargoCoin.connect(user1).transfer(user2.address, transferAmount);

      expect(await cargoCoin.balanceOf(user2.address)).to.equal(netAmount);
      expect(await cargoCoin.balanceOf(user1.address)).to.equal(mintAmount - transferAmount);
      expect(await cargoCoin.totalBurned()).to.equal(burnAmount);
    });

    it("Should emit AutoBurn event on transfer", async function () {
      const { cargoCoin, user1, user2 } = await loadFixture(mintedFixture);

      const transferAmount = ethers.parseEther("1000");
      const burnAmount = (transferAmount * BURN_RATE) / PERCENTAGE_DENOMINATOR;

      await expect(cargoCoin.connect(user1).transfer(user2.address, transferAmount))
        .to.emit(cargoCoin, "AutoBurn")
        .withArgs(user1.address, user2.address, burnAmount);
    });

    it("Should not burn on mint", async function () {
      const { cargoCoin, minter, user1 } = await loadFixture(deployCargoCoinFixture);

      const mintAmount = ethers.parseEther("1000");
      await cargoCoin.connect(minter).mint(user1.address, mintAmount);

      expect(await cargoCoin.balanceOf(user1.address)).to.equal(mintAmount);
      expect(await cargoCoin.totalBurned()).to.equal(0);
    });

    it("Should not auto-burn when disabled", async function () {
      const { cargoCoin, admin, user1, user2, mintAmount } = await loadFixture(mintedFixture);

      // Disable auto burn
      await cargoCoin.connect(admin).setAutoBurnEnabled(false);

      const transferAmount = ethers.parseEther("1000");
      await cargoCoin.connect(user1).transfer(user2.address, transferAmount);

      // Full amount should be transferred
      expect(await cargoCoin.balanceOf(user2.address)).to.equal(transferAmount);
      expect(await cargoCoin.totalBurned()).to.equal(0);
    });

    it("Should not burn for exempt addresses", async function () {
      const { cargoCoin, admin, user1, user2, mintAmount } = await loadFixture(mintedFixture);

      // Set user1 as burn exempt
      await cargoCoin.connect(admin).setBurnExemption(user1.address, true);

      const transferAmount = ethers.parseEther("1000");
      await cargoCoin.connect(user1).transfer(user2.address, transferAmount);

      // Full amount should be transferred
      expect(await cargoCoin.balanceOf(user2.address)).to.equal(transferAmount);
      expect(await cargoCoin.totalBurned()).to.equal(0);
    });

    it("Should calculate burn amount correctly", async function () {
      const { cargoCoin } = await loadFixture(deployCargoCoinFixture);

      const amount = ethers.parseEther("1000");
      const expectedBurn = (amount * BURN_RATE) / PERCENTAGE_DENOMINATOR;

      expect(await cargoCoin.calculateBurnAmount(amount)).to.equal(expectedBurn);
    });
  });

  describe("Manual Burn", function () {
    async function mintedFixture() {
      const fixture = await loadFixture(deployCargoCoinFixture);
      const { cargoCoin, minter, user1 } = fixture;

      const mintAmount = ethers.parseEther("10000");
      await cargoCoin.connect(minter).mint(user1.address, mintAmount);

      return { ...fixture, mintAmount };
    }

    it("Should allow users to burn their own tokens", async function () {
      const { cargoCoin, user1, mintAmount } = await loadFixture(mintedFixture);

      const burnAmount = ethers.parseEther("1000");
      await cargoCoin.connect(user1).burn(burnAmount);

      expect(await cargoCoin.balanceOf(user1.address)).to.equal(mintAmount - burnAmount);
    });

    it("Should allow burnFrom with approval", async function () {
      const { cargoCoin, user1, user2, mintAmount } = await loadFixture(mintedFixture);

      const burnAmount = ethers.parseEther("1000");
      await cargoCoin.connect(user1).approve(user2.address, burnAmount);
      await cargoCoin.connect(user2).burnFrom(user1.address, burnAmount);

      expect(await cargoCoin.balanceOf(user1.address)).to.equal(mintAmount - burnAmount);
    });
  });

  describe("Pause/Unpause", function () {
    async function mintedFixture() {
      const fixture = await loadFixture(deployCargoCoinFixture);
      const { cargoCoin, minter, user1 } = fixture;

      const mintAmount = ethers.parseEther("10000");
      await cargoCoin.connect(minter).mint(user1.address, mintAmount);

      return { ...fixture, mintAmount };
    }

    it("Should allow pauser to pause", async function () {
      const { cargoCoin, admin } = await loadFixture(deployCargoCoinFixture);

      await cargoCoin.connect(admin).pause();
      expect(await cargoCoin.paused()).to.be.true;
    });

    it("Should allow pauser to unpause", async function () {
      const { cargoCoin, admin } = await loadFixture(deployCargoCoinFixture);

      await cargoCoin.connect(admin).pause();
      await cargoCoin.connect(admin).unpause();
      expect(await cargoCoin.paused()).to.be.false;
    });

    it("Should revert transfers when paused", async function () {
      const { cargoCoin, admin, user1, user2 } = await loadFixture(mintedFixture);

      await cargoCoin.connect(admin).pause();

      await expect(
        cargoCoin.connect(user1).transfer(user2.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(cargoCoin, "EnforcedPause");
    });

    it("Should revert when non-pauser tries to pause", async function () {
      const { cargoCoin, user1 } = await loadFixture(deployCargoCoinFixture);

      await expect(
        cargoCoin.connect(user1).pause()
      ).to.be.revertedWithCustomError(cargoCoin, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to add minter", async function () {
      const { cargoCoin, admin, user1 } = await loadFixture(deployCargoCoinFixture);

      await cargoCoin.connect(admin).addMinter(user1.address);

      expect(await cargoCoin.isMinter(user1.address)).to.be.true;
    });

    it("Should allow admin to remove minter", async function () {
      const { cargoCoin, admin, minter } = await loadFixture(deployCargoCoinFixture);

      await cargoCoin.connect(admin).removeMinter(minter.address);

      expect(await cargoCoin.isMinter(minter.address)).to.be.false;
    });

    it("Should revert when non-admin tries to add minter", async function () {
      const { cargoCoin, user1, user2 } = await loadFixture(deployCargoCoinFixture);

      await expect(
        cargoCoin.connect(user1).addMinter(user2.address)
      ).to.be.revertedWithCustomError(cargoCoin, "AccessControlUnauthorizedAccount");
    });

    it("Should revert when adding zero address as minter", async function () {
      const { cargoCoin, admin } = await loadFixture(deployCargoCoinFixture);

      await expect(
        cargoCoin.connect(admin).addMinter(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(cargoCoin, "InvalidAddress");
    });
  });

  describe("Burn Exemption", function () {
    it("Should allow admin to set burn exemption", async function () {
      const { cargoCoin, admin, user1 } = await loadFixture(deployCargoCoinFixture);

      await cargoCoin.connect(admin).setBurnExemption(user1.address, true);

      expect(await cargoCoin.burnExempt(user1.address)).to.be.true;
    });

    it("Should emit BurnExemptionUpdated event", async function () {
      const { cargoCoin, admin, user1 } = await loadFixture(deployCargoCoinFixture);

      await expect(cargoCoin.connect(admin).setBurnExemption(user1.address, true))
        .to.emit(cargoCoin, "BurnExemptionUpdated")
        .withArgs(user1.address, true);
    });

    it("Should revert when non-admin sets burn exemption", async function () {
      const { cargoCoin, user1, user2 } = await loadFixture(deployCargoCoinFixture);

      await expect(
        cargoCoin.connect(user1).setBurnExemption(user2.address, true)
      ).to.be.revertedWithCustomError(cargoCoin, "AccessControlUnauthorizedAccount");
    });

    it("Should revert when setting burn exemption for zero address", async function () {
      const { cargoCoin, admin } = await loadFixture(deployCargoCoinFixture);

      await expect(
        cargoCoin.connect(admin).setBurnExemption(ethers.ZeroAddress, true)
      ).to.be.revertedWithCustomError(cargoCoin, "InvalidAddress");
    });
  });

  describe("Auto Burn Toggle", function () {
    it("Should allow admin to disable auto burn", async function () {
      const { cargoCoin, admin } = await loadFixture(deployCargoCoinFixture);

      await cargoCoin.connect(admin).setAutoBurnEnabled(false);

      expect(await cargoCoin.autoBurnEnabled()).to.be.false;
    });

    it("Should emit AutoBurnStatusUpdated event", async function () {
      const { cargoCoin, admin } = await loadFixture(deployCargoCoinFixture);

      await expect(cargoCoin.connect(admin).setAutoBurnEnabled(false))
        .to.emit(cargoCoin, "AutoBurnStatusUpdated")
        .withArgs(false);
    });

    it("Should revert when non-admin toggles auto burn", async function () {
      const { cargoCoin, user1 } = await loadFixture(deployCargoCoinFixture);

      await expect(
        cargoCoin.connect(user1).setAutoBurnEnabled(false)
      ).to.be.revertedWithCustomError(cargoCoin, "AccessControlUnauthorizedAccount");
    });
  });

  describe("View Functions", function () {
    it("Should return correct circulating supply", async function () {
      const { cargoCoin, minter, user1 } = await loadFixture(deployCargoCoinFixture);

      const mintAmount = ethers.parseEther("1000000");
      await cargoCoin.connect(minter).mint(user1.address, mintAmount);

      expect(await cargoCoin.circulatingSupply()).to.equal(mintAmount);
    });

    it("Should verify minter status correctly", async function () {
      const { cargoCoin, minter, user1 } = await loadFixture(deployCargoCoinFixture);

      expect(await cargoCoin.isMinter(minter.address)).to.be.true;
      expect(await cargoCoin.isMinter(user1.address)).to.be.false;
    });
  });

  describe("Upgradeability", function () {
    it("Should allow upgrader to upgrade contract", async function () {
      const { cargoCoin, admin } = await loadFixture(deployCargoCoinFixture);

      const CargoCoinV2 = await ethers.getContractFactory("CargoCoin");
      const proxyAddress = await cargoCoin.getAddress();

      // This should not revert
      const upgraded = await upgrades.upgradeProxy(proxyAddress, CargoCoinV2, {
        kind: "uups",
      });

      expect(await upgraded.name()).to.equal(TOKEN_NAME);
    });

    it("Should preserve state after upgrade", async function () {
      const { cargoCoin, admin, minter, user1 } = await loadFixture(deployCargoCoinFixture);

      // Mint some tokens before upgrade
      const mintAmount = ethers.parseEther("1000");
      await cargoCoin.connect(minter).mint(user1.address, mintAmount);

      const proxyAddress = await cargoCoin.getAddress();
      const CargoCoinV2 = await ethers.getContractFactory("CargoCoin");

      const upgraded = await upgrades.upgradeProxy(proxyAddress, CargoCoinV2, {
        kind: "uups",
      });

      // State should be preserved
      expect(await upgraded.balanceOf(user1.address)).to.equal(mintAmount);
      expect(await upgraded.totalSupply()).to.equal(mintAmount);
    });
  });
});
