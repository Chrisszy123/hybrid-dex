import { FastifyInstance } from 'fastify'
import { query } from '../db/index.js'

/**
 * WebSocket endpoint for real-time orderbook updates
 * Clients receive snapshots and incremental updates
 */
export default async function orderbookWS(fastify: FastifyInstance) {
  fastify.get<{ Params: { symbol: string } }>('/orderbook/:symbol', { 
    websocket: true 
  }, (connection, req) => {
    const { symbol } = req.params

    let isAlive = true
    let updateInterval: NodeJS.Timeout

    connection.socket.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString())

        if (data.type === 'subscribe') {
          // Send initial orderbook snapshot
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
            .map(r => [r.price, r.total_quantity])
          
          const asks = ordersResult.rows
            .filter(r => r.side === 'SELL')
            .map(r => [r.price, r.total_quantity])
            .reverse()

          connection.socket.send(JSON.stringify({
            type: 'snapshot',
            market: symbol,
            bids,
            asks,
            timestamp: Date.now()
          }))

          // Start sending periodic updates
          updateInterval = setInterval(async () => {
            if (!isAlive) {
              clearInterval(updateInterval)
              return
            }

            try {
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
                .map(r => [r.price, r.total_quantity])
              
              const asks = ordersResult.rows
                .filter(r => r.side === 'SELL')
                .map(r => [r.price, r.total_quantity])
                .reverse()

              connection.socket.send(JSON.stringify({
                type: 'update',
                market: symbol,
                bids,
                asks,
                timestamp: Date.now()
              }))
            } catch (error) {
              fastify.log.error('Orderbook update error:', error)
            }
          }, 1000) // Update every second
        }

        if (data.type === 'ping') {
          connection.socket.send(JSON.stringify({ type: 'pong' }))
        }
      } catch (error) {
        fastify.log.error('WebSocket message error:', error)
      }
    })

    connection.socket.on('close', () => {
      isAlive = false
      if (updateInterval) {
        clearInterval(updateInterval)
      }
    })

    connection.socket.on('error', (error) => {
      fastify.log.error('WebSocket error:', error)
      isAlive = false
    })
  })
}

