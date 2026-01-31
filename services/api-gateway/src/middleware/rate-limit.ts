import { FastifyRequest, FastifyReply } from 'fastify'

/**
 * Rate Limiting Middleware
 * 
 * PRODUCTION CONSIDERATIONS:
 * - Use Redis for distributed rate limiting in multi-instance deployments
 * - Implement sliding window algorithm for more accurate limiting
 * - Add different tiers for different user types (free, premium, market maker)
 * - Consider IP-based + wallet-based combined limits
 */

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

export function createRateLimiter(options: {
  windowMs: number
  max: number
}) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = request.user?.wallet || request.ip
    const now = Date.now()

    // Initialize or reset if window expired
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + options.windowMs
      }
      return
    }

    // Increment counter
    store[key].count++

    // Check if limit exceeded
    if (store[key].count > options.max) {
      return reply.code(429).send({
        error: 'Too many requests',
        retryAfter: Math.ceil((store[key].resetTime - now) / 1000)
      })
    }
  }
}

/**
 * Clean up expired entries periodically
 * In production, Redis TTL handles this automatically
 */
setInterval(() => {
  const now = Date.now()
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  }
}, 60000) // Clean every minute

export async function rateLimit(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Default rate limit
  return createRateLimiter({ windowMs: 60000, max: 100 })(request, reply)
}

