import pg from 'pg'
import { config } from '../config/index.js'

const { Pool } = pg

export const pool = new Pool(config.database)

// Test connection
pool.on('connect', () => {
  console.log('Database connected')
})

pool.on('error', (err) => {
  console.error('Database error:', err)
})

export const query = async (text: string, params?: any[]) => {
  const start = Date.now()
  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start
    console.log('Query executed', { text, duration, rows: result.rowCount })
    return result
  } catch (error) {
    console.error('Query error:', error)
    throw error
  }
}

// Initialize database schema
export async function initDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(42) UNIQUE NOT NULL,
      nonce TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY,
      market VARCHAR(20) NOT NULL,
      wallet VARCHAR(42) NOT NULL,
      side VARCHAR(4) NOT NULL,
      price BIGINT NOT NULL,
      quantity BIGINT NOT NULL,
      filled BIGINT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'OPEN',
      timestamp BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS trades (
      id SERIAL PRIMARY KEY,
      market VARCHAR(20) NOT NULL,
      buy_order UUID NOT NULL,
      sell_order UUID NOT NULL,
      price BIGINT NOT NULL,
      quantity BIGINT NOT NULL,
      sequence BIGINT NOT NULL,
      settled BOOLEAN DEFAULT FALSE,
      settlement_tx VARCHAR(66),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(market, sequence)
    );
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS balances (
      wallet VARCHAR(42) NOT NULL,
      token VARCHAR(42) NOT NULL,
      available BIGINT NOT NULL DEFAULT 0,
      locked BIGINT NOT NULL DEFAULT 0,
      PRIMARY KEY (wallet, token)
    );
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS settlements (
      id SERIAL PRIMARY KEY,
      trade_id INTEGER REFERENCES trades(id),
      tx_hash VARCHAR(66) NOT NULL,
      block_number BIGINT,
      status VARCHAR(20) DEFAULT 'PENDING',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)

  await query(`
    CREATE INDEX IF NOT EXISTS idx_orders_wallet ON orders(wallet);
  `)

  await query(`
    CREATE INDEX IF NOT EXISTS idx_trades_market ON trades(market);
  `)

  await query(`
    CREATE INDEX IF NOT EXISTS idx_balances_wallet ON balances(wallet);
  `)

  console.log('Database schema initialized')
}

