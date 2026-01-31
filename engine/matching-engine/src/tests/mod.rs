#[cfg(test)]
mod tests {
    use crate::engine::matching::MatchingEngine;
    use crate::models::{order::Order, side::Side, price::Price};
    use uuid::Uuid;

    fn create_order(side: Side, price: u64, quantity: u64) -> Order {
        Order {
            id: Uuid::new_v4(),
            market: "BTC-USD".to_string(),
            wallet: "test-wallet".to_string(),
            side,
            price: Price(price),
            quantity,
            timestamp: 0,
        }
    }

    #[test]
    fn test_basic_matching() {
        let mut engine = MatchingEngine::new("BTC-USD");

        // Add a sell order at 50000
        let sell = create_order(Side::Sell, 50000, 10);
        let trades = engine.submit(sell);
        assert_eq!(trades.len(), 0); // No match yet

        // Add a buy order at 50000 (should match)
        let buy = create_order(Side::Buy, 50000, 5);
        let trades = engine.submit(buy);
        assert_eq!(trades.len(), 1);
        assert_eq!(trades[0].quantity, 5);
        assert_eq!(trades[0].price.0, 50000);
    }

    #[test]
    fn test_price_time_priority() {
        let mut engine = MatchingEngine::new("BTC-USD");

        // Add two sell orders at same price
        let sell1 = create_order(Side::Sell, 50000, 5);
        let sell1_id = sell1.id;
        engine.submit(sell1);

        let sell2 = create_order(Side::Sell, 50000, 5);
        engine.submit(sell2);

        // Buy should match with first order (time priority)
        let buy = create_order(Side::Buy, 50000, 3);
        let trades = engine.submit(buy);
        assert_eq!(trades.len(), 1);
        assert_eq!(trades[0].sell_order, sell1_id);
    }

    #[test]
    fn test_partial_fill() {
        let mut engine = MatchingEngine::new("BTC-USD");

        let sell = create_order(Side::Sell, 50000, 10);
        engine.submit(sell);

        let buy = create_order(Side::Buy, 50000, 6);
        let trades = engine.submit(buy);
        
        assert_eq!(trades.len(), 1);
        assert_eq!(trades[0].quantity, 6);

        // Remaining quantity should still be in book
        let buy2 = create_order(Side::Buy, 50000, 4);
        let trades2 = engine.submit(buy2);
        assert_eq!(trades2.len(), 1);
        assert_eq!(trades2[0].quantity, 4);
    }

    #[test]
    fn test_no_match_price_too_low() {
        let mut engine = MatchingEngine::new("BTC-USD");

        let sell = create_order(Side::Sell, 50000, 10);
        engine.submit(sell);

        let buy = create_order(Side::Buy, 49999, 10);
        let trades = engine.submit(buy);
        
        assert_eq!(trades.len(), 0); // No match, price too low
    }

    #[test]
    fn test_cancel_order() {
        let mut engine = MatchingEngine::new("BTC-USD");

        let order = create_order(Side::Buy, 50000, 10);
        let order_id = order.id;
        engine.submit(order);

        engine.cancel(order_id);

        // Try to match - should not find the cancelled order
        let sell = create_order(Side::Sell, 50000, 10);
        let trades = engine.submit(sell);
        assert_eq!(trades.len(), 0);
    }

    #[test]
    fn test_deterministic_sequence() {
        let mut engine = MatchingEngine::new("BTC-USD");

        let sell = create_order(Side::Sell, 50000, 10);
        engine.submit(sell);

        let buy1 = create_order(Side::Buy, 50000, 3);
        let trades1 = engine.submit(buy1);
        
        let buy2 = create_order(Side::Buy, 50000, 2);
        let trades2 = engine.submit(buy2);

        assert_eq!(trades1[0].sequence, 1);
        assert_eq!(trades2[0].sequence, 2);
    }

    #[test]
    fn test_multiple_price_levels() {
        let mut engine = MatchingEngine::new("BTC-USD");

        // Add sells at different prices
        engine.submit(create_order(Side::Sell, 50100, 5));
        engine.submit(create_order(Side::Sell, 50000, 5));
        engine.submit(create_order(Side::Sell, 50200, 5));

        // Buy at 50150 should match with 50000 and 50100
        let buy = create_order(Side::Buy, 50150, 8);
        let trades = engine.submit(buy);
        
        assert_eq!(trades.len(), 2);
        assert_eq!(trades[0].price.0, 50000); // Best price first
        assert_eq!(trades[1].price.0, 50100);
    }
}
