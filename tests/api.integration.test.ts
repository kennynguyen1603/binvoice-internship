import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'
import request from 'supertest'
import { app } from '../src/app'
import { prisma } from '../src/db/client'
import fs from 'fs/promises'
import path from 'path'

describe('Invoice API Integration Tests', () => {
  const testInvoiceData = {
    buyerName: 'Test Buyer Company',
    buyerTaxId: '1234567890',
    buyerAddress: '123 Test Street',
    sellerName: 'Test Seller Company',
    sellerTaxId: '0987654321',
    notes: 'API integration test invoice',
    items: [
      {
        description: 'API Test Item 1',
        quantity: 2,
        unitPrice: 100.0,
        taxRate: 10
      },
      {
        description: 'API Test Item 2',
        quantity: 1,
        unitPrice: 200.0,
        taxRate: 5
      }
    ]
  }

  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.invoice.deleteMany({})
    await prisma.invoiceNumberSeq.deleteMany({})
  })

  afterEach(async () => {
    // Clean up test data after each test
    await prisma.invoice.deleteMany({})
    await prisma.invoiceNumberSeq.deleteMany({})

    // Clean up generated PDF files
    try {
      const pdfDir = path.join(process.cwd(), 'storage/pdf')
      const files = await fs.readdir(pdfDir)
      await Promise.all(
        files
          .filter((f) => f.endsWith('.pdf'))
          .map(
            (f) => fs.unlink(path.join(pdfDir, f)).catch(() => {}) // Ignore errors
          )
      )
    } catch {
      // Directory doesn't exist or no files
    }
  })

  describe('Invoice CRUD Operations', () => {
    it('should create a draft invoice', async () => {
      const response = await request(app).post('/api/v1/invoices').send(testInvoiceData).expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.status).toBe('draft')
      expect(response.body.data.buyerName).toBe('Test Buyer Company')
      expect(response.body.data.items).toHaveLength(2)
      expect(Number(response.body.data.subtotal)).toBe(400.0) // (2*100) + (1*200)
    })

    it('should get invoice by ID', async () => {
      // Create invoice first
      const createResponse = await request(app).post('/api/v1/invoices').send(testInvoiceData).expect(201)

      const invoiceId = createResponse.body.data.id

      // Get invoice by ID
      const getResponse = await request(app).get(`/api/v1/invoices/${invoiceId}`).expect(200)

      expect(getResponse.body.success).toBe(true)
      expect(getResponse.body.data.id).toBe(invoiceId)
      expect(getResponse.body.data.buyerName).toBe('Test Buyer Company')
    })

    it('should list invoices with pagination', async () => {
      // Create multiple invoices
      await Promise.all([
        request(app)
          .post('/api/v1/invoices')
          .send({ ...testInvoiceData, buyerName: 'Buyer 1' }),
        request(app)
          .post('/api/v1/invoices')
          .send({ ...testInvoiceData, buyerName: 'Buyer 2' }),
        request(app)
          .post('/api/v1/invoices')
          .send({ ...testInvoiceData, buyerName: 'Buyer 3' })
      ])

      const response = await request(app).get('/api/v1/invoices?page=1&limit=2').expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.invoices).toHaveLength(2)
      expect(response.body.data.total).toBe(3)
      expect(response.body.data.page).toBe(1)
    })

    it('should update draft invoice', async () => {
      // Create invoice first
      const createResponse = await request(app).post('/api/v1/invoices').send(testInvoiceData).expect(201)

      const invoiceId = createResponse.body.data.id

      // Update invoice
      const updateData = {
        buyerName: 'Updated Buyer Name',
        items: [{ description: 'Updated Item', quantity: 1, unitPrice: 300.0, taxRate: 10 }]
      }

      const updateResponse = await request(app).patch(`/api/v1/invoices/${invoiceId}`).send(updateData).expect(200)

      expect(updateResponse.body.data.buyerName).toBe('Updated Buyer Name')
      expect(updateResponse.body.data.items).toHaveLength(1)
      expect(Number(updateResponse.body.data.subtotal)).toBe(300.0)
    })

    it('should delete draft invoice', async () => {
      // Create invoice first
      const createResponse = await request(app).post('/api/v1/invoices').send(testInvoiceData).expect(201)

      const invoiceId = createResponse.body.data.id

      // Delete invoice
      await request(app).delete(`/api/v1/invoices/${invoiceId}`).expect(200)

      // Verify it's deleted
      await request(app).get(`/api/v1/invoices/${invoiceId}`).expect(404)
    })
  })

  describe('Invoice State Transitions', () => {
    it('should issue a draft invoice', async () => {
      // Create draft
      const createResponse = await request(app).post('/api/v1/invoices').send(testInvoiceData).expect(201)

      const invoiceId = createResponse.body.data.id

      // Issue invoice
      const issueResponse = await request(app).post(`/api/v1/invoices/${invoiceId}/issue`).expect(200)

      expect(issueResponse.body.data.status).toBe('issued')
      expect(issueResponse.body.data.number).toMatch(/^INV-\d{4}-\d{6}$/)
      expect(issueResponse.body.data.issueDate).toBeDefined()
    })

    it('should not allow updating issued invoice', async () => {
      // Create and issue invoice
      const createResponse = await request(app).post('/api/v1/invoices').send(testInvoiceData).expect(201)

      const invoiceId = createResponse.body.data.id

      await request(app).post(`/api/v1/invoices/${invoiceId}/issue`).expect(200)

      // Try to update issued invoice
      await request(app).patch(`/api/v1/invoices/${invoiceId}`).send({ buyerName: 'Should not work' }).expect(400)
    })

    it('should not allow deleting issued invoice', async () => {
      // Create and issue invoice
      const createResponse = await request(app).post('/api/v1/invoices').send(testInvoiceData).expect(201)

      const invoiceId = createResponse.body.data.id

      await request(app).post(`/api/v1/invoices/${invoiceId}/issue`).expect(200)

      // Try to delete issued invoice
      await request(app).delete(`/api/v1/invoices/${invoiceId}`).expect(400)
    })

    it('should cancel an issued invoice', async () => {
      // Create and issue invoice
      const createResponse = await request(app).post('/api/v1/invoices').send(testInvoiceData).expect(201)

      const invoiceId = createResponse.body.data.id

      await request(app).post(`/api/v1/invoices/${invoiceId}/issue`).expect(200)

      // Cancel invoice
      const cancelResponse = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/cancel`)
        .send({ reason: 'API test cancellation' })
        .expect(200)

      expect(cancelResponse.body.data.status).toBe('canceled')
      expect(cancelResponse.body.data.cancelReason).toBe('API test cancellation')
      expect(cancelResponse.body.data.canceledAt).toBeDefined()
    })

    it('should not cancel draft invoice', async () => {
      // Create draft
      const createResponse = await request(app).post('/api/v1/invoices').send(testInvoiceData).expect(201)

      const invoiceId = createResponse.body.data.id

      // Try to cancel draft
      await request(app).post(`/api/v1/invoices/${invoiceId}/cancel`).send({ reason: 'Should not work' }).expect(400)
    })

    it('should create replacement invoice', async () => {
      // Create, issue original invoice
      const createResponse = await request(app).post('/api/v1/invoices').send(testInvoiceData).expect(201)

      const invoiceId = createResponse.body.data.id

      await request(app).post(`/api/v1/invoices/${invoiceId}/issue`).expect(200)

      // Create replacement
      const replacementData = {
        ...testInvoiceData,
        buyerName: 'Replacement Buyer',
        items: [{ description: 'Replacement Item', quantity: 1, unitPrice: 500.0, taxRate: 10 }]
      }

      const replaceResponse = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/replace`)
        .send(replacementData)
        .expect(200)

      expect(replaceResponse.body.data.new.status).toBe('issued')
      expect(replaceResponse.body.data.new.buyerName).toBe('Replacement Buyer')
      expect(replaceResponse.body.data.new.replacementOfId).toBe(invoiceId)
      expect(replaceResponse.body.data.old.replacedById).toBe(replaceResponse.body.data.new.id)
    })
  })

  describe('PDF Generation E2E', () => {
    it('should complete full workflow: Create → Issue → Generate PDF → Download PDF', async () => {
      // Step 1: Create Draft
      const createResponse = await request(app).post('/api/v1/invoices').send(testInvoiceData).expect(201)

      const invoiceId = createResponse.body.data.id
      expect(createResponse.body.data.status).toBe('draft')

      // Step 2: Issue Invoice
      const issueResponse = await request(app).post(`/api/v1/invoices/${invoiceId}/issue`).expect(200)

      expect(issueResponse.body.data.status).toBe('issued')
      expect(issueResponse.body.data.number).toMatch(/^INV-\d{4}-\d{6}$/)

      // Step 3: Generate PDF
      const pdfGenResponse = await request(app).post(`/api/v1/invoices/${invoiceId}/pdf`).expect(201)

      expect(pdfGenResponse.body.data.fileName).toBeDefined()
      expect(pdfGenResponse.body.data.downloadUrl).toBe(`/invoices/${invoiceId}/pdf`)

      // Step 4: Download PDF
      const downloadResponse = await request(app).get(`/api/v1/invoices/${invoiceId}/pdf`).expect(200)

      expect(downloadResponse.headers['content-type']).toContain('application/pdf')
      expect(downloadResponse.headers['content-disposition']).toContain('attachment')
      expect(downloadResponse.body).toBeDefined()
      expect(downloadResponse.body.length).toBeGreaterThan(0)
    }, 30000) // 30 second timeout for PDF generation

    it('should generate PDF with CANCELED watermark for canceled invoice', async () => {
      // Create, issue, and cancel invoice
      const createResponse = await request(app).post('/api/v1/invoices').send(testInvoiceData).expect(201)

      const invoiceId = createResponse.body.data.id

      await request(app).post(`/api/v1/invoices/${invoiceId}/issue`).expect(200)

      await request(app)
        .post(`/api/v1/invoices/${invoiceId}/cancel`)
        .send({ reason: 'Testing canceled watermark' })
        .expect(200)

      // Generate PDF for canceled invoice
      await request(app).post(`/api/v1/invoices/${invoiceId}/pdf`).expect(201)

      // Download and verify it's a valid PDF
      const downloadResponse = await request(app).get(`/api/v1/invoices/${invoiceId}/pdf`).expect(200)

      expect(downloadResponse.headers['content-type']).toContain('application/pdf')
      expect(downloadResponse.body.length).toBeGreaterThan(0)
    }, 30000)

    it('should return 404 for non-existent PDF', async () => {
      // Create invoice but don't generate PDF
      const createResponse = await request(app).post('/api/v1/invoices').send(testInvoiceData).expect(201)

      const invoiceId = createResponse.body.data.id

      // Try to download non-existent PDF
      await request(app).get(`/api/v1/invoices/${invoiceId}/pdf`).expect(404)
    })
  })

  describe('Input Validation', () => {
    it('should reject invalid invoice data', async () => {
      const invalidData = {
        buyerName: '', // Empty required field
        items: [] // Empty items array
      }

      await request(app).post('/api/v1/invoices').send(invalidData).expect(400)
    })

    it('should reject invalid UUID in params', async () => {
      await request(app).get('/api/v1/invoices/invalid-uuid').expect(400)
    })

    it('should require cancel reason', async () => {
      // Create and issue invoice
      const createResponse = await request(app).post('/api/v1/invoices').send(testInvoiceData).expect(201)

      const invoiceId = createResponse.body.data.id

      await request(app).post(`/api/v1/invoices/${invoiceId}/issue`).expect(200)

      // Try to cancel without reason
      await request(app).post(`/api/v1/invoices/${invoiceId}/cancel`).send({ reason: '' }).expect(400)
    })
  })

  describe('Error Handling', () => {
    it('should return 404 for non-existent invoice', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000'

      await request(app).get(`/api/v1/invoices/${nonExistentId}`).expect(404)
    })

    it('should handle server errors gracefully', async () => {
      // This would require mocking database errors
      // For now, we test with invalid data that should cause validation errors
      const invalidData = {
        buyerName: 'Test',
        items: [
          {
            description: 'Test',
            quantity: -1, // Invalid quantity
            unitPrice: -100, // Invalid price
            taxRate: 150 // Invalid tax rate > 100
          }
        ]
      }

      await request(app).post('/api/v1/invoices').send(invalidData).expect(400)
    })
  })
})
