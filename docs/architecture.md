# System Architecture

## Design Philosophy

Hybrid DEX follows the **"Fast Lane, Safe Lane"** pattern used by production exchanges:

- **Fast Lane**: Off-chain matching engine processes orders at microsecond latency
- **Safe Lane**: On-chain settlement provides cryptographic finality and custody

This mirrors real-world architectures:
- **Coinbase**: Off-chain matching, periodic settlement
- **dYdX**: StarkEx validium (off-chain computation, on-chain data)
- **Binance**: Centralized matching, proof-of-reserves

## System Overview

### Data Flow: Order Lifecycle

```
1. User signs order with wallet
      ↓
2. API Gateway validates & authenticates
      ↓
3. Risk engine checks limits
      ↓
4. Order sent to matching engine via gRPC
      ↓
5. Engine matches order against orderbook
      ↓
6. Trades emitted as events
      ↓
7. Trades persisted to PostgreSQL
      ↓
8. Trades batched and settled on-chain
      ↓
9. Users can withdraw from smart contract
```

### Component Deep Dive

## 1. Matching Engine (Rust)

**Responsibility**: Deterministic order matching

**Key Properties**:
- **Determinism**: Same inputs → same outputs (enables replay)
- **Price-Time Priority**: Best price gets filled first; ties broken by time
- **In-Memory**: No database I/O during matching (sub-millisecond latency)
- **Snapshot + Replay**: Crash recovery without full replay

**Data Structures**:
```rust
BTreeMap<Price, VecDeque<Order>>  // Sorted by price, FIFO within price
HashMap<OrderId, (Price, Side)>    // Fast lookup for cancellation
```

**Performance**:
- Order submission: ~50μs
- Order cancellation: ~20μs
- Snapshot save: ~100ms (once per minute)
- Replay: ~10ms per 1000 orders

**Why Rust?**
- Memory safety without garbage collection
- Zero-cost abstractions
- Predictable performance (no GC pauses)
- Fearless concurrency

## 2. API Gateway (Node.js + Fastify)

**Responsibility**: HTTP/WebSocket API, authentication, risk management

**Layers**:
1. **Authentication**: JWT + wallet signature verification
2. **Rate Limiting**: Per-user/IP limits (100 req/min)
3. **Risk Checks**: Position limits, self-trade prevention
4. **gRPC Bridge**: Translates REST → gRPC → Matching Engine
5. **WebSocket**: Real-time orderbook + trade streaming
6. **Settlement**: Batch trades for on-chain settlement

**Why Node.js?**
- Excellent async I/O for WebSockets
- Rich ecosystem (ethers.js, JWT libraries)
- Fast iteration for business logic

**Why Fastify?**
- 2x faster than Express
- Schema validation built-in
- WebSocket support
- Low overhead

## 3. Smart Contracts (Solidity)

**Responsibility**: Asset custody and settlement verification

### Vault Contract
```solidity
- Holds user deposits (ERC20 tokens)
- Only Settlement contract can transfer
- Users can deposit/withdraw anytime
```

### Settlement Contract
```solidity
- Receives trade batches from operator
- Verifies trade IDs are unique (replay protection)
- Calls Vault to transfer tokens
- Emits events for off-chain verification
```

### Exchange Contract
```solidity
- Coordinator and market registry
- Sets authorized operators
- Emergency pause functionality
```

**Security Features**:
1. **Deterministic Trade IDs**: `keccak256(market, buyOrder, sellOrder, sequence, price, qty)`
2. **Replay Protection**: Each trade ID can only be settled once
3. **Reentrancy Guards**: OpenZeppelin's ReentrancyGuard
4. **Access Control**: Only authorized operator can settle

## 4. Database (PostgreSQL)

**Schema**:
- **users**: Wallet addresses + nonces
- **orders**: All orders (open, filled, cancelled)
- **trades**: All executed trades
- **balances**: User balances per token
- **settlements**: Settlement transaction tracking

**Indexes**:
- `orders(wallet)` - Fast user order lookup
- `trades(market, sequence)` - Unique constraint, fast trade queries
- `balances(wallet, token)` - Primary key for balance lookups

**Partitioning Strategy** (for scale):
- Partition `trades` by date (30-day rolling window)
- Archive old data to cold storage

## 5. Frontend (React)

### Web Trader
- Wallet connection (MetaMask)
- Real-time orderbook display
- Order placement form
- Trade history
- WebSocket for live updates

### Admin Console
- System statistics dashboard
- Settlement monitoring
- User management
- Market configuration

## Communication Protocols

### REST API
```
POST /api/orders         - Submit order
GET  /api/orders         - List orders
DELETE /api/orders/:id   - Cancel order
GET  /api/markets/:id    - Get market data
```

### WebSocket
```
WS /ws/orderbook/:market - Real-time orderbook updates
WS /ws/trades/:market    - Real-time trade stream
```

### gRPC (Internal)
```proto
rpc SubmitOrder(Order) returns (Trades)
rpc CancelOrder(OrderId) returns (Success)
rpc ReplaceOrder(Order) returns (Trades)
```

## Failure Modes & Recovery

See [failure-modes.md](./failure-modes.md) for detailed analysis.

**Critical Path**:
1. Order submitted → persisted to DB → confirmed to user
2. If engine crashes: Load snapshot + replay from DB
3. If DB crashes: Orders in engine are lost, but no user funds at risk
4. If blockchain reorgs: Re-submit settlement transactions

## Performance Characteristics

| Operation | Latency | Throughput |
|-----------|---------|------------|
| Order submission | 5ms (p99) | 1,000 TPS |
| Order cancellation | 3ms (p99) | 2,000 TPS |
| WebSocket update | 50ms (p99) | N/A |
| Settlement | 15-60s | 1,000 trades/tx |

## Security Model

**Threat Model**:
- ✅ Malicious user trying to manipulate trades → Deterministic matching prevents
- ✅ Attacker replaying settlement → Trade IDs prevent
- ✅ Exchange operator stealing funds → Users retain custody in Vault
- ✅ DDoS attack → Rate limiting + auto-scaling
- ❌ Smart contract bug → Code audit required (not in scope)
- ❌ Validator collusion → Inherent blockchain risk

## Scalability

**Current Bottlenecks**:
1. Single matching engine instance (1k TPS)
2. Database writes (can batch)
3. Ethereum gas costs (can use L2)

**Scaling Path**:
- **10k TPS**: Shard by market (10 markets × 1k each)
- **100k TPS**: Optimize data structures, use L2
- **1M TPS**: Geographic distribution + CDC

See README.md for detailed scaling strategy.

## Comparison to Alternatives

| Feature | Hybrid DEX | Pure DEX (Uniswap) | CEX (Binance) |
|---------|-----------|-------------------|---------------|
| Latency | ~5ms | ~15s (block time) | ~1ms |
| Custody | Self-custodial | Self-custodial | Exchange-custodial |
| Throughput | 1k TPS | ~15 TPS | 1M+ TPS |
| Gas Cost | Batched ($0.01/trade) | Per-trade ($5-50) | None |
| Orderbook | Full orderbook | AMM (no orderbook) | Full orderbook |
| Matching | Price-time priority | Automated market making | Price-time priority |

**Best of Both Worlds**: CEX-like performance + DEX-like custody


