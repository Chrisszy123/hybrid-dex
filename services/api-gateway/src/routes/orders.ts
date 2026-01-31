import { FastifyInstance } from 'fastify'
import { submitOrder, cancelOrder, replaceOrder, Order } from '../services/matching.js'
import { query } from '../db/index.js'
import { v4 as uuidv4 } from 'uuid'

export default async function ordersRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/orders
   * Submit a new order to the matching engine
   */
  fastify.post<{
    Body: {
      market: string
      side: 'BUY' | 'SELL'
      price: string
      quantity: string
    }
  }>('/', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { market, side, price, quantity } = request.body
    const wallet = request.user!.wallet

    // Validation
    if (!market || !side || !price || !quantity) {
      return reply.code(400).send({ error: 'Missing required fields' })
    }

    if (side !== 'BUY' && side !== 'SELL') {
      return reply.code(400).send({ error: 'Invalid side' })
    }

    const priceNum = BigInt(price)
    const quantityNum = BigInt(quantity)

    if (priceNum <= 0 || quantityNum <= 0) {
      return reply.code(400).send({ error: 'Price and quantity must be positive' })
    }

    // Generate order ID
    const orderId = uuidv4()

    const order: Order = {
      id: orderId,
      market,
      wallet,
      side,
      price: price,
      quantity: quantity
    }

    try {
      // Submit to matching engine via gRPC
      const trades = await submitOrder(order)

      // Persist order to database
      await query(
        `INSERT INTO orders (id, market, wallet, side, price, quantity, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [orderId, market, wallet, side, price, quantity, Date.now()]
      )

      // Persist trades
      for (const trade of trades) {
        await query(
          `INSERT INTO trades (market, buy_order, sell_order, price, quantity, sequence)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (market, sequence) DO NOTHING`,
          [trade.market, trade.buy_order, trade.sell_order, trade.price, trade.quantity, trade.sequence]
        )
      }

      return { order: { id: orderId, ...order }, trades }
    } catch (error: any) {
      fastify.log.error('Order submission failed:', error)
      return reply.code(500).send({ error: 'Order submission failed', details: error.message })
    }
  })

  /**
   * GET /api/orders/:id
   * Get order details
   */
  fastify.get<{ Params: { id: string } }>('/:id', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { id } = request.params
    const wallet = request.user!.wallet

    const result = await query(
      'SELECT * FROM orders WHERE id = $1 AND wallet = $2',
      [id, wallet]
    )

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Order not found' })
    }

    return result.rows[0]
  })

  /**
   * GET /api/orders
   * List user's orders
   */
  fastify.get('/', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const wallet = request.user!.wallet

    const result = await query(
      'SELECT * FROM orders WHERE wallet = $1 ORDER BY created_at DESC LIMIT 100',
      [wallet]
    )

    return { orders: result.rows }
  })

  /**
   * DELETE /api/orders/:id
   * Cancel an order
   */
  fastify.delete<{ Params: { id: string } }>('/:id', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { id } = request.params
    const wallet = request.user!.wallet

    // Verify ownership
    const result = await query(
      'SELECT market FROM orders WHERE id = $1 AND wallet = $2 AND status = $3',
      [id, wallet, 'OPEN']
    )

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Order not found or already filled' })
    }

    const market = result.rows[0].market

    try {
      // Cancel in matching engine
      await cancelOrder(id, market)

      // Update database
      await query(
        'UPDATE orders SET status = $1 WHERE id = $2',
        ['CANCELLED', id]
      )

      return { success: true, message: 'Order cancelled' }
    } catch (error: any) {
      fastify.log.error('Order cancellation failed:', error)
      return reply.code(500).send({ error: 'Cancellation failed', details: error.message })
    }
  })

  /**
   * PUT /api/orders/:id
   * Replace an existing order (cancel + new order atomically)
   */
  fastify.put<{
    Params: { id: string }
    Body: { price: string; quantity: string }
  }>('/:id', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const { id } = request.params
    const { price, quantity } = request.body
    const wallet = request.user!.wallet

    // Verify ownership and get existing order
    const result = await query(
      'SELECT market, side FROM orders WHERE id = $1 AND wallet = $2 AND status = $3',
      [id, wallet, 'OPEN']
    )

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Order not found' })
    }

    const { market, side } = result.rows[0]

    const order: Order = {
      id, // Reuse same ID for replace
      market,
      wallet,
      side,
      price,
      quantity
    }

    try {
      const trades = await replaceOrder(order)

      // Update database
      await query(
        'UPDATE orders SET price = $1, quantity = $2 WHERE id = $3',
        [price, quantity, id]
      )

      return { order, trades }
    } catch (error: any) {
      fastify.log.error('Order replace failed:', error)
      return reply.code(500).send({ error: 'Replace failed', details: error.message })
    }
  })
}



