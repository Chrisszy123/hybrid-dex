use tonic::{Request, Response, Status};
use uuid::Uuid;

use crate::engine::market::MarketRegistry;
use crate::models::{order::Order, side::Side, price::Price};

pub mod engine_proto {
    tonic::include_proto!("engine");
}

use engine_proto::matching_engine_server::MatchingEngine;
use engine_proto::*;

#[derive(Default)]
pub struct GrpcEngine {
    pub registry: tokio::sync::Mutex<MarketRegistry>,
}

#[tonic::async_trait]
impl MatchingEngine for GrpcEngine {
    async fn submit_order(
        &self,
        request: Request<SubmitOrderRequest>,
    ) -> Result<Response<SubmitOrderResponse>, Status> {
        let input = request.into_inner().order.unwrap();

        let order = Order {
            id: Uuid::parse_str(&input.id).unwrap(),
            market: input.market,
            wallet: input.wallet,
            side: if input.side == "BUY" { Side::Buy } else { Side::Sell },
            price: Price(input.price),
            quantity: input.quantity,
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
        };

        let mut registry = self.registry.lock().await;
        let trades = registry.submit(order);

        Ok(Response::new(SubmitOrderResponse {
            trades: trades.into_iter().map(|t| Trade {
                market: t.market,
                buy_order: t.buy_order.to_string(),
                sell_order: t.sell_order.to_string(),
                price: t.price.0,
                quantity: t.quantity,
                sequence: t.sequence,
            }).collect(),
        }))
    }
}