import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import websocket from '@fastify/websocket'

export async function buildServer() {
  const server = Fastify({
    logger: true,
  })

  await server.register(cors, {
    origin: true,
  })

  await server.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-secret-key',
  })

  await server.register(websocket)

  // Register routes
  await server.register(import('./routes/auth'), { prefix: '/api/auth' })
  await server.register(import('./routes/orders'), { prefix: '/api/orders' })
  await server.register(import('./routes/trades'), { prefix: '/api/trades' })
  await server.register(import('./routes/markets'), { prefix: '/api/markets' })
  await server.register(import('./routes/admin'), { prefix: '/api/admin' })

  // Register WebSocket routes
  await server.register(import('./ws/orderbook'), { prefix: '/ws' })
  await server.register(import('./ws/trades'), { prefix: '/ws' })

  return server
}

