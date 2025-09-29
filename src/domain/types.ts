export type SwapEvent = {
  signature: string
  userPubkey: string
  tokenIn: string
  tokenOut: string
  amountIn: bigint
  amountOut: bigint
  slot: number
  blockTime: Date
  route?: string
  raw?: unknown
}
