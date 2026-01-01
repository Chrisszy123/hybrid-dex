import { FastifyInstance } from 'fastify'

export default async function tradesRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    return { message: 'Get trades' }
  })

  fastify.get('/:id', async (request, reply) => {
    return { message: 'Get trade by ID' }
  })
}

