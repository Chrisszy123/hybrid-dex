import { FastifyInstance } from 'fastify'

export default async function ordersRoutes(fastify: FastifyInstance) {
  fastify.post('/', async (request, reply) => {
    return { message: 'Create order' }
  })

  fastify.get('/:id', async (request, reply) => {
    return { message: 'Get order' }
  })

  fastify.delete('/:id', async (request, reply) => {
    return { message: 'Cancel order' }
  })

  fastify.post("/orders", async (req, reply) => {
    const trades = await submitOrder(req.body);
    return { trades };
  });
}


