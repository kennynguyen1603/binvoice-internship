import { SwapEvent } from '#domain/types'
import { Pool } from 'pg'
import { DatabasePort } from './db.port'
import { env } from '#config'

export class PgAdapter implements DatabasePort {
  private pool = new Pool({ connectionString: env.db.url })

  async init() {
    await this.pool.query('select 1')
  }

  async upsertSwap(evt: SwapEvent) {
    const q = `
              INSERT INTO swaps(signature, user_pubkey, token_in, token_out, amount_in, amount_out, slot, block_time, route, raw)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
              ON CONFLICT (signature) DO NOTHING;
              `
    await this.pool.query(q, [
      evt.signature,
      evt.userPubkey,
      evt.tokenIn,
      evt.tokenOut,
      evt.amountIn.toString(),
      evt.amountOut.toString(),
      evt.slot,
      evt.blockTime.toISOString(),
      evt.route ?? null,
      JSON.stringify(evt.raw ?? null)
    ])
  }

  async getCheckpoint(id: string) {
    const { rows } = await this.pool.query('SELECT last_slot, last_signature FROM checkpoints WHERE id=$1', [id])
    return rows[0] ?? null
  }

  async setCheckpoint(id: string, data: { last_slot?: number; last_signature?: string }) {
    const { last_slot, last_signature } = data
    await this.pool.query(
      `INSERT INTO checkpoints(id, last_slot, last_signature)
        VALUES ($1,$2,$3)
        ON CONFLICT (id) DO UPDATE SET last_slot=COALESCE($2, checkpoints.last_slot), last_signature=COALESCE($3, checkpoints.last_signature), updated_at=now();`,
      [id, last_slot ?? null, last_signature ?? null]
    )
  }
}
