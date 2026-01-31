import { FastifyInstance } from 'fastify'
import { requireAdmin } from '../middleware/auth.js'
import { query } from '../db/index.js'
import { SettlementService } from '../services/settlement.js'

const settlementService = new SettlementService()

export default async function adminRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/admin/stats
   * System-wide statistics
   */
  fastify.get('/stats', {
    onRequest: [fastify.authenticate, requireAdmin]
  }, async (request, reply) => {
    const ordersResult = await query('SELECT COUNT(*) as count FROM orders')
    const tradesResult = await query('SELECT COUNT(*) as count FROM trades')
    const usersResult = await query('SELECT COUNT(*) as count FROM users')
    const volumeResult = await query(
      'SELECT SUM(price::numeric * quantity::numeric) as volume FROM trades WHERE created_at > NOW() - INTERVAL \'24 hours\''
    )

    return {
      totalOrders: ordersResult.rows[0].count,
      totalTrades: tradesResult.rows[0].count,
      totalUsers: usersResult.rows[0].count,
      volume24h: volumeResult.rows[0].volume || '0'
    }
  })

  /**
   * GET /api/admin/settlements
   * List settlements and their status
   */
  fastify.get('/settlements', {
    onRequest: [fastify.authenticate, requireAdmin]
  }, async (request, reply) => {
    const result = await query(
      `SELECT s.*, t.market, t.price, t.quantity
       FROM settlements s
       JOIN trades t ON t.id = s.trade_id
       ORDER BY s.created_at DESC
       LIMIT 100`
    )

    return { settlements: result.rows }
  })

  /**
   * POST /api/admin/settle
   * Trigger batch settlement of trades
   */
  fastify.post<{
    Body: { tradeIds: number[] }
  }>('/settle', {
    onRequest: [fastify.authenticate, requireAdmin]
  }, async (request, reply) => {
    const { tradeIds } = request.body

    if (!Array.isArray(tradeIds) || tradeIds.length === 0) {
      return reply.code(400).send({ error: 'Invalid trade IDs' })
    }

    try {
      const txHash = await settlementService.batchSettleTrades(tradeIds)
      return { success: true, txHash }
    } catch (error: any) {
      fastify.log.error('Settlement failed:', error)
      return reply.code(500).send({ error: 'Settlement failed', details: error.message })
    }
  })

  /**
   * POST /api/admin/reorg/:blockNumber
   * Handle blockchain reorganization
   */
  fastify.post<{
    Params: { blockNumber: string }
  }>('/reorg/:blockNumber', {
    onRequest: [fastify.authenticate, requireAdmin]
  }, async (request, reply) => {
    const blockNumber = parseInt(request.params.blockNumber)

    if (isNaN(blockNumber)) {
      return reply.code(400).send({ error: 'Invalid block number' })
    }

    try {
      await settlementService.handleReorg(blockNumber)
      return { success: true, message: 'Reorg handled' }
    } catch (error: any) {
      fastify.log.error('Reorg handling failed:', error)
      return reply.code(500).send({ error: 'Reorg handling failed', details: error.message })
    }
  })

  /**
   * GET /api/admin/users
   * List all users
   */
  fastify.get('/users', {
    onRequest: [fastify.authenticate, requireAdmin]
  }, async (request, reply) => {
    const result = await query(
      `SELECT u.wallet_address, u.created_at,
              COUNT(DISTINCT o.id) as order_count,
              COUNT(DISTINCT t.id) as trade_count
       FROM users u
       LEFT JOIN orders o ON o.wallet = u.wallet_address
       LEFT JOIN trades t ON EXISTS (
         SELECT 1 FROM orders o2 
         WHERE (o2.id = t.buy_order OR o2.id = t.sell_order) 
         AND o2.wallet = u.wallet_address
       )
       GROUP BY u.wallet_address, u.created_at
       ORDER BY u.created_at DESC
       LIMIT 100`
    )

    return { users: result.rows }
  })

  /**
   * GET /api/admin/health
   * System health check
   */
  fastify.get('/health', {
    onRequest: [fastify.authenticate, requireAdmin]
  }, async (request, reply) => {
    const dbHealth = await query('SELECT NOW()').then(() => true).catch(() => false)
    
    return {
      status: dbHealth ? 'healthy' : 'unhealthy',
      database: dbHealth ? 'connected' : 'disconnected',
      timestamp: Date.now()
    }
  })
}

