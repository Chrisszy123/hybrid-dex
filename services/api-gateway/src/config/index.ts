import 'dotenv/config'

export const config = {
  port: parseInt(process.env.PORT || '8080'),
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  engineUrl: process.env.ENGINE_URL || 'localhost:50051',
  
  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'hybriddex',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  // Blockchain configuration
  blockchain: {
    rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
    exchangeAddress: process.env.EXCHANGE_ADDRESS || '',
    vaultAddress: process.env.VAULT_ADDRESS || '',
    settlementAddress: process.env.SETTLEMENT_ADDRESS || '',
  },

  // Rate limiting
  rateLimit: {
    max: 100,
    timeWindow: '1 minute'
  }
}

