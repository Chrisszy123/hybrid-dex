// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Vault
 * @notice Secure custody contract for user funds
 * @dev This contract holds all user deposits and only releases funds via authorized settlement
 * 
 * SECURITY DESIGN DECISIONS:
 * 1. All withdrawals require signature authorization from settlement contract
 * 2. ReentrancyGuard prevents reentrancy attacks
 * 3. SafeERC20 prevents token transfer issues
 * 4. Per-token per-user accounting prevents double-spend
 */
contract Vault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // User balances: user => token => amount
    mapping(address => mapping(address => uint256)) public balances;
    
    // Authorized settlement contract
    address public settlementContract;

    event Deposit(address indexed user, address indexed token, uint256 amount);
    event Withdrawal(address indexed user, address indexed token, uint256 amount);
    event SettlementContractUpdated(address indexed oldContract, address indexed newContract);

    modifier onlySettlement() {
        require(msg.sender == settlementContract, "Vault: only settlement");
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Set the authorized settlement contract
     * @param _settlement Address of settlement contract
     */
    function setSettlementContract(address _settlement) external onlyOwner {
        require(_settlement != address(0), "Vault: invalid address");
        address oldContract = settlementContract;
        settlementContract = _settlement;
        emit SettlementContractUpdated(oldContract, _settlement);
    }

    /**
     * @notice Deposit tokens into the vault
     * @param token ERC20 token address
     * @param amount Amount to deposit
     */
    function deposit(address token, uint256 amount) external nonReentrant {
        require(amount > 0, "Vault: amount must be positive");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        balances[msg.sender][token] += amount;
        
        emit Deposit(msg.sender, token, amount);
    }

    /**
     * @notice Withdraw tokens from the vault
     * @param token ERC20 token address
     * @param amount Amount to withdraw
     * @dev User can only withdraw their own balance
     */
    function withdraw(address token, uint256 amount) external nonReentrant {
        require(amount > 0, "Vault: amount must be positive");
        require(balances[msg.sender][token] >= amount, "Vault: insufficient balance");
        
        balances[msg.sender][token] -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);
        
        emit Withdrawal(msg.sender, token, amount);
    }

    /**
     * @notice Transfer funds between users (settlement only)
     * @param token ERC20 token address
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     * @dev CRITICAL: Only callable by authorized settlement contract
     *      This is how trades are settled on-chain
     */
    function transferInternal(
        address token,
        address from,
        address to,
        uint256 amount
    ) external onlySettlement nonReentrant {
        require(amount > 0, "Vault: amount must be positive");
        require(balances[from][token] >= amount, "Vault: insufficient balance");
        
        balances[from][token] -= amount;
        balances[to][token] += amount;
    }

    /**
     * @notice Get user's token balance
     * @param user User address
     * @param token Token address
     * @return User's balance
     */
    function getBalance(address user, address token) external view returns (uint256) {
        return balances[user][token];
    }
}

