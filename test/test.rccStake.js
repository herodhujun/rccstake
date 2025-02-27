const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("rccStake test", function () {
  let rccStakeProxy;
  let rccToken;
  let firstAccount;
  let secondAccount;
  beforeEach(async function () {
     // await deployments.fixture(["RCCStake"])
     firstAccount = (await getNamedAccounts()).firstAccount
     secondAccount = (await getNamedAccounts()).secondAccount

     //  部署获取到的Rcc Token 地址
   await deployments.fixture(["RccToken"])
    const RccToken =await deployments.get("RccToken")
    rccToken = await ethers.getContractAt("RccToken", RccToken.address)
    // 质押起始区块高度,可以去sepolia上面读取最新的区块高度
    const startBlock = 6529999;
    // 质押结束的区块高度,sepolia 出块时间是12s,想要质押合约运行x秒,那么endBlock = startBlock+x/12
    const endBlock = 9529999;
    // 每个区块奖励的Rcc token的数量
    const RccPerBlock = "20000000000000000";
    const Stake = await hre.ethers.getContractFactory("RCCStake");
    rccStakeProxy = await upgrades.deployProxy(
        Stake,
        [RccToken.address, startBlock, endBlock, RccPerBlock],
        { initializer: "initialize" }
      );
      await rccStakeProxy.waitForDeployment()
      //await box.deployed();
      // console.log("Box deployed to:", await rccStakeProxy.getAddress());
  });
  
  it("rcc address of RccStake is equals RccToken address", async function () {
    expect(await rccStakeProxy.RCC().address).to.equal(rccToken.address);
    
  });

  it("start block must be smaller than end block", async function () {
    await expect( rccStakeProxy.setStartBlock(95299991)).to.be.revertedWith(
      "start block must be smaller than end block"
    );
  });
  // it("UNSUPPORTED_OPERATION", async function () {
  //   await expect( rccStakeProxy.connect(secondAccount).setStartBlock(95299991)).to.be.revertedWith(
  //     "UNSUPPORTED_OPERATION"
  //   );
  // });

  it("first addaddress test", async function () {

    const rawAddress = "0x0";
    const randomWallet = ethers.Wallet.createRandom();
    const randomAddress = randomWallet.address;
    // 首次必须添加0x0地址
    await expect( rccStakeProxy.addPool(randomAddress,1,2,95299991,true)).to.be.revertedWith("invalid staking token address");

  })
  //模拟第一次添加0x0地址，后续添加随机地址
  it("add two address test", async function () {
    await rccStakeProxy.addPool(ethers.ZeroAddress, 100, ethers.parseEther("0.1"),100, false);
    const randomWallet = ethers.Wallet.createRandom();
    const randomAddress = randomWallet.address;
    // 第二次添加随机地址 判断预期是否抛出事件
    await expect(rccStakeProxy.addPool(randomAddress,100,ethers.parseEther("0.1"),95299991,true)).to.emit(rccStakeProxy,"AddPool")

  })
  it("getMultiplier", async function () {

    await expect( rccStakeProxy.getMultiplier(3,2)).to.be.revertedWith(
      "invalid block"
    );
  })

  it("getMultiplier2", async function () {

    expect(await rccStakeProxy.getMultiplier(6529994,6529999)).to.be.equal(0);
  })

  it("poolLength", async function () {
    expect(await rccStakeProxy.poolLength()).to.be.equal(0);
  })

  it("should allow admin to add the first pool with zero address", async function () {
    // 添加第一个池，_stTokenAddress 必须是零地址
    await rccStakeProxy.addPool(ethers.ZeroAddress, 100, 1, 100, false);

    // 验证池的数量
    const poolLength = await rccStakeProxy.poolLength();
    expect(poolLength).to.equal(1);
  });

  it("mullte add zeroAddress test", 
    async function() {
        await rccStakeProxy.addPool(ethers.ZeroAddress,100, ethers.parseEther("0.1"),100, false);
        await expect(rccStakeProxy.addPool(ethers.ZeroAddress,100, ethers.parseEther("0.1"),100, false))
            .to.be.revertedWith("invalid staking token address")
    }
)

  it("disposeETH test eth amount is too small", 
    async function() {
        await rccStakeProxy.addPool(ethers.ZeroAddress,100, ethers.parseEther("0.1"),100, false);
        const poolLength = await rccStakeProxy.poolLength();
      
        const depositAmount = ethers.parseEther("0.01");
    
        await expect( rccStakeProxy.depositETH({value: depositAmount}))
            .to.be.revertedWith("deposit amount is too small")
    }
)

it("disposeETH success", 
  async function() {
          await rccStakeProxy.addPool(ethers.ZeroAddress, 100, ethers.parseEther("0.1"), 100, false);
         const depositAmount = ethers.parseEther("0.2");
         console.log(`depositAmount is ${depositAmount}`)
         await expect(
          rccStakeProxy.depositETH({
            value: depositAmount
          })
        ).to.emit(rccStakeProxy, "Deposit")
        const poolInfo = await rccStakeProxy.pool(0);
        expect(poolInfo.stTokenAmount).to.equal(depositAmount);  
    
  }
)


});