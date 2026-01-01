use tonic::transport::Server;
use api::grpc::{GrpcEngine, engine_proto::matching_engine_server::MatchingEngineServer};

mod engine;
mod models;
mod api;

#[tokio::main]
async fn main() {
    let addr = "0.0.0.0:50051".parse().unwrap();

    let engine = GrpcEngine::default();

    Server::builder()
        .add_service(MatchingEngineServer::new(engine))
        .serve(addr)
        .await
        .unwrap();
}
