// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Vault.sol";
import "./Settlement.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Exchange
 * @notice Main coordinator contract for the hybrid DEX
 * @dev This contract serves as the entry point and coordinator
 * 
 * ARCHITECTURE:
 * 1. Exchange: Coordination and configuration
 * 2. Vault: Secure custody of funds
 * 3. Settlement: Trade settlement logic
 * 4. Off-chain: Fast matching engine
 * 
 * This mirrors production exchanges like dYdX, Coinbase
 */
contract Exchange is Ownable {
    Vault public vault;
    Settlement public settlement;
    
    // Supported trading pairs
    mapping(bytes32 => MarketConfig) public markets;
    
    struct MarketConfig {
        bool active;
        address baseToken;
        address quoteToken;
        uint256 minOrderSize;
        uint256 tickSize;
    }
    
    event MarketAdded(bytes32 indexed marketId, address baseToken, address quoteToken);
    event MarketStatusUpdated(bytes32 indexed marketId, bool active);
    event VaultUpdated(address indexed oldVault, address indexed newVault);
    event SettlementUpdated(address indexed oldSettlement, address indexed newSettlement);

    constructor() Ownable(msg.sender) {
        // Deploy Vault
        vault = new Vault();
        
        // Deploy Settlement
        settlement = new Settlement(address(vault));
        
        // Authorize settlement contract to access vault
        vault.setSettlementContract(address(settlement));
    }

    /**
     * @notice Add a new trading market
     * @param marketId Unique market identifier (e.g., "BTC-USD")
     * @param baseToken Base token address
     * @param quoteToken Quote token address
     * @param minOrderSize Minimum order size
     * @param tickSize Tick size for price
     */
    function addMarket(
        string calldata marketId,
        address baseToken,
        address quoteToken,
        uint256 minOrderSize,
        uint256 tickSize
    ) external onlyOwner {
        bytes32 marketHash = keccak256(bytes(marketId));
        require(!markets[marketHash].active, "Exchange: market exists");
        require(baseToken != address(0) && quoteToken != address(0), "Exchange: invalid tokens");
        
        markets[marketHash] = MarketConfig({
            active: true,
            baseToken: baseToken,
            quoteToken: quoteToken,
            minOrderSize: minOrderSize,
            tickSize: tickSize
        });
        
        emit MarketAdded(marketHash, baseToken, quoteToken);
    }

    /**
     * @notice Enable or disable a market
     * @param marketId Market identifier
     * @param active New status
     */
    function setMarketStatus(string calldata marketId, bool active) external onlyOwner {
        bytes32 marketHash = keccak256(bytes(marketId));
        require(markets[marketHash].baseToken != address(0), "Exchange: market not found");
        
        markets[marketHash].active = active;
        emit MarketStatusUpdated(marketHash, active);
    }

    /**
     * @notice Update settlement operator
     * @param operator New operator address
     */
    function setSettlementOperator(address operator) external onlyOwner {
        settlement.setSettlementOperator(operator);
    }

    /**
     * @notice Get market configuration
     * @param marketId Market identifier
     * @return Market configuration
     */
    function getMarket(string calldata marketId) external view returns (MarketConfig memory) {
        bytes32 marketHash = keccak256(bytes(marketId));
        return markets[marketHash];
    }

    /**
     * @notice Check if market is active
     * @param marketId Market identifier
     * @return True if active
     */
    function isMarketActive(string calldata marketId) external view returns (bool) {
        bytes32 marketHash = keccak256(bytes(marketId));
        return markets[marketHash].active;
    }
}

