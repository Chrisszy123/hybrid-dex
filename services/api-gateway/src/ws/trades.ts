import { FastifyInstance } from 'fastify'

export default async function tradesWS(fastify: FastifyInstance) {
  fastify.get('/trades/:symbol', { websocket: true }, (connection, req) => {
    connection.socket.on('message', (message) => {
      // Handle trades WebSocket messages
    })
  })
}

