import type { DatabasePort } from './db.port'
import type { SwapEvent } from '../../domain/types'

export class DrizzleAdapter implements DatabasePort {
  // construct with drizzle db instance
  constructor(/* pass drizzle db here */) {}
  async init() {
    /* await db.select({1:1}); */
  }
  async upsertSwap(evt: SwapEvent) {
    /* implement */
  }
  async getCheckpoint(id: string) {
    return null
  }
  async setCheckpoint(id: string, data: { last_slot?: number; last_signature?: string }) {
    /* implement */
  }
}
