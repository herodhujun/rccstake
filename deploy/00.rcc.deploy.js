module.exports= async ({getNamedAccounts,deployments})=>{
    const {firstAccount} =await getNamedAccounts()
    const {deploy} = deployments
    console.log(deploy)
    const rccToken = await deploy("RccToken",{
        from:firstAccount,
        args:[],
        log:true
    })
    console.log("RccToken address is" + rccToken.address)
    if(hre.network.config.chainId == 11155111 && process.env.ETHERSCAN_API_KEY){
        console.log("star verify RccToken")
        await hre.run("verify:verify", {
            address: rccToken.address,
            constructorArguments: [],
        });
    }else{
        console.log("network is not sepolia verification is skipped")
    }
}
module.exports.tags = ["all","RccToken"]