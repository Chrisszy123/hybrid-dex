import { FastifyInstance } from 'fastify'
import { query } from '../db/index.js'

/**
 * Markets configuration and orderbook data
 * In production, this would be dynamically configured from database
 */
const MARKETS = [
  {
    symbol: 'BTC-USD',
    baseAsset: 'BTC',
    quoteAsset: 'USD',
    tickSize: '1',
    minQuantity: '0.0001',
    status: 'ACTIVE'
  },
  {
    symbol: 'ETH-USD',
    baseAsset: 'ETH',
    quoteAsset: 'USD',
    tickSize: '0.01',
    minQuantity: '0.001',
    status: 'ACTIVE'
  }
]

export default async function marketsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/markets
   * List all available markets
   */
  fastify.get('/', async (request, reply) => {
    return { markets: MARKETS }
  })

  /**
   * GET /api/markets/:symbol
   * Get market details and orderbook snapshot
   */
  fastify.get<{ Params: { symbol: string } }>('/:symbol', async (request, reply) => {
    const { symbol } = request.params

    const market = MARKETS.find(m => m.symbol === symbol)
    if (!market) {
      return reply.code(404).send({ error: 'Market not found' })
    }

    // Get recent trades for this market
    const tradesResult = await query(
      `SELECT * FROM trades WHERE market = $1 ORDER BY sequence DESC LIMIT 50`,
      [symbol]
    )

    // Get open orders to construct orderbook
    const ordersResult = await query(
      `SELECT side, price, SUM(quantity - filled) as total_quantity
       FROM orders
       WHERE market = $1 AND status = 'OPEN'
       GROUP BY side, price
       ORDER BY price DESC`,
      [symbol]
    )

    const bids = ordersResult.rows
      .filter(r => r.side === 'BUY')
      .map(r => ({ price: r.price, quantity: r.total_quantity }))
    
    const asks = ordersResult.rows
      .filter(r => r.side === 'SELL')
      .map(r => ({ price: r.price, quantity: r.total_quantity }))

    return {
      market,
      orderbook: { bids, asks },
      recentTrades: tradesResult.rows
    }
  })

  /**
   * GET /api/markets/:symbol/trades
   * Get trade history for a market
   */
  fastify.get<{
    Params: { symbol: string }
    Querystring: { limit?: string }
  }>('/:symbol/trades', async (request, reply) => {
    const { symbol } = request.params
    const limit = Math.min(parseInt(request.query.limit || '100'), 500)

    const result = await query(
      `SELECT * FROM trades WHERE market = $1 ORDER BY sequence DESC LIMIT $2`,
      [symbol, limit]
    )

    return { trades: result.rows }
  })

  /**
   * GET /api/markets/:symbol/orderbook
   * Get current orderbook state
   */
  fastify.get<{ Params: { symbol: string } }>('/:symbol/orderbook', async (request, reply) => {
    const { symbol } = request.params

    const ordersResult = await query(
      `SELECT side, price, SUM(quantity - filled) as total_quantity
       FROM orders
       WHERE market = $1 AND status = 'OPEN'
       GROUP BY side, price
       ORDER BY price DESC`,
      [symbol]
    )

    const bids = ordersResult.rows
      .filter(r => r.side === 'BUY')
      .map(r => ({ price: r.price, quantity: r.total_quantity }))
    
    const asks = ordersResult.rows
      .filter(r => r.side === 'SELL')
      .map(r => ({ price: r.price, quantity: r.total_quantity }))
      .reverse()

    return { bids, asks, timestamp: Date.now() }
  })
}

