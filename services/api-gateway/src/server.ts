import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import websocket from '@fastify/websocket'
import { config } from './config/index.js'
import { authenticate } from './middleware/auth.js'
import { initDatabase } from './db/index.js'

export async function buildServer() {
  const server = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty'
      }
    },
  })

  // CORS configuration
  await server.register(cors, {
    origin: true,
    credentials: true
  })

  // JWT authentication
  await server.register(jwt, {
    secret: config.jwtSecret,
  })

  // Decorate server with authenticate method
  server.decorate('authenticate', authenticate)

  // WebSocket support
  await server.register(websocket, {
    options: {
      maxPayload: 1048576, // 1MB
      verifyClient: (info, next) => {
        // Add WebSocket authentication here if needed
        next(true)
      }
    }
  })

  // Initialize database
  try {
    await initDatabase()
    server.log.info('Database initialized')
  } catch (error) {
    server.log.error('Database initialization failed:', error)
    throw error
  }

  // Health check endpoint
  server.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() }
  })

  // Register REST routes
  await server.register(import('./routes/auth.js'), { prefix: '/api/auth' })
  await server.register(import('./routes/orders.js'), { prefix: '/api/orders' })
  await server.register(import('./routes/trades.js'), { prefix: '/api/trades' })
  await server.register(import('./routes/markets.js'), { prefix: '/api/markets' })
  await server.register(import('./routes/admin.js'), { prefix: '/api/admin' })

  // Register WebSocket routes
  await server.register(import('./ws/orderbook.js'), { prefix: '/ws' })
  await server.register(import('./ws/trades.js'), { prefix: '/ws' })

  return server
}

// Type augmentation for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authenticate
  }
}

