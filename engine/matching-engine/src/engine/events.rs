use crate::models::trade::Trade;

#[derive(Debug)]
pub enum EngineEvent {
    TradeExecuted(Trade),
    OrderAdded,
    OrderCancelled,
}