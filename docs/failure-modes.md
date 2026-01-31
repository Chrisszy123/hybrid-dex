# Failure Modes & Resilience Strategies

## Critical Failure Modes

### 1. Matching Engine Crash
**Impact**: Orders cannot be matched, trades halt  
**Detection**: Health check endpoint timeout, gRPC connection loss  
**Mitigation**:
- Automatic restart via process manager (systemd, k8s)
- Load snapshot from disk to restore state
- Replay event log for recovery
- Failover to standby instance

**Recovery Time**: < 10 seconds

### 2. Database Failure
**Impact**: Cannot persist new orders/trades, API queries fail  
**Detection**: Connection pool exhaustion, query timeouts  
**Mitigation**:
- Use PostgreSQL replication (primary-replica)
- Circuit breaker pattern in API gateway
- Read from replica for read-only queries
- Queue writes to Redis for retry

**Recovery Time**: < 30 seconds (failover to replica)

### 3. Blockchain Reorg
**Impact**: Settled trades may be reverted  
**Detection**: Settlement transaction disappears, block hash changes  
**Mitigation**:
- Monitor for reorgs in settlement service
- Mark affected settlements as "REORGED"
- Automatically re-submit transactions
- Wait for deeper confirmations (12+ blocks)

**Recovery Time**: Automatic, transparent to users

### 4. WebSocket Connection Loss
**Impact**: Users don't receive real-time updates  
**Detection**: Client-side ping/pong timeout  
**Mitigation**:
- Automatic reconnection with exponential backoff
- Send snapshot on reconnect to sync state
- Clients gracefully degrade to polling

**Recovery Time**: < 5 seconds (client auto-reconnects)

### 5. Settlement Gas Spike
**Impact**: Settlement transactions fail or are delayed  
**Detection**: Transaction reverts with out-of-gas  
**Mitigation**:
- Dynamic gas price estimation
- Gas limit buffer (150% of estimate)
- Retry with higher gas price
- Alert ops team for manual intervention

**Recovery Time**: Minutes to hours (depending on network congestion)

### 6. API Gateway Overload
**Impact**: Requests timeout, degraded performance  
**Detection**: Response time > SLA, CPU > 80%  
**Mitigation**:
- Rate limiting per user/IP
- Load balancer distributes across instances
- Auto-scaling based on CPU/memory
- Graceful degradation (disable non-critical endpoints)

**Recovery Time**: < 60 seconds (auto-scale kicks in)

### 7. Order Book State Corruption
**Impact**: Incorrect matching, inconsistent state  
**Detection**: Assertion failures, sequence number gaps  
**Mitigation**:
- Deterministic replay from event log
- Snapshot + checkpointing every N operations
- Compare states across redundant instances
- Kill switch to halt trading

**Recovery Time**: 1-5 minutes (snapshot restore + replay)

### 8. DDoS Attack
**Impact**: Legitimate users cannot access system  
**Detection**: Traffic spike, high error rates  
**Mitigation**:
- CloudFlare/AWS Shield for L3/L4 protection
- Rate limiting at multiple layers
- CAPTCHA for suspicious traffic
- IP reputation scoring

**Recovery Time**: Ongoing (as long as attack persists)

## Consistency Guarantees

### Trade Execution
- **Atomicity**: Order matching is all-or-nothing within engine
- **Durability**: Trades persisted to DB before acknowledgment
- **Ordering**: Sequence numbers ensure deterministic ordering

### Settlement
- **Idempotency**: Each trade ID can only be settled once (replay protection)
- **Verification**: On-chain state checked against off-chain records
- **Finality**: Wait for N block confirmations before marking complete

## Monitoring & Alerting

### Key Metrics
- Order placement latency (p50, p99)
- Trade execution throughput (TPS)
- Database query latency
- WebSocket connection count
- gRPC request success rate
- Settlement transaction gas costs

### Alert Thresholds
- Order latency > 100ms: WARNING
- Trade TPS < 10: WARNING
- Database query time > 500ms: CRITICAL
- Settlement failure rate > 5%: CRITICAL
- API error rate > 1%: WARNING

### Dashboards
- Grafana for real-time metrics
- Kibana for log aggregation
- On-call rotation via PagerDuty

## Disaster Recovery

### Daily Operations
- Automated daily snapshots
- Event log retention: 90 days
- Database backups: hourly incremental, daily full

### Recovery Procedures
1. **Catastrophic Failure**: Restore from snapshot + replay events
2. **Data Corruption**: Compare against replica, restore corrupted tables
3. **Security Breach**: Rotate keys, audit logs, notify users

## Scale Considerations (100k TPS)

At 100,000 trades/second:
- **Matching Engine**: Shard by market, use lockless data structures
- **Database**: Use TimescaleDB for time-series data, partition by date
- **Settlement**: Batch 1000+ trades per transaction, use L2 (Optimism/Arbitrum)
- **API**: Horizontally scale gateway instances, use Redis for session state
- **WebSocket**: Dedicated WebSocket servers, use pub/sub pattern

**Estimated Infrastructure**:
- 50+ API gateway instances
- 10+ matching engine instances (sharded)
- 5+ PostgreSQL instances (primary + replicas)
- Redis cluster (16+ nodes)
- 100+ Gbps network bandwidth
