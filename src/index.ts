import { app } from '#app'
import env from '#config/env/envConfig'

const startServer = async () => {
  try {
    const port = env.server.port || 8080
    const host = env.server.host || 'localhost'

    app.listen(port, host, () => {
      console.log(`🚀 BINVOICE API Server running at http://${host}:${port}`)
      console.log(`📝 Environment: ${env.nodeEnv}`)
    })

    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down server...')
      process.exit(0)
    })

    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down server...')
      process.exit(0)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
