// Configuration
export const config = {
  port: process.env.PORT || 8080,
  jwtSecret: process.env.JWT_SECRET || 'secret',
  engineUrl: process.env.ENGINE_URL || 'localhost:50051',
}

