use std::collections::HashMap;
use crate::engine::matching::MatchingEngine;
use crate::models::{order::Order, trade::Trade};
use uuid::Uuid;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct MarketRegistry {
    markets: HashMap<String, MatchingEngine>,
}

impl Default for MarketRegistry {
    fn default() -> Self {
        Self::new()
    }
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

    pub fn cancel(&mut self, market: &str, order_id: Uuid) -> Result<(), String> {
        let engine = self.markets
            .get_mut(market)
            .ok_or_else(|| "Market not found".to_string())?;
        
        engine.cancel(order_id);
        Ok(())
    }

    pub fn replace(&mut self, order: Order) -> Result<Vec<Trade>, String> {
        let engine = self.markets
            .get_mut(&order.market)
            .ok_or_else(|| "Market not found".to_string())?;
        
        Ok(engine.replace(order))
    }

    pub fn get_market(&self, market: &str) -> Option<&MatchingEngine> {
        self.markets.get(market)
    }
}