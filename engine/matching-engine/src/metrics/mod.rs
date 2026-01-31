use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use serde::{Serialize, Deserialize};

/// Production-grade metrics for monitoring exchange health
/// In production, these would be exported to Prometheus/Datadog
#[derive(Clone)]
pub struct Metrics {
    pub orders_submitted: Arc<AtomicU64>,
    pub orders_cancelled: Arc<AtomicU64>,
    pub trades_executed: Arc<AtomicU64>,
    pub total_volume: Arc<AtomicU64>,
    pub orderbook_depth: Arc<AtomicU64>,
}

#[derive(Serialize, Deserialize)]
pub struct MetricsSnapshot {
    pub orders_submitted: u64,
    pub orders_cancelled: u64,
    pub trades_executed: u64,
    pub total_volume: u64,
    pub orderbook_depth: u64,
}

impl Metrics {
    pub fn new() -> Self {
        Self {
            orders_submitted: Arc::new(AtomicU64::new(0)),
            orders_cancelled: Arc::new(AtomicU64::new(0)),
            trades_executed: Arc::new(AtomicU64::new(0)),
            total_volume: Arc::new(AtomicU64::new(0)),
            orderbook_depth: Arc::new(AtomicU64::new(0)),
        }
    }

    pub fn record_order_submitted(&self) {
        self.orders_submitted.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_order_cancelled(&self) {
        self.orders_cancelled.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_trade(&self, volume: u64) {
        self.trades_executed.fetch_add(1, Ordering::Relaxed);
        self.total_volume.fetch_add(volume, Ordering::Relaxed);
    }

    pub fn snapshot(&self) -> MetricsSnapshot {
        MetricsSnapshot {
            orders_submitted: self.orders_submitted.load(Ordering::Relaxed),
            orders_cancelled: self.orders_cancelled.load(Ordering::Relaxed),
            trades_executed: self.trades_executed.load(Ordering::Relaxed),
            total_volume: self.total_volume.load(Ordering::Relaxed),
            orderbook_depth: self.orderbook_depth.load(Ordering::Relaxed),
        }
    }
}

impl Default for Metrics {
    fn default() -> Self {
        Self::new()
    }
}

