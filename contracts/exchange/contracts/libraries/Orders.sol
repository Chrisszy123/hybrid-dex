// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Orders
 * @notice Library for order-related data structures and utilities
 */
library Orders {
    enum Side {
        BUY,
        SELL
    }

    struct Order {
        bytes32 id;
        address trader;
        address market;
        Side side;
        uint256 price;
        uint256 quantity;
        uint256 filled;
        uint256 timestamp;
        bytes signature;
    }

    /**
     * @notice Hash an order for signature verification
     * @param order Order struct
     * @return Order hash
     */
    function hashOrder(Order memory order) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            order.id,
            order.trader,
            order.market,
            order.side,
            order.price,
            order.quantity,
            order.timestamp
        ));
    }

    /**
     * @notice Validate order parameters
     * @param order Order to validate
     * @return True if valid
     */
    function isValid(Order memory order) internal pure returns (bool) {
        return order.trader != address(0) &&
               order.price > 0 &&
               order.quantity > 0 &&
               order.filled <= order.quantity;
    }
}

