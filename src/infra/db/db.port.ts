import { SwapEvent } from '#domain/types'

export interface DatabasePort {
  init(): Promise<void>
  upsertSwap(evt: SwapEvent): Promise<void>
  getCheckpoint(id: string): Promise<{ last_slot: number | null; last_signature: string | null } | null>
  setCheckpoint(id: string, data: { last_slot?: number; last_signature?: string }): Promise<void>
}
