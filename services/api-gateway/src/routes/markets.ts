import { FastifyInstance } from 'fastify'

export default async function marketsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    return { message: 'Get markets' }
  })

  fastify.get('/:symbol', async (request, reply) => {
    return { message: 'Get market by symbol' }
  })
}

