import { FastifyInstance } from 'fastify'
import { query } from '../db/index.js'

export default async function tradesRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/trades
   * Get user's trade history
   */
  fastify.get('/', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const wallet = request.user!.wallet

    const result = await query(
      `SELECT t.* FROM trades t
       JOIN orders o ON (o.id = t.buy_order OR o.id = t.sell_order)
       WHERE o.wallet = $1
       ORDER BY t.created_at DESC
       LIMIT 100`,
      [wallet]
    )

    return { trades: result.rows }
  })

  /**
   * GET /api/trades/:id
   * Get specific trade details
   */
  fastify.get<{ Params: { id: string } }>('/:id', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { id } = request.params
    const wallet = request.user!.wallet

    const result = await query(
      `SELECT t.* FROM trades t
       JOIN orders o ON (o.id = t.buy_order OR o.id = t.sell_order)
       WHERE t.id = $1 AND o.wallet = $2`,
      [id, wallet]
    )

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Trade not found' })
    }

    return result.rows[0]
  })
}

