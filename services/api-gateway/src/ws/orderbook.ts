import { FastifyInstance } from 'fastify'

export default async function orderbookWS(fastify: FastifyInstance) {
  fastify.get('/orderbook/:symbol', { websocket: true }, (connection, req) => {
    connection.socket.on('message', (message) => {
      // Handle orderbook WebSocket messages
    })
  })
}

