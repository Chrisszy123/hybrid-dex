# Hybrid DEX - Quick Start Guide

## Prerequisites

- **Node.js** 20+
- **Rust** 1.70+ (with cargo)
- **Docker** & Docker Compose
- **PostgreSQL** 15+ (via Docker)
- **MetaMask** or compatible Web3 wallet

## Start the System (Local Development)

### 1. Start Infrastructure

```bash
# Start PostgreSQL and Redis
cd infra/docker
docker-compose up -d

# Verify services are running
docker ps
```

### 2. Start Matching Engine (Rust)

```bash
cd engine/matching-engine

# Build the engine
cargo build --release

# Run the engine
cargo run --release
# Or directly: ./target/release/matching-engine
```

The matching engine will:
- Start gRPC server on `0.0.0.0:50051`
- Load snapshot if exists
- Accept order submissions

### 3. Start API Gateway (Node.js)

```bash
cd services/api-gateway

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
PORT=8080
JWT_SECRET=your-secret-key-change-in-production
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hybriddex
DB_USER=postgres
DB_PASSWORD=postgres
ENGINE_URL=localhost:50051
EOF

# Start the gateway
npm run dev
```

The API gateway will:
- Initialize database schema
- Connect to matching engine via gRPC
- Start REST API on `http://localhost:8080`
- Start WebSocket server on `ws://localhost:8080/ws`

### 4. Deploy Smart Contracts (Optional)

```bash
cd contracts/exchange

# Install dependencies
npm install

# Start local blockchain (Hardhat)
npx hardhat node

# In another terminal, deploy contracts
npx hardhat run scripts/deploy.ts --network localhost
```

Save the contract addresses to your `.env` file.

### 5. Start Web Trader UI

```bash
cd apps/web-trader

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080/ws
EOF

# Start the UI
npm run dev
```

Open browser to `http://localhost:5173`

### 6. Start Admin Console

```bash
cd apps/admin-console

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:8080/api
EOF

# Start admin console
npm run dev
```

Open browser to `http://localhost:5174`

### 7. Run Market Maker (Optional - for demo)

```bash
cd scripts

# Install dependencies (if not already)
npm install

# Run market maker
npx tsx market-maker.ts
```

The market maker will:
- Generate continuous buy/sell orders
- Update quotes every 5 seconds
- Provide liquidity to the orderbook

## System Health Checks

### Check Matching Engine
```bash
# gRPC health check (requires grpcurl)
grpcurl -plaintext localhost:50051 list
```

### Check API Gateway
```bash
curl http://localhost:8080/health
```

### Check Database
```bash
docker exec -it postgres psql -U postgres -d hybriddex -c "SELECT COUNT(*) FROM orders;"
```

## Troubleshooting

### Matching Engine Won't Start
- Check if port 50051 is available: `lsof -i :50051`
- Verify Rust is installed: `rustc --version`
- Check logs for errors

### API Gateway Connection Error
- Verify PostgreSQL is running: `docker ps | grep postgres`
- Test database connection: `psql -h localhost -U postgres -d hybriddex`
- Ensure matching engine is running

### Frontend Can't Connect
- Check API is responding: `curl http://localhost:8080/health`
- Verify CORS is enabled in API gateway
- Check browser console for errors

### Market Maker Errors
- Ensure API gateway is running
- Check you have valid authentication
- Verify market exists

## Production Deployment

See [DEPLOYMENT.md](./docs/deployment.md) for production deployment guide including:
- Kubernetes manifests
- CI/CD pipelines
- Monitoring setup
- Security hardening
- Performance tuning
