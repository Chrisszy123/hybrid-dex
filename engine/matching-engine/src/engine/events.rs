use crate::models::trade::Trade;
use serde::{Serialize, Deserialize};
use uuid::Uuid;

/// Events emitted by the matching engine for real-time streaming to clients
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EngineEvent {
    TradeExecuted {
        trade: Trade,
        timestamp: u64,
    },
    OrderAdded {
        order_id: Uuid,
        market: String,
        timestamp: u64,
    },
    OrderCancelled {
        order_id: Uuid,
        market: String,
        timestamp: u64,
    },
    OrderReplaced {
        old_order_id: Uuid,
        new_order_id: Uuid,
        market: String,
        timestamp: u64,
    },
}

impl EngineEvent {
    pub fn trade_executed(trade: Trade) -> Self {
        Self::TradeExecuted {
            trade,
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
        }
    }

    pub fn order_added(order_id: Uuid, market: String) -> Self {
        Self::OrderAdded {
            order_id,
            market,
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
        }
    }

    pub fn order_cancelled(order_id: Uuid, market: String) -> Self {
        Self::OrderCancelled {
            order_id,
            market,
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
        }
    }

    pub fn order_replaced(old_order_id: Uuid, new_order_id: Uuid, market: String) -> Self {
        Self::OrderReplaced {
            old_order_id,
            new_order_id,
            market,
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
        }
    }
}