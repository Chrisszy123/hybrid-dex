use crate::engine::market::MarketRegistry;
use crate::models::order::Order;
use std::fs::File;
use std::io::{self, BufRead, BufReader};
use std::path::Path;

/// Replay events from a log file to reconstruct state
/// This is crucial for disaster recovery and audit compliance
pub fn replay_from_log(log_path: &Path) -> io::Result<MarketRegistry> {
    let mut registry = MarketRegistry::new();
    let file = File::open(log_path)?;
    let reader = BufReader::new(file);

    for (line_num, line) in reader.lines().enumerate() {
        let line = line?;
        if line.is_empty() {
            continue;
        }

        let order: Order = serde_json::from_str(&line)
            .map_err(|e| io::Error::new(
                io::ErrorKind::InvalidData,
                format!("Line {}: {}", line_num + 1, e)
            ))?;

        registry.submit(order);
    }

    tracing::info!("Replayed orders from log");
    Ok(registry)
}

/// Append an order to the replay log for durability
pub fn append_to_log(order: &Order, log_path: &Path) -> io::Result<()> {
    use std::fs::OpenOptions;
    use std::io::Write;

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)?;

    let json = serde_json::to_string(order)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;
    
    writeln!(file, "{}", json)?;
    file.sync_all()?; // Force flush to disk for durability
    
    Ok(())
}
