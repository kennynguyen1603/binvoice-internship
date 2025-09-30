import { prisma } from '../db/client'
import type { PrismaTransaction } from '../db/types'

/**
 * Generate invoice number theo format: INV-{YYYY}-{seq.padStart(6,'0')}
 * Sử dụng transaction để đảm bảo atomic operation
 */
export async function generateInvoiceNumber(): Promise<string> {
  const currentYear = new Date().getFullYear()

  return prisma.$transaction(async (tx: PrismaTransaction) => {
    // Upsert để đảm bảo record cho year hiện tại tồn tại
    const seq = await tx.invoiceNumberSeq.upsert({
      where: { year: currentYear },
      update: {
        lastValue: { increment: 1 }
      },
      create: {
        year: currentYear,
        lastValue: 1
      }
    })

    // Format số hoá đơn: INV-YYYY-000001
    const invoiceNumber = `INV-${currentYear}-${seq.lastValue.toString().padStart(6, '0')}`

    return invoiceNumber
  })
}

/**
 * Parse invoice number để lấy year và sequence
 */
export function parseInvoiceNumber(number: string): { year: number; sequence: number } | null {
  const match = number.match(/^INV-(\d{4})-(\d{6})$/)
  if (!match) {
    return null
  }

  return {
    year: parseInt(match[1], 10),
    sequence: parseInt(match[2], 10)
  }
}
