import { DatabasePort } from '#infra/db/db.port'

export async function getSlotCheckpoint(db: DatabasePort, id: 'realtime' | 'backfill') {
  const cp = await db.getCheckpoint(id)
  return cp?.last_slot ?? null
}

export async function setSlotCheckpoint(db: DatabasePort, id: 'realtime' | 'backfill', slot: number) {
  await db.setCheckpoint(id, { last_slot: slot })
}
