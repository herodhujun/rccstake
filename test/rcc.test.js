const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC20 Token", function () {
  let rccToken;
  let firstAccount;
  beforeEach(async function() {
      await deployments.fixture(["RccToken"])
      firstAccount = (await getNamedAccounts()).firstAccount
      const RccTokenDeployment = await deployments.get("RccToken")
      rccToken = await ethers.getContractAt("RccToken", RccTokenDeployment.address)
  })

  it("Should return the correct name and symbol", async function () {
    expect(await rccToken.name()).to.equal("RccToken");
    expect(await rccToken.symbol()).to.equal("RCC");
  });

  it("Should mint tokens to the owner", async function () {
    expect(await rccToken.balanceOf(firstAccount)).to.greaterThanOrEqual(10);
  });
});