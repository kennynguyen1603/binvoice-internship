import { describe, it, expect } from '@jest/globals'
import { calculateLineItem, calculateInvoiceFromItems, type InvoiceItemInput } from '../src/utils/money'

describe('Money Utilities', () => {
  describe('calculateLineItem', () => {
    it('should calculate correct line item for integer values', () => {
      const inputItem: InvoiceItemInput = {
        description: 'Test Product',
        quantity: 10,
        unitPrice: 100.5,
        taxRate: 10
      }

      const result = calculateLineItem(inputItem)

      expect(result.description).toBe('Test Product')
      expect(result.quantity.toNumber()).toBe(10)
      expect(result.unitPrice.toNumber()).toBe(100.5)
      expect(result.taxRate.toNumber()).toBe(10)
      expect(result.lineSubtotal.toNumber()).toBe(1005) // 10 * 100.5
      expect(result.lineTax.toNumber()).toBe(100.5) // 1005 * 0.1
      expect(result.lineTotal.toNumber()).toBe(1105.5) // 1005 + 100.5
    })

    it('should calculate correct line item for decimal quantities', () => {
      const inputItem: InvoiceItemInput = {
        description: 'Decimal Product',
        quantity: 2.5,
        unitPrice: 80.4,
        taxRate: 8.25
      }

      const result = calculateLineItem(inputItem)

      expect(result.lineSubtotal.toNumber()).toBe(201) // 2.5 * 80.4
      expect(result.lineTax.toNumber()).toBeCloseTo(16.58, 2) // 201 * 0.0825
      expect(result.lineTotal.toNumber()).toBeCloseTo(217.58, 2)
    })

    it('should handle zero tax rate', () => {
      const inputItem: InvoiceItemInput = {
        description: 'Tax-free Product',
        quantity: 5,
        unitPrice: 100,
        taxRate: 0
      }

      const result = calculateLineItem(inputItem)

      expect(result.lineSubtotal.toNumber()).toBe(500)
      expect(result.lineTax.toNumber()).toBe(0)
      expect(result.lineTotal.toNumber()).toBe(500)
    })

    it('should handle zero quantity', () => {
      const inputItem: InvoiceItemInput = {
        description: 'Zero Quantity',
        quantity: 0,
        unitPrice: 100,
        taxRate: 10
      }

      const result = calculateLineItem(inputItem)

      expect(result.lineSubtotal.toNumber()).toBe(0)
      expect(result.lineTax.toNumber()).toBe(0)
      expect(result.lineTotal.toNumber()).toBe(0)
    })

    it('should maintain precision for small decimal values', () => {
      const inputItem: InvoiceItemInput = {
        description: 'Small Decimal',
        quantity: 3,
        unitPrice: 0.1,
        taxRate: 5
      }

      const result = calculateLineItem(inputItem)

      expect(result.lineSubtotal.toNumber()).toBe(0.3)
      expect(result.lineTax.toNumber()).toBe(0.02) // 0.3 * 0.05 = 0.015, rounded to 0.02
      expect(result.lineTotal.toNumber()).toBe(0.32)
    })
  })

  describe('calculateInvoiceFromItems - Integration Tests', () => {
    const mockInvoiceItems: InvoiceItemInput[] = [
      {
        description: 'Product A',
        quantity: 2,
        unitPrice: 100,
        taxRate: 10
      },
      {
        description: 'Product B',
        quantity: 1,
        unitPrice: 50,
        taxRate: 5
      },
      {
        description: 'Product C (Tax-free)',
        quantity: 3,
        unitPrice: 30,
        taxRate: 0
      }
    ]

    it('should calculate correct invoice totals for multiple items', () => {
      const result = calculateInvoiceFromItems(mockInvoiceItems)

      // Verify calculated items structure
      expect(result.items).toHaveLength(3)

      // Product A: 2 × 100 = 200, tax = 20, total = 220
      expect(result.items[0].lineSubtotal.toNumber()).toBe(200)
      expect(result.items[0].lineTax.toNumber()).toBe(20)
      expect(result.items[0].lineTotal.toNumber()).toBe(220)

      // Product B: 1 × 50 = 50, tax = 2.5, total = 52.5
      expect(result.items[1].lineSubtotal.toNumber()).toBe(50)
      expect(result.items[1].lineTax.toNumber()).toBe(2.5)
      expect(result.items[1].lineTotal.toNumber()).toBe(52.5)

      // Product C: 3 × 30 = 90, tax = 0, total = 90
      expect(result.items[2].lineSubtotal.toNumber()).toBe(90)
      expect(result.items[2].lineTax.toNumber()).toBe(0)
      expect(result.items[2].lineTotal.toNumber()).toBe(90)

      // Verify invoice totals
      expect(result.totals.subtotal.toNumber()).toBe(340) // 200 + 50 + 90
      expect(result.totals.taxTotal.toNumber()).toBe(22.5) // 20 + 2.5 + 0
      expect(result.totals.grandTotal.toNumber()).toBe(362.5) // 340 + 22.5
    })

    it('should handle empty items array', () => {
      const result = calculateInvoiceFromItems([])

      expect(result.items).toHaveLength(0)
      expect(result.totals.subtotal.toNumber()).toBe(0)
      expect(result.totals.taxTotal.toNumber()).toBe(0)
      expect(result.totals.grandTotal.toNumber()).toBe(0)
    })

    it('should handle single item correctly', () => {
      const singleItem: InvoiceItemInput[] = [
        {
          description: 'Single Product',
          quantity: 5,
          unitPrice: 99.99,
          taxRate: 8.25
        }
      ]

      const result = calculateInvoiceFromItems(singleItem)

      expect(result.items).toHaveLength(1)
      expect(result.totals.subtotal.toNumber()).toBeCloseTo(499.95, 2)
      expect(result.totals.taxTotal.toNumber()).toBeCloseTo(41.25, 2)
      expect(result.totals.grandTotal.toNumber()).toBeCloseTo(541.2, 2)
    })

    it('should maintain precision with complex decimal calculations', () => {
      const complexItems: InvoiceItemInput[] = [
        {
          description: 'Complex Item 1',
          quantity: 2.5,
          unitPrice: 123.456,
          taxRate: 7.75
        },
        {
          description: 'Complex Item 2',
          quantity: 1.33,
          unitPrice: 89.99,
          taxRate: 12.5
        }
      ]

      const result = calculateInvoiceFromItems(complexItems)

      // Calculate expected values manually
      // Item 1: 2.5 * 123.456 = 308.64, tax = 23.92, total = 332.56
      // Item 2: 1.33 * 89.99 = 119.69, tax = 14.96, total = 134.65
      expect(result.totals.subtotal.toNumber()).toBeCloseTo(428.33, 2)
      expect(result.totals.taxTotal.toNumber()).toBeCloseTo(38.88, 2)
      expect(result.totals.grandTotal.toNumber()).toBeCloseTo(467.21, 2)
    })

    it('should preserve input item properties', () => {
      const result = calculateInvoiceFromItems(mockInvoiceItems)

      result.items.forEach((calculatedItem, index) => {
        const originalItem = mockInvoiceItems[index]
        expect(calculatedItem.description).toBe(originalItem.description)
        expect(calculatedItem.quantity.toNumber()).toBe(originalItem.quantity)
        expect(calculatedItem.unitPrice.toNumber()).toBe(originalItem.unitPrice)
        expect(calculatedItem.taxRate.toNumber()).toBe(originalItem.taxRate)
      })
    })

    it('should handle zero quantities and prices gracefully', () => {
      const edgeCaseItems: InvoiceItemInput[] = [
        {
          description: 'Zero Quantity Item',
          quantity: 0,
          unitPrice: 100,
          taxRate: 10
        },
        {
          description: 'Zero Price Item',
          quantity: 5,
          unitPrice: 0,
          taxRate: 15
        },
        {
          description: 'Normal Item',
          quantity: 1,
          unitPrice: 50,
          taxRate: 5
        }
      ]

      const result = calculateInvoiceFromItems(edgeCaseItems)

      expect(result.items[0].lineTotal.toNumber()).toBe(0)
      expect(result.items[1].lineTotal.toNumber()).toBe(0)
      expect(result.items[2].lineTotal.toNumber()).toBe(52.5)
      expect(result.totals.grandTotal.toNumber()).toBe(52.5)
    })
  })

  describe('Decimal Precision Edge Cases', () => {
    it('should handle JavaScript floating point precision issues', () => {
      // Test case that would fail with regular JavaScript numbers (0.1 + 0.2 = 0.30000000000000004)
      const result = calculateInvoiceFromItems([
        {
          description: 'Precision Test',
          quantity: 1,
          unitPrice: 0.1,
          taxRate: 0
        },
        {
          description: 'Precision Test 2',
          quantity: 1,
          unitPrice: 0.2,
          taxRate: 0
        }
      ])

      expect(result.totals.subtotal.toNumber()).toBe(0.3)
      expect(result.totals.grandTotal.toNumber()).toBe(0.3)
    })

    it('should handle very large numbers correctly', () => {
      const result = calculateInvoiceFromItems([
        {
          description: 'Large Number Test',
          quantity: 1000000,
          unitPrice: 999999.99,
          taxRate: 10
        }
      ])

      expect(result.totals.subtotal.toNumber()).toBe(999999990000)
      expect(result.totals.taxTotal.toNumber()).toBe(99999999000)
      expect(result.totals.grandTotal.toNumber()).toBe(1099999989000)
    })

    it('should handle small decimal numbers with rounding', () => {
      const result = calculateInvoiceFromItems([
        {
          description: 'Small Decimal Test',
          quantity: 1,
          unitPrice: 0.01,
          taxRate: 10
        }
      ])

      expect(result.totals.subtotal.toNumber()).toBe(0.01)
      // Tax = 0.01 * 0.10 = 0.001, but rounded to 2 decimal places = 0.00
      expect(result.totals.taxTotal.toNumber()).toBe(0)
      expect(result.totals.grandTotal.toNumber()).toBe(0.01)
    })
  })
})
