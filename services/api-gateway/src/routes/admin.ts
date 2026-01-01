import { FastifyInstance } from 'fastify'

export default async function adminRoutes(fastify: FastifyInstance) {
  fastify.get('/stats', async (request, reply) => {
    return { message: 'Admin stats' }
  })
}

