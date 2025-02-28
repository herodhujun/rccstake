const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("rccStake test", function () {
  let rccStakeProxy;
  let rccToken;
  let firstAccount;
  let secondAccount;
  let Erc20MockTokenFactory;
  let owner, admin, user1, user2;
  beforeEach(async function () {
    // 获取多个以太坊账户，用于模拟不同的用户和管理员角色
    [owner, admin, user1, user2, ...addrs] = await ethers.getSigners();
    //用于发布质押代币
    Erc20MockTokenFactory = await ethers.getContractFactory("Erc20MockToken")
     // await deployments.fixture(["RCCStake"])
     firstAccount = (await getNamedAccounts()).firstAccount
     secondAccount = (await getNamedAccounts()).secondAccount
     const startBlockOffset = 10; // Start staking 10 blocks after deployment
     const endBlockOffset = 100; // End staking at block number + 1000
     const RCCPerBlock = ethers.parseEther("10"); // 10 RCC per block
     //  部署获取到的Rcc Token 地址
    await deployments.fixture(["RccToken"])
    const RccToken =await deployments.get("RccToken")
    rccToken = await ethers.getContractAt("RccToken", RccToken.address)
    const currentBlock = await ethers.provider.getBlockNumber();
    const Stake = await hre.ethers.getContractFactory("RCCStake");
    rccStakeProxy = await upgrades.deployProxy(
        Stake,
        [RccToken.address, currentBlock + startBlockOffset, currentBlock + endBlockOffset, RCCPerBlock],
        { initializer: "initialize" }
      );
      
      await rccStakeProxy.waitForDeployment()
      
       // 授予 admin 权限
       const adminRole = ethers.keccak256(ethers.toUtf8Bytes("admin_role"));
       await rccStakeProxy.grantRole(adminRole, admin.address);
    
      await rccStakeProxy.connect(admin).addPool(
        ethers.ZeroAddress, // 使用 .ZeroAddress 确保传递 address(0)
        100, // poolWeight 权重
        ethers.parseEther("0.1"), // minDepositAmount（根据合约逻辑）
        100, // 解除质押的锁定区块数
        false // 不需要更新其他池
    );
  });
   
  
  describe("admin Function", function () {
    it("rcc address of RccStake is equals RccToken address", async function () {
      expect(await rccStakeProxy.RCC()).to.equal(rccToken.target);
      
    });

    it("start block must be smaller than end block", async function () {
    await expect( rccStakeProxy.setStartBlock(95299991)).to.be.revertedWith(
      "start block must be smaller than end block"
    );
  });
  });
    describe("User Functions", function () {
      let ustToken;
        beforeEach(async function () {
            // 部署一个额外的 ERC20 代币用于质押
            ustToken = await Erc20MockTokenFactory.deploy("user Staking Token", "UST");
            await ustToken.waitForDeployment();
            // Admin 添加一个新的质押池
            const addPoolTx = await rccStakeProxy.connect(admin).addPool(
                ustToken.target,
                100, // poolWeight
                ethers.parseEther("0.1"), // minDepositAmount
                100, // unstakeLockedBlocks
                true // withUpdate
            );
            await addPoolTx.wait();

            // 为 user1 和 user2 铸造 1000个 ust币
            await ustToken.mint(user1, ethers.parseEther("1000"));
            await ustToken.mint(user2, ethers.parseEther("1000"));
            //合约调用者授权代理合约可以使用的ust币
            await ustToken.connect(user1).approve(rccStakeProxy.target, ethers.parseEther("1000"));
            await ustToken.connect(user2).approve(rccStakeProxy.target, ethers.parseEther("1000"));
        });

        it("User can deposit staking tokens", async function () {
            const depositTx = await rccStakeProxy.connect(user1).deposit(1, ethers.parseEther("1"));
            await expect(depositTx)
                .to.emit(rccStakeProxy, 'Deposit')
                .withArgs(user1, 1, ethers.parseEther("1"));

            const userInfo = await rccStakeProxy.user(1, user1);
            expect(userInfo.stAmount).to.equal(ethers.parseEther("1"));
        });

        it("User cannot deposit below minDepositAmount", async function () {
          await expect(
            rccStakeProxy.connect(user1).deposit(1, ethers.parseEther("0.01"))
          ).to.be.revertedWith("deposit amount is too small");
      });

      it("User unstake amount and withdrow", async function () {
        // 用户存款
        const depositTx = await rccStakeProxy.connect(user2).deposit(1, ethers.parseEther("100"));
        await depositTx.wait();
        expect(await rccStakeProxy.connect(user2).unstake(1, ethers.parseEther("50"))).to.emit(rccStakeProxy,"RequestUnstake");
        // 增加若干区块。模拟时间流逝
        for (let i = 0; i < 150; i++) {
          // 调用以太坊虚拟机（EVM）来挖出一个新的区块
          await ethers.provider.send("evm_mine", []);
        }
        const withdrawTx = await rccStakeProxy.connect(user2).withdraw(1);
        await withdrawTx.wait();

        const user2Balance = await ustToken.connect(user2).balanceOf(user2);

        expect(ethers.parseEther("1000") - ethers.parseEther("50")).to.be.equal(user2Balance)

    });
      it("User can claim RCC rewards", async function () {
        const userInfo = await rccStakeProxy.user(1, user2);
        console.log("stAmount : "+ userInfo.stAmount)
        console.log("finishedRCC : "+ userInfo.finishedRCC)
        console.log("pendingRCC : "+ userInfo.pendingRCC)
        // console.log("userRCCBalance : "+ userRCCBalance)
        // 用户存款
        const depositTx = await rccStakeProxy.connect(user2).deposit(1, ethers.parseEther("100"));
        await depositTx.wait();

        // 增加若干区块以生成奖励
        // for (let i = 0; i < 100; i++) {
        //     await ethers.provider.send("evm_mine", []);
        // }
        const poolInfo  = await rccStakeProxy.pool(0)
       
        const userInfo2 = await rccStakeProxy.user(1, user2);
       
        // uint256 pendingRCC_ = user_.stAmount * pool_.accRCCPerST / (1 ether) - user_.finishedRCC + user_.pendingRCC;
        const pendingRCc = userInfo.stAmount * poolInfo.accRCCPerST / ethers.parseEther("1") - userInfo.finishedRCC + userInfo.pendingRCC;
        console.log("pendingRCc : " + pendingRCc)

        console.log("111: "+ethers.parseEther("1"))
        // 用户领取奖励
        // const claimTx = await rccStakeProxy.connect(user2).claim(1);
        // await expect(claimTx)
        //     .to.emit(rccStakeProxy, 'Claim');

        // 获取用户的 RCC 代币余额
        const userRCCBalance = await rccToken.balanceOf(user2);
        console.log("poolInfo : "+ poolInfo)
        console.log("pool_.accRCCPerST : "+ poolInfo.accRCCPerST)
        console.log("stAmount : "+ userInfo2.stAmount)
        console.log("finishedRCC : "+ userInfo2.finishedRCC)
        console.log("pendingRCC : "+ userInfo2.pendingRCC)
        console.log("userRCCBalance : "+ userRCCBalance)

        console.log("rccStakeProxy rcc address : "+ await rccStakeProxy.RCC())

        console.log("rccStakeProxy rcc address 1 : "+ rccToken.target)
        // 断言用户的 RCC 代币余额大于 0
        expect(userRCCBalance).to.be.gt(ethers.parseEther("0"));
    });
      });

      /** 
        // 用户可以请求取款并在锁定期后提取
        it("User can request unstake and withdraw after lock period", async function () {
            // 用户存款
            // 调用 deposit 函数，向池子编号为 1 的质押池存入 100 个代币
            const depositTx = await rccStake.connect(user1).deposit(1, ethers.parseEther("100"));
            // 等待交易被矿工打包并确认
            await depositTx.wait();

            // 增加若干区块。模拟时间流逝
            for (let i = 0; i < 150; i++) {
                // 调用以太坊虚拟机（EVM）来挖出一个新的区块
                await ethers.provider.send("evm_mine", []);
            }

            // 用户请求取款。
            // 用户 user1 调用 unstake 函数，从池子编号 1 的质押池中请求解除 50 个代币的质押
            const unstakeTx = await rccStake.connect(user1).unstake(1, ethers.parseEther("50"));
            // 使用 Chai 的断言库验证交易是否正确触发了预期的事件
            await expect(unstakeTx)
                .to.emit(rccStake, 'RequestUnstake')
                // 期望事件的参数为 user1 的地址、池子编号 1 和解除质押的数量 50
                .withArgs(user1Address, 1, ethers.parseEther("50"));

            // 增加更多区块以超过锁定期
            for (let i = 0; i < 100; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // 用户提取取款
            const withdrawTx = await rccStake.connect(user1).withdraw(1);
            const currentBlock = await ethers.provider.getBlockNumber();
            await expect(withdrawTx)
                .to.emit(rccStake, 'Withdraw')
                .withArgs(user1Address, 1, ethers.parseEther("50"), currentBlock);

            // 验证用户的质押信息是否正确更新
            // 调用合约的 user 函数，获取用户 user1 在池子编号 1 中的质押信息
            // mapping(uint256 => mapping(address => UserInfo)) public user;
            // function user(uint256 poolId, address userAddress) external view returns (UserInfo memory);
            const userInfo = await rccStake.user(1, user1Address);
            expect(userInfo.stAmount).to.equal(ethers.parseEther("50"));
        });


        it("User can claim RCC rewards", async function () {
            // 用户存款
            const depositTx = await rccStake.connect(user2).deposit(1, ethers.parseEther("100"));
            await depositTx.wait();

            // 增加若干区块以生成奖励
            for (let i = 0; i < 50; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // 用户领取奖励
            const claimTx = await rccStake.connect(user2).claim(1);
            await expect(claimTx)
                .to.emit(rccStake, 'Claim');

            // 获取用户的 RCC 代币余额
            const userRCCBalance = await rccToken.balanceOf(user2Address);
            // 断言用户的 RCC 代币余额大于 0
            expect(userRCCBalance).to.be.gt(ethers.parseEther("0"));
        });

        it("User cannot claim rewards when claim is paused", async function () {
            // 用户存款
            const depositTx = await rccStake.connect(user1).deposit(1, ethers.parseEther("100"));
            await depositTx.wait();

            // 管理员暂停领取
            const pauseClaimTx = await rccStake.connect(admin).pauseClaim();
            await pauseClaimTx.wait();

            // 领取奖励
            await expect(
                rccStake.connect(user1).claim(1)
                // 期望合约调用会以回退的方式失败，并且错误信息包含 "ClaimPaused"
            ).to.be.revertedWithCustomError(rccStake, "ClaimPaused");
        });

        it("User cannot withdraw when withdraw is paused", async function () {
            // 用户存款
            const depositTx = await rccStake.connect(user1).deposit(1, ethers.parseEther("100"));
            await depositTx.wait();

            // 用户请求取款
            const unstakeTx = await rccStake.connect(user1).unstake(1, ethers.parseEther("50"));
            await unstakeTx.wait();

            // 管理员暂停取款
            const pauseWithdrawTx = await rccStake.connect(admin).pauseWithdraw();
            await pauseWithdrawTx.wait();

            // 增加足够的区块以超过锁定期
            for (let i = 0; i < 150; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            await expect(
                rccStake.connect(user1).withdraw(1)
            ).to.be.revertedWithCustomError(rccStake, "WithdrawPaused");
        });

        // 多个用户可以独立交互
        it("Multiple users can interact independently", async function () {
            // 用户1存款
            const depositUser1Tx = await rccStake.connect(user1).deposit(1, ethers.parseEther("100"));
            await depositUser1Tx.wait();

            // 用户2存款
            const depositUser2Tx = await rccStake.connect(user2).deposit(1, ethers.parseEther("200"));
            await depositUser2Tx.wait();

            // 增加若干区块
            for (let i = 0; i < 100; i++) {
                await ethers.provider.send("evm_mine", []);
            }

            // 用户1领取奖励
            const claimUser1Tx = await rccStake.connect(user1).claim(1);
            await expect(claimUser1Tx)
                .to.emit(rccStake, 'Claim');
            const user1RCC = await rccToken.balanceOf(user1Address);
            expect(user1RCC).to.be.gt(ethers.parseEther("0"));

            // 用户2领取奖励
            const claimUser2Tx = await rccStake.connect(user2).claim(1);
            await expect(claimUser2Tx)
                .to.emit(rccStake, 'Claim');
            const user2RCC = await rccToken.balanceOf(user2Address);
            expect(user2RCC).to.be.gt(user1RCC);
        });
        */
   

 
  // it("UNSUPPORTED_OPERATION", async function () {
  //   await expect( rccStakeProxy.connect(secondAccount).setStartBlock(95299991)).to.be.revertedWith(
  //     "UNSUPPORTED_OPERATION"
  //   );
  // });

//   it("repead add the first pool with zero address", async function () {
//     // 添加第一个池，_stTokenAddress 必须是零地址
    
//     expect(rccStakeProxy.addPool(ethers.ZeroAddress,100, ethers.parseEther("0.1"),100, false))
//     .to.be.revertedWith("invalid staking token address")
//   });


//   it("disposeETH test eth amount is too small", 
//     async function() {
//         const depositAmount = ethers.parseEther("0.01");
    
//         await expect( rccStakeProxy.depositETH({value: depositAmount}))
//             .to.be.revertedWith("deposit amount is too small")
//     }
// )

// it("disposeETH success", 
//   async function() {
//          const depositAmount = ethers.parseEther("0.2");
//          console.log(`depositAmount is ${depositAmount}`)
//          await expect(
//           rccStakeProxy.depositETH({
//             value: depositAmount
//           })
//         ).to.emit(rccStakeProxy, "Deposit")
//         const poolInfo = await rccStakeProxy.pool(0);
//         expect(poolInfo.stTokenAmount).to.equal(depositAmount);  
    
//   }
// )


});