import { Decimal } from '@prisma/client/runtime/library'

export interface InvoiceItemInput {
  description: string
  quantity: number
  unitPrice: number
  taxRate: number // percentage (0-100)
}

export interface CalculatedInvoiceItem {
  description: string
  quantity: Decimal
  unitPrice: Decimal
  taxRate: Decimal
  lineSubtotal: Decimal
  lineTax: Decimal
  lineTotal: Decimal
}

export interface InvoiceTotals {
  subtotal: Decimal
  taxTotal: Decimal
  grandTotal: Decimal
}

/**
 * Tính toán subtotal, tax và total cho một line item
 */
export function calculateLineItem(item: InvoiceItemInput): CalculatedInvoiceItem {
  const quantity = new Decimal(item.quantity)
  const unitPrice = new Decimal(item.unitPrice)
  const taxRate = new Decimal(item.taxRate)

  // Line subtotal = quantity * unit_price
  const lineSubtotal = quantity.mul(unitPrice)

  // Line tax = line_subtotal * (tax_rate / 100)
  const lineTax = lineSubtotal.mul(taxRate.div(100))

  // Line total = line_subtotal + line_tax
  const lineTotal = lineSubtotal.add(lineTax)

  return {
    description: item.description,
    quantity,
    unitPrice,
    taxRate,
    lineSubtotal: lineSubtotal.toDecimalPlaces(2),
    lineTax: lineTax.toDecimalPlaces(2),
    lineTotal: lineTotal.toDecimalPlaces(2)
  }
}

/**
 * Tính tổng cho toàn bộ hoá đơn từ danh sách items
 */
export function calculateInvoiceTotals(items: CalculatedInvoiceItem[]): InvoiceTotals {
  let subtotal = new Decimal(0)
  let taxTotal = new Decimal(0)

  for (const item of items) {
    subtotal = subtotal.add(item.lineSubtotal)
    taxTotal = taxTotal.add(item.lineTax)
  }

  const grandTotal = subtotal.add(taxTotal)

  return {
    subtotal: subtotal.toDecimalPlaces(2),
    taxTotal: taxTotal.toDecimalPlaces(2),
    grandTotal: grandTotal.toDecimalPlaces(2)
  }
}

/**
 * Tính toán cho toàn bộ hoá đơn từ input items
 */
export function calculateInvoiceFromItems(items: InvoiceItemInput[]): {
  items: CalculatedInvoiceItem[]
  totals: InvoiceTotals
} {
  const calculatedItems = items.map(calculateLineItem)
  const totals = calculateInvoiceTotals(calculatedItems)

  return {
    items: calculatedItems,
    totals
  }
}
