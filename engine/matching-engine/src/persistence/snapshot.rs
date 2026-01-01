use serde::{Serialize, Deserialize};
use crate::engine::market::MarketRegistry;
use std::fs;

pub fn save(registry: &MarketRegistry) {
    let data = serde_json::to_string(registry).unwrap();
    fs::write("snapshot.json", data).unwrap();
}
