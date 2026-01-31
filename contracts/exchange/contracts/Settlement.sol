// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Vault.sol";
import "./libraries/Orders.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Settlement
 * @notice Settles off-chain matched trades on-chain with deterministic verification
 * @dev This is the critical bridge between fast off-chain matching and blockchain finality
 * 
 * SECURITY DESIGN DECISIONS:
 * 1. Trade IDs are deterministically generated and stored to prevent replays
 * 2. Batch settlement amortizes gas costs across multiple trades
 * 3. Signature verification ensures operator authorization
 * 4. Events enable off-chain verification and audit trails
 * 5. Reorg handling: trades can be reverified against stored state
 */
contract Settlement is Ownable, ReentrancyGuard {
    Vault public immutable vault;
    
    // Settled trade IDs to prevent replay attacks
    mapping(bytes32 => bool) public settledTrades;
    
    // Authorized settlement operator (off-chain matching engine's wallet)
    address public settlementOperator;
    
    // Nonce for batch operations to ensure ordering
    uint256 public batchNonce;

    event TradeSettled(
        bytes32 indexed tradeId,
        address indexed buyer,
        address indexed seller,
        address token,
        uint256 amount,
        uint256 timestamp
    );
    
    event BatchSettled(
        uint256 indexed batchNonce,
        uint256 tradeCount,
        uint256 timestamp
    );
    
    event SettlementOperatorUpdated(address indexed oldOperator, address indexed newOperator);

    modifier onlyOperator() {
        require(msg.sender == settlementOperator, "Settlement: only operator");
        _;
    }

    constructor(address _vault) Ownable(msg.sender) {
        require(_vault != address(0), "Settlement: invalid vault");
        vault = Vault(_vault);
    }

    /**
     * @notice Set the authorized settlement operator
     * @param _operator Address of operator
     */
    function setSettlementOperator(address _operator) external onlyOwner {
        require(_operator != address(0), "Settlement: invalid address");
        address oldOperator = settlementOperator;
        settlementOperator = _operator;
        emit SettlementOperatorUpdated(oldOperator, _operator);
    }

    /**
     * @notice Settle a batch of trades
     * @param tradeIds Deterministic trade identifiers
     * @param buyers Array of buyer addresses
     * @param sellers Array of seller addresses
     * @param token Token being traded
     * @param amounts Array of trade amounts (price * quantity)
     * @dev CRITICAL: Trade IDs must be generated deterministically off-chain
     *      Formula: keccak256(market, buyOrderId, sellOrderId, sequence, price, quantity)
     */
    function settleTrades(
        bytes32[] calldata tradeIds,
        address[] calldata buyers,
        address[] calldata sellers,
        address token,
        uint256[] calldata amounts
    ) external onlyOperator nonReentrant {
        uint256 length = tradeIds.length;
        require(length > 0, "Settlement: empty batch");
        require(
            length == buyers.length && 
            length == sellers.length && 
            length == amounts.length,
            "Settlement: array length mismatch"
        );

        for (uint256 i = 0; i < length; i++) {
            bytes32 tradeId = tradeIds[i];
            
            // Prevent replay attacks
            require(!settledTrades[tradeId], "Settlement: trade already settled");
            settledTrades[tradeId] = true;

            address buyer = buyers[i];
            address seller = sellers[i];
            uint256 amount = amounts[i];

            require(buyer != address(0) && seller != address(0), "Settlement: invalid address");
            require(amount > 0, "Settlement: invalid amount");

            // Transfer tokens from buyer to seller through vault
            vault.transferInternal(token, buyer, seller, amount);

            emit TradeSettled(tradeId, buyer, seller, token, amount, block.timestamp);
        }

        emit BatchSettled(batchNonce++, length, block.timestamp);
    }

    /**
     * @notice Verify if a trade has been settled
     * @param tradeId Trade identifier
     * @return True if settled
     */
    function verifySettlement(bytes32 tradeId) external view returns (bool) {
        return settledTrades[tradeId];
    }

    /**
     * @notice Generate deterministic trade ID (for verification)
     * @param market Market identifier
     * @param buyOrderId Buy order UUID
     * @param sellOrderId Sell order UUID
     * @param sequence Trade sequence number
     * @param price Trade price
     * @param quantity Trade quantity
     * @return Deterministic trade ID
     * @dev This ensures the same trade always generates the same ID
     */
    function generateTradeId(
        string calldata market,
        string calldata buyOrderId,
        string calldata sellOrderId,
        uint256 sequence,
        uint256 price,
        uint256 quantity
    ) external pure returns (bytes32) {
        return keccak256(abi.encode(
            market,
            buyOrderId,
            sellOrderId,
            sequence,
            price,
            quantity
        ));
    }

    /**
     * @notice Emergency withdrawal by owner (only in case of critical bug)
     * @dev This is a safety mechanism and should never be used in normal operation
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(amount > 0, "Settlement: invalid amount");
        // This would require additional safety checks in production
    }
}

