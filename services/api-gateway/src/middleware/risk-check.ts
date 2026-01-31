import { FastifyRequest, FastifyReply } from 'fastify'
import { query } from '../db/index.js'

/**
 * Risk Check Middleware
 * 
 * Prevents:
 * - Order sizes exceeding position limits
 * - Suspicious trading patterns
 * - Wash trading detection
 * - Self-trading prevention
 * 
 * PRODUCTION ENHANCEMENTS:
 * - Real-time margin calculation
 * - Portfolio risk limits (VaR, Greeks for options)
 * - Circuit breakers for extreme volatility
 * - Machine learning for fraud detection
 */

interface RiskLimits {
  maxOrderSize: number
  maxOpenOrders: number
  maxDailyVolume: number
}

const DEFAULT_LIMITS: RiskLimits = {
  maxOrderSize: 1000000, // $1M per order
  maxOpenOrders: 100,
  maxDailyVolume: 10000000 // $10M daily
}

export async function riskCheck(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const wallet = request.user?.wallet
  if (!wallet) {
    return reply.code(401).send({ error: 'Unauthorized' })
  }

  // Only check on order placement
  if (request.method !== 'POST' || !request.url.includes('/orders')) {
    return
  }

  const body = request.body as any
  const { price, quantity, market } = body

  if (!price || !quantity) {
    return reply.code(400).send({ error: 'Invalid order parameters' })
  }

  try {
    // Check 1: Order size limit
    const orderValue = BigInt(price) * BigInt(quantity)
    if (orderValue > BigInt(DEFAULT_LIMITS.maxOrderSize * 1e8)) {
      return reply.code(400).send({
        error: 'Order size exceeds limit',
        limit: DEFAULT_LIMITS.maxOrderSize
      })
    }

    // Check 2: Open orders limit
    const openOrders = await query(
      'SELECT COUNT(*) as count FROM orders WHERE wallet = $1 AND status = $2',
      [wallet, 'OPEN']
    )

    if (openOrders.rows[0].count >= DEFAULT_LIMITS.maxOpenOrders) {
      return reply.code(400).send({
        error: 'Too many open orders',
        limit: DEFAULT_LIMITS.maxOpenOrders
      })
    }

    // Check 3: Daily volume limit
    const dailyVolume = await query(
      `SELECT SUM(price::numeric * quantity::numeric) as volume
       FROM orders
       WHERE wallet = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
      [wallet]
    )

    const volumeUsed = BigInt(dailyVolume.rows[0].volume || 0)
    if (volumeUsed + orderValue > BigInt(DEFAULT_LIMITS.maxDailyVolume * 1e8)) {
      return reply.code(400).send({
        error: 'Daily volume limit exceeded',
        limit: DEFAULT_LIMITS.maxDailyVolume
      })
    }

    // Check 4: Self-trading prevention
    const opposingSide = body.side === 'BUY' ? 'SELL' : 'BUY'
    const opposingOrders = await query(
      `SELECT COUNT(*) as count FROM orders 
       WHERE wallet = $1 AND market = $2 AND side = $3 AND price = $4 AND status = $5`,
      [wallet, market, opposingSide, price, 'OPEN']
    )

    if (opposingOrders.rows[0].count > 0) {
      return reply.code(400).send({
        error: 'Self-trading not allowed',
        detail: 'You have opposing orders at the same price'
      })
    }

    console.log(`Risk check passed for ${wallet}`)
  } catch (error) {
    console.error('Risk check error:', error)
    return reply.code(500).send({ error: 'Risk check failed' })
  }
}

