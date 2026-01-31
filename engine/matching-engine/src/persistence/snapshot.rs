use crate::engine::market::MarketRegistry;
use std::fs;
use std::path::Path;
use std::io;

/// Save a snapshot of the market registry to disk
/// This enables crash recovery and state reconstruction
pub fn save(registry: &MarketRegistry, path: &Path) -> io::Result<()> {
    let data = serde_json::to_string_pretty(registry)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;
    
    // Write atomically by using a temp file
    let temp_path = path.with_extension("tmp");
    fs::write(&temp_path, data)?;
    fs::rename(temp_path, path)?;
    
    tracing::info!("Snapshot saved to {:?}", path);
    Ok(())
}

/// Load a snapshot from disk
pub fn load(path: &Path) -> io::Result<MarketRegistry> {
    let data = fs::read_to_string(path)?;
    let registry = serde_json::from_str(&data)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;
    
    tracing::info!("Snapshot loaded from {:?}", path);
    Ok(registry)
}
