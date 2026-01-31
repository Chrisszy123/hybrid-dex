import { FastifyInstance } from 'fastify'
import { query } from '../db/index.js'

/**
 * WebSocket endpoint for real-time trade stream
 * Clients receive trades as they are executed
 */
export default async function tradesWS(fastify: FastifyInstance) {
  fastify.get<{ Params: { symbol: string } }>('/trades/:symbol', { 
    websocket: true 
  }, (connection, req) => {
    const { symbol } = req.params

    let isAlive = true
    let lastSequence = 0
    let pollInterval: NodeJS.Timeout

    connection.socket.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString())

        if (data.type === 'subscribe') {
          // Send recent trades
          const result = await query(
            `SELECT * FROM trades WHERE market = $1 ORDER BY sequence DESC LIMIT 50`,
            [symbol]
          )

          for (const trade of result.rows.reverse()) {
            connection.socket.send(JSON.stringify({
              type: 'trade',
              trade,
              timestamp: Date.now()
            }))

            if (trade.sequence > lastSequence) {
              lastSequence = trade.sequence
            }
          }

          // Poll for new trades
          pollInterval = setInterval(async () => {
            if (!isAlive) {
              clearInterval(pollInterval)
              return
            }

            try {
              const newTrades = await query(
                `SELECT * FROM trades 
                 WHERE market = $1 AND sequence > $2 
                 ORDER BY sequence ASC`,
                [symbol, lastSequence]
              )

              for (const trade of newTrades.rows) {
                connection.socket.send(JSON.stringify({
                  type: 'trade',
                  trade,
                  timestamp: Date.now()
                }))

                lastSequence = trade.sequence
              }
            } catch (error) {
              fastify.log.error('Trade poll error:', error)
            }
          }, 500) // Poll every 500ms
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
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    })

    connection.socket.on('error', (error) => {
      fastify.log.error('WebSocket error:', error)
      isAlive = false
    })
  })
}

