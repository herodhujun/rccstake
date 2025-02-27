const { ethers, upgrades } = require("hardhat");
module.exports= async ({getNamedAccounts,deployments})=>{
    const {firstAccount} =await getNamedAccounts()
    const {deploy} = deployments
    //部署获取到的Rcc Token 地址
    const RccToken =await deployments.get("RccToken")
   // 获取当前区块号
   
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log(`currentBlock is ${currentBlock}`)
    const startBlockOffset = 10;
    // 质押结束的区块高度,sepolia 出块时间是12s,想要质押合约运行x秒,那么endBlock = startBlock+x/12
    //改为偏移量具体合约运行时间 (endBlockOffset - startBlockOffset)/12
    const endBlockOffset = 1000;
    // 每个区块奖励的Rcc token的数量
    // const RccPerBlock = "20000000000000000";
    const RccPerBlock = ethers.parseEther("10"); // 10 RCC per block
    const Stake = await hre.ethers.getContractFactory("RCCStake");
    const s = await upgrades.deployProxy(
        Stake,
        [RccToken.address, currentBlock + startBlockOffset, currentBlock + endBlockOffset, RccPerBlock],
        { initializer: "initialize" }
      );
      //await box.deployed();
      console.log("Box deployed to:", await s.getAddress());
    
}
module.exports.tags = ["all","RCCStake"]