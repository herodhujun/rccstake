//import ether.js
//create main function
//execute main function
const {ethers} = require("hardhat")
async function main(){
    console.log("constract deploying")
    //create factory合约工厂
    const rccFactory = await ethers.getContractFactory("RccToken")
    //deploy constract form factory
    const rcc = await rccFactory.deploy()
    await rcc.waitForDeployment()
    console.log(`constract has been deployed successfully,constract address is ${rcc.target}`)
    
    if(hre.network.config.chainId = 11155111 && process.env.ETHERSCAN_API_KEY){
        const tx = await rcc.deploymentTransaction().wait(5);
        console.log("Transaction status:", tx.status); // 1 表示成功，0 表示失败
        await verifyRcc(rcc.target, [])
    }
    
}
async function verifyRcc(rccaddr, args){
   
    await hre.run("verify:verify", {
        address: rccaddr,
        constructorArguments: args,
      });
}
main().then().catch((error) =>{
    console.error(error)
    process.exit(1)
})