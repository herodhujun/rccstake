require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("hardhat-deploy")
require("@openzeppelin/hardhat-upgrades");
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: false,
        runs: 200,
      },
    },
  },

  networks: {
    sepolia: {
      chainId:11155111,
      url:"https://sepolia.infura.io/v3/" + process.env.ALCHEMY_API_KEY,
      accounts: [process.env.PRIVATE_KEY,process.env.PRIVATE_KEY_1],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY,
    }
  },
  namedAccounts:{
    firstAccount:{
      default:0
    },
    secondAccount:{
      default:1
    }
  }
};
