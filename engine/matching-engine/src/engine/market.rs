use std::collections::HashMap;
use crate::engine::matching::MatchingEngine;
use crate::models::{order::Order, trade::Trade};

pub struct MarketRegistry {
    markets: HashMap<String, MatchingEngine>,
}

impl MarketRegistry {
    pub fn new() -> Self {
        Self { markets: HashMap::new() }
    }

    pub fn submit(&mut self, order: Order) -> Vec<Trade> {
        let engine = self.markets
            .entry(order.market.clone())
            .or_insert_with(|| MatchingEngine::new(&order.market));

        engine.submit(order)
    }
}