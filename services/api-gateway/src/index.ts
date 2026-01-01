import { buildServer } from './server'

const start = async () => {
  const server = await buildServer()
  
  try {
    await server.listen({ port: 8080, host: '0.0.0.0' })
    console.log('API Gateway running on http://localhost:8080')
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()

