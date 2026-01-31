import { FastifyInstance } from 'fastify'
import { getNonce, verifyWalletSignature } from '../middleware/auth.js'

export default async function authRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/auth/nonce/:wallet
   * Get a nonce for wallet authentication
   */
  fastify.get<{ Params: { wallet: string } }>('/nonce/:wallet', async (request, reply) => {
    const { wallet } = request.params
    
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return reply.code(400).send({ error: 'Invalid wallet address' })
    }

    const nonce = await getNonce(wallet)
    return { nonce, message: `Sign this message to authenticate: ${nonce}` }
  })

  /**
   * POST /api/auth/login
   * Authenticate with wallet signature
   */
  fastify.post<{
    Body: { wallet: string; signature: string; message: string }
  }>('/login', async (request, reply) => {
    const { wallet, signature, message } = request.body

    if (!wallet || !signature || !message) {
      return reply.code(400).send({ error: 'Missing required fields' })
    }

    // Verify signature
    const isValid = await verifyWalletSignature(wallet, signature, message)
    
    if (!isValid) {
      return reply.code(401).send({ error: 'Invalid signature' })
    }

    // Generate JWT token
    const token = fastify.jwt.sign(
      { wallet: wallet.toLowerCase() },
      { expiresIn: '24h' }
    )

    return { token, wallet: wallet.toLowerCase() }
  })

  /**
   * GET /api/auth/me
   * Get current user info
   */
  fastify.get('/me', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user
    return { wallet: user?.wallet }
  })
}

