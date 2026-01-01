// Event types
#[derive(Debug, Clone)]
pub enum EngineEvent {
    OrderMatched,
    OrderPlaced,
    OrderCancelled,
}

