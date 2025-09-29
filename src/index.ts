import { startRealtimeListener } from '#app/listener.realtime'
import { runBackfill } from '#app/worker.backfill'
import { startParserWorkers } from '#app/worker.parser'
import { startWriterWorker } from '#app/worker.writer'
import env from '#config/env'
import { PgAdapter } from '#infra/db/pg.adapter'
import { startApi } from '#infra/http/api'
import { logger } from '#utils/logger'

async function main() {
  const db = new PgAdapter()
  await db.init()

  startApi(db)

  startWriterWorker(db)
  startParserWorkers()

  if (env.indexer.realtimeEnabled) {
    await startRealtimeListener()
  }

  if (env.indexer.backfillEnabled) {
    await runBackfill(env.solana.programId)
  }

  logger.info('Indexer up')
}

main().catch((err) => {
  logger.error(err)
  process.exit(1)
})
