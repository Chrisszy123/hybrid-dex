# Hybrid DEX

A hybrid decentralized exchange platform combining off-chain matching with on-chain settlement.

## Architecture

- **Matching Engine**: Rust-based high-performance order matching engine
- **API Gateway**: Node.js Fastify service providing REST and WebSocket APIs
- **Smart Contracts**: Solidity contracts for settlement and asset management
- **Web Trader**: React-based trading interface
- **Admin Console**: Admin dashboard for operations and monitoring

## Getting Started

### Prerequisites

- Node.js 20+
- Rust 1.70+
- Docker & Docker Compose

### Setup

1. Install dependencies:
```bash
npm install
```

2. Start infrastructure:
```bash
docker-compose -f infra/docker/docker-compose.yml up -d
```

3. Start services:
```bash
npm run dev
```

## Project Structure

See the [architecture documentation](./docs/architecture.md) for detailed information.

