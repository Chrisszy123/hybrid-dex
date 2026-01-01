use uuid::Uuid;
use serde::{Serialize, Deserialize};
use super::{side::Side, price::Price};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    pub id: Uuid,
    pub market: String,
    pub wallet: String,
    pub side: Side,
    pub price: Price,
    pub quantity: u64,
    pub timestamp: u64,
}

