// Fastify read-only API
import Fastify from 'fastify'
import type { DatabasePort } from '../db/db.port'
import { env } from '../../config'

export function startApi(db: DatabasePort) {
  const app = Fastify({ logger: false })

  app.get('/health', async () => ({ ok: true }))

  app.listen({ port: env.server.port, host: '0.0.0.0' })
}
