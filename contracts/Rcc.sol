// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract RccToken is ERC20{
    constructor() ERC20("RccToken", "RCC"){
        // 初始供应量可以在这里定义，或者留空以便之后通过 mint 函数铸造
        // 初始化10000个代币
        _mint(msg.sender, 10000 * 10 ** decimals());
    }
}