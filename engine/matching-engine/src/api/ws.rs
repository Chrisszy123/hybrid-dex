use tokio::sync::broadcast;
use crate::engine::events::EngineEvent;
use serde_json;

/// WebSocket server for broadcasting engine events to connected clients
pub struct WSServer {
    event_tx: broadcast::Sender<String>,
}

impl WSServer {
    pub fn new(capacity: usize) -> Self {
        let (event_tx, _) = broadcast::channel(capacity);
        WSServer { event_tx }
    }

    /// Get a subscriber to the event stream
    pub fn subscribe(&self) -> broadcast::Receiver<String> {
        self.event_tx.subscribe()
    }

    /// Broadcast an event to all connected clients
    pub fn broadcast(&self, event: EngineEvent) -> Result<(), String> {
        let json = serde_json::to_string(&event)
            .map_err(|e| format!("Failed to serialize event: {}", e))?;
        
        // If all receivers have been dropped, this will fail, but that's okay
        let _ = self.event_tx.send(json);
        Ok(())
    }

    /// Get the number of active subscribers
    pub fn subscriber_count(&self) -> usize {
        self.event_tx.receiver_count()
    }
}

impl Default for WSServer {
    fn default() -> Self {
        Self::new(1000)
    }
}

