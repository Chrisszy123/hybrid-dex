import { FastifyRequest, FastifyReply } from 'fastify'
import { ethers } from 'ethers'
import { query } from '../db/index.js'

/**
 * JWT authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const payload = await request.jwtVerify() as any
    
    // Attach wallet address to request for downstream use
    request.user = {
      wallet: payload.wallet,
      iat: payload.iat
    }
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' })
  }
}

/**
 * Verify wallet signature for authentication
 * This ensures the user owns the private key for the wallet address
 */
export async function verifyWalletSignature(
  wallet: string,
  signature: string,
  message: string
): Promise<boolean> {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature)
    return recoveredAddress.toLowerCase() === wallet.toLowerCase()
  } catch (error) {
    console.error('Signature verification failed:', error)
    return false
  }
}

/**
 * Get or create nonce for wallet authentication
 */
export async function getNonce(wallet: string): Promise<string> {
  const result = await query(
    'SELECT nonce FROM users WHERE wallet_address = $1',
    [wallet.toLowerCase()]
  )

  if (result.rows.length > 0) {
    return result.rows[0].nonce
  }

  // Generate new nonce
  const nonce = ethers.hexlify(ethers.randomBytes(32))
  
  await query(
    'INSERT INTO users (wallet_address, nonce) VALUES ($1, $2) ON CONFLICT (wallet_address) DO UPDATE SET nonce = $2',
    [wallet.toLowerCase(), nonce]
  )

  return nonce
}

/**
 * Admin role check middleware
 * In production, this would check against a role-based access control system
 */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as any
  if (!user) {
    return reply.code(401).send({ error: 'Unauthorized' })
  }

  // In production, check against admin list in database
  const ADMIN_WALLETS = process.env.ADMIN_WALLETS?.split(',') || []
  
  if (!ADMIN_WALLETS.includes(user.wallet.toLowerCase())) {
    return reply.code(403).send({ error: 'Forbidden' })
  }
}

// Extend Fastify request type
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      wallet: string
      iat: number
    }
  }
}

