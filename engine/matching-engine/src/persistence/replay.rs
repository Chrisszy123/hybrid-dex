use crate::engine::market::MarketRegistry;
use std::fs;

pub fn load() -> MarketRegistry {
    let data = fs::read_to_string("snapshot.json").unwrap();
    serde_json::from_str(&data).unwrap()
}
