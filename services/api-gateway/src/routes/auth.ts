import { FastifyInstance } from 'fastify'

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/login', async (request, reply) => {
    return { message: 'Login endpoint' }
  })

  fastify.post('/register', async (request, reply) => {
    return { message: 'Register endpoint' }
  })
}

