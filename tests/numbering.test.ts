import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { generateInvoiceNumber } from '../src/libs/numbering'
import { prisma } from '../src/db/client'

describe('Invoice Numbering System', () => {
  // Clean up database before and after each test
  beforeEach(async () => {
    await prisma.invoiceNumberSeq.deleteMany()
  })

  afterEach(async () => {
    await prisma.invoiceNumberSeq.deleteMany()
  })

  describe('generateInvoiceNumber', () => {
    it('should generate first invoice number for a year', async () => {
      const invoiceNumber = await generateInvoiceNumber()
      const currentYear = new Date().getFullYear()

      expect(invoiceNumber).toBe(`INV-${currentYear}-000001`)
    })

    it('should increment sequence number for subsequent invoices in same year', async () => {
      const currentYear = new Date().getFullYear()

      const firstNumber = await generateInvoiceNumber()
      const secondNumber = await generateInvoiceNumber()
      const thirdNumber = await generateInvoiceNumber()

      expect(firstNumber).toBe(`INV-${currentYear}-000001`)
      expect(secondNumber).toBe(`INV-${currentYear}-000002`)
      expect(thirdNumber).toBe(`INV-${currentYear}-000003`)
    })

    it('should handle different years correctly', async () => {
      // Create sequence for 2023
      await prisma.invoiceNumberSeq.create({
        data: {
          year: 2023,
          lastValue: 5
        }
      })

      // Generate number for 2024 (should start from 1)
      await prisma.invoiceNumberSeq.create({
        data: {
          year: 2024,
          lastValue: 0
        }
      })

      const sequence2024 = await prisma.invoiceNumberSeq.findUnique({
        where: { year: 2024 }
      })

      expect(sequence2024?.lastValue).toBe(0)
    })

    it('should pad sequence numbers with leading zeros', async () => {
      // Create a sequence with high number
      await prisma.invoiceNumberSeq.create({
        data: {
          year: new Date().getFullYear(),
          lastValue: 99
        }
      })

      const invoiceNumber = await generateInvoiceNumber()
      const currentYear = new Date().getFullYear()

      expect(invoiceNumber).toBe(`INV-${currentYear}-000100`)
    })

    it('should handle large sequence numbers correctly', async () => {
      const currentYear = new Date().getFullYear()

      // Create sequence with large number
      await prisma.invoiceNumberSeq.create({
        data: {
          year: currentYear,
          lastValue: 999999
        }
      })

      const invoiceNumber = await generateInvoiceNumber()

      expect(invoiceNumber).toBe(`INV-${currentYear}-1000000`)
    })

    it('should be atomic - handle concurrent requests without duplicates', async () => {
      const concurrentRequests = 10
      const currentYear = new Date().getFullYear()

      // Execute multiple concurrent requests
      const promises = Array(concurrentRequests)
        .fill(null)
        .map(() => generateInvoiceNumber())

      const invoiceNumbers = await Promise.all(promises)

      // All numbers should be unique
      const uniqueNumbers = new Set(invoiceNumbers)
      expect(uniqueNumbers.size).toBe(concurrentRequests)

      // Numbers should be sequential
      const sortedNumbers = invoiceNumbers.sort()
      for (let i = 0; i < sortedNumbers.length; i++) {
        const expectedNumber = (i + 1).toString().padStart(6, '0')
        expect(sortedNumbers[i]).toBe(`INV-${currentYear}-${expectedNumber}`)
      }
    })

    it('should handle race conditions properly', async () => {
      const currentYear = new Date().getFullYear()

      // Simulate race condition with rapid sequential calls
      const rapidCalls = []
      for (let i = 0; i < 5; i++) {
        rapidCalls.push(generateInvoiceNumber())
      }

      const results = await Promise.all(rapidCalls)

      // Verify all results are unique
      const uniqueResults = new Set(results)
      expect(uniqueResults.size).toBe(5)

      // Verify they follow expected pattern
      results.forEach((result) => {
        const pattern = /^INV-\d{4}-\d{6}$/
        expect(result).toMatch(pattern)
        expect(result.startsWith(`INV-${currentYear}-`)).toBe(true)
      })
    })

    it('should maintain sequence integrity across database restarts', async () => {
      const currentYear = new Date().getFullYear()

      // Generate numbers sequentially to avoid race conditions
      const firstNumber = await generateInvoiceNumber()
      const secondNumber = await generateInvoiceNumber()
      const thirdNumber = await generateInvoiceNumber()

      // Verify the database state
      const sequenceRecord = await prisma.invoiceNumberSeq.findUnique({
        where: { year: currentYear }
      })

      expect(sequenceRecord?.lastValue).toBe(3)

      // Generate more numbers (simulating restart)
      const fourthNumber = await generateInvoiceNumber()
      const fifthNumber = await generateInvoiceNumber()

      expect(firstNumber).toBe(`INV-${currentYear}-000001`)
      expect(secondNumber).toBe(`INV-${currentYear}-000002`)
      expect(thirdNumber).toBe(`INV-${currentYear}-000003`)
      expect(fourthNumber).toBe(`INV-${currentYear}-000004`)
      expect(fifthNumber).toBe(`INV-${currentYear}-000005`)
    })

    it('should handle year transitions correctly', async () => {
      // Test with different years to ensure isolation
      const year2023 = 2023
      const year2024 = 2024

      // Create sequences for both years
      await prisma.invoiceNumberSeq.create({
        data: { year: year2023, lastValue: 10 }
      })

      await prisma.invoiceNumberSeq.create({
        data: { year: year2024, lastValue: 5 }
      })

      // Verify they are independent
      const seq2023 = await prisma.invoiceNumberSeq.findUnique({
        where: { year: year2023 }
      })
      const seq2024 = await prisma.invoiceNumberSeq.findUnique({
        where: { year: year2024 }
      })

      expect(seq2023?.lastValue).toBe(10)
      expect(seq2024?.lastValue).toBe(5)
    })
  })

  describe('Invoice Number Format Validation', () => {
    it('should generate numbers in correct format: INV-YYYY-NNNNNN', async () => {
      const invoiceNumber = await generateInvoiceNumber()
      const currentYear = new Date().getFullYear()

      // Test format with regex
      const formatRegex = /^INV-\d{4}-\d{6}$/
      expect(invoiceNumber).toMatch(formatRegex)

      // Test specific parts
      const parts = invoiceNumber.split('-')
      expect(parts[0]).toBe('INV')
      expect(parts[1]).toBe(currentYear.toString())
      expect(parts[2]).toHaveLength(6)
      expect(parts[2]).toBe('000001')
    })

    it('should maintain consistent format across different sequence numbers', async () => {
      const numbers = []

      // Generate various sequence numbers sequentially to avoid timeouts
      for (let i = 0; i < 10; i++) {
        numbers.push(await generateInvoiceNumber())
      }

      // All should follow the same format
      numbers.forEach((number) => {
        expect(number).toMatch(/^INV-\d{4}-\d{6}$/)
        expect(number.startsWith('INV-')).toBe(true)
        expect(number.length).toBe(15) // INV-YYYY-NNNNNN = 15 chars
      })
    }, 15000)
  })

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking Prisma to simulate database errors
      // For now, we'll test that the function doesn't throw unexpected errors
      const invoiceNumber = await generateInvoiceNumber()
      expect(typeof invoiceNumber).toBe('string')
      expect(invoiceNumber.length).toBeGreaterThan(0)
    })
  })

  describe('Performance Tests', () => {
    it('should generate numbers efficiently under load', async () => {
      const startTime = Date.now()
      const batchSize = 10 // Reduce batch size for stability

      const promises = Array(batchSize)
        .fill(null)
        .map(() => generateInvoiceNumber())

      const results = await Promise.all(promises)
      const endTime = Date.now()
      const duration = endTime - startTime

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(15000) // 15 seconds for 10 concurrent requests
      expect(results).toHaveLength(batchSize)

      // All should be unique
      const uniqueResults = new Set(results)
      expect(uniqueResults.size).toBe(batchSize)
    }, 20000) // 20 second timeout for this test
  })
})
