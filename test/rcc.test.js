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
//   beforeEach(async function () {
//     [owner, addr1, addr2] = await ethers.getSigners();
//     console.log(`constract is start deploying owner is ${owner.address},${addr1.address},${addr2.address}`)
//     factory = await ethers.getContractFactory("RccToken");
//     token = await factory.deploy(); // 部署时铸造 100 万代币

//     await token.waitForDeployment();
//     console.log(`constract has been deployed successfully,constract address is ${token.target}`)
//   });

  it("Should return the correct name and symbol", async function () {
    expect(await rccToken.name()).to.equal("RccToken");
    expect(await rccToken.symbol()).to.equal("RCC");
  });

  it("Should mint tokens to the owner", async function () {
    expect(await rccToken.balanceOf(firstAccount)).to.greaterThanOrEqual(10);
  });
});