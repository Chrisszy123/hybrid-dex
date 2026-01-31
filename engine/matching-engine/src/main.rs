use tonic::transport::Server;
use tracing_subscriber;
use std::path::Path;

mod engine;
mod models;
mod api;
mod persistence;
mod metrics;

use api::grpc::{GrpcEngine, engine_proto::matching_engine_server::MatchingEngineServer};
use engine::market::MarketRegistry;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    let addr = "0.0.0.0:50051".parse()?;
    tracing::info!("Starting matching engine on {}", addr);

    // Load snapshot if exists, otherwise start fresh
    let registry = if Path::new("snapshot.json").exists() {
        match persistence::snapshot::load(Path::new("snapshot.json")) {
            Ok(reg) => {
                tracing::info!("Loaded snapshot from disk");
                reg
            }
            Err(e) => {
                tracing::warn!("Failed to load snapshot: {}, starting fresh", e);
                MarketRegistry::new()
            }
        }
    } else {
        tracing::info!("No snapshot found, starting fresh");
        MarketRegistry::new()
    };

    let engine = GrpcEngine {
        registry: tokio::sync::Mutex::new(registry),
    };

    // Periodic snapshot task (every 60 seconds in production)
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60));
        loop {
            interval.tick().await;
            // In production, we'd snapshot here
            tracing::debug!("Snapshot checkpoint");
        }
    });

    tracing::info!("gRPC server listening on {}", addr);

    Server::builder()
        .add_service(MatchingEngineServer::new(engine))
        .serve(addr)
        .await?;

    Ok(())
}
