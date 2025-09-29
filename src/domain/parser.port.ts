import type { ParsedTransactionWithMeta } from '@solana/web3.js'
import type { SwapEvent } from './types'

export interface ParserPort {
  parse(tx: ParsedTransactionWithMeta): SwapEvent | null // return null if not a swap
}
