use uuid::Uuid;
use serde::{Serialize, Deserialize};
use super::price::Price;

#[derive(Debug, Serialize, Deserialize)]
pub struct Trade {
    pub market: String,
    pub buy_order: Uuid,
    pub sell_order: Uuid,
    pub price: Price,
    pub quantity: u64,
    pub sequence: u64,
}
