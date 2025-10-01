import { describe, it, expect, beforeEach } from '@jest/globals'
import { InvoiceService } from '../src/services/invoice.service'
import { prisma } from '../src/db/client'

describe('Invoice Service', () => {
  const invoiceService = new InvoiceService()

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.invoice.deleteMany({})
    await prisma.invoiceNumberSeq.deleteMany({})
  })

  describe('createDraft', () => {
    it('should create a draft invoice successfully', async () => {
      const draftData = {
        buyerName: 'Test Buyer Company',
        buyerTaxId: '1234567890',
        buyerAddress: '123 Buyer Street',
        sellerName: 'Test Seller Company',
        sellerTaxId: '0987654321',
        notes: 'Test invoice for services',
        items: [
          {
            description: 'Consulting Service',
            quantity: 10,
            unitPrice: 100.5,
            taxRate: 10
          },
          {
            description: 'Development Service',
            quantity: 5,
            unitPrice: 200.0,
            taxRate: 10
          }
        ]
      }

      const result = await invoiceService.createDraft(draftData)

      expect(result).toBeDefined()
      expect(result.status).toBe('draft')
      expect(result.buyerName).toBe('Test Buyer Company')
      expect(result.sellerName).toBe('Test Seller Company')
      expect(result.items).toHaveLength(2)
      // Check calculated totals: (10*100.50) + (5*200.00) = 2005.00
      expect(Number(result.subtotal)).toBe(2005.0)
    })

    it('should calculate totals correctly for multiple items with tax', async () => {
      const draftData = {
        buyerName: 'Test Buyer',
        sellerName: 'Test Seller',
        items: [
          { description: 'Item 1', quantity: 2, unitPrice: 100.0, taxRate: 10 },
          { description: 'Item 2', quantity: 1, unitPrice: 50.0, taxRate: 5 },
          { description: 'Item 3', quantity: 3, unitPrice: 25.0, taxRate: 0 }
        ]
      }

      const result = await invoiceService.createDraft(draftData)

      expect(result.status).toBe('draft')
      expect(result.items).toHaveLength(3)

      // Subtotal: (2*100) + (1*50) + (3*25) = 325
      expect(Number(result.subtotal)).toBe(325.0)

      // Tax: (200*0.1) + (50*0.05) + (75*0) = 20 + 2.5 + 0 = 22.5
      expect(Number(result.taxTotal)).toBe(22.5)

      // Grand total: 325 + 22.5 = 347.5
      expect(Number(result.grandTotal)).toBe(347.5)
    })
  })

  describe('updateDraft', () => {
    it('should update draft invoice successfully', async () => {
      // Create a draft first
      const createResult = await invoiceService.createDraft({
        buyerName: 'Original Buyer',
        sellerName: 'Original Seller',
        items: [{ description: 'Original Item', quantity: 1, unitPrice: 100.0, taxRate: 10 }]
      })

      // Update the draft
      const updateData = {
        buyerName: 'Updated Buyer',
        items: [
          { description: 'Updated Item 1', quantity: 2, unitPrice: 150.0, taxRate: 10 },
          { description: 'New Item 2', quantity: 1, unitPrice: 50.0, taxRate: 5 }
        ]
      }

      const updateResult = await invoiceService.updateDraft(createResult.id, updateData)

      expect(updateResult.buyerName).toBe('Updated Buyer')
      expect(updateResult.sellerName).toBe('Original Seller') // Should remain unchanged
      expect(updateResult.items).toHaveLength(2)

      // New totals: (2*150) + (1*50) = 350
      expect(Number(updateResult.subtotal)).toBe(350.0)
    })

    it('should not allow updating non-draft invoices', async () => {
      // Create and issue an invoice
      const createResult = await invoiceService.createDraft({
        buyerName: 'Test Buyer',
        sellerName: 'Test Seller',
        items: [{ description: 'Test Item', quantity: 1, unitPrice: 100.0, taxRate: 10 }]
      })

      await invoiceService.issue(createResult.id)

      // Try to update the issued invoice
      await expect(invoiceService.updateDraft(createResult.id, { buyerName: 'Should Not Work' })).rejects.toThrow()
    })
  })

  describe('issue', () => {
    it('should issue a draft invoice successfully', async () => {
      // Create a draft first
      const createResult = await invoiceService.createDraft({
        buyerName: 'Test Buyer',
        sellerName: 'Test Seller',
        items: [{ description: 'Test Item', quantity: 1, unitPrice: 100.0, taxRate: 10 }]
      })

      const issueResult = await invoiceService.issue(createResult.id)

      expect(issueResult.status).toBe('issued')
      expect(issueResult.number).toBeDefined()
      expect(issueResult.number).toMatch(/^INV-\d{4}-\d{6}$/)
      expect(issueResult.issueDate).toBeDefined()
    })

    it('should not issue already issued invoice', async () => {
      const createResult = await invoiceService.createDraft({
        buyerName: 'Test Buyer',
        sellerName: 'Test Seller',
        items: [{ description: 'Test Item', quantity: 1, unitPrice: 100.0, taxRate: 10 }]
      })

      await invoiceService.issue(createResult.id)

      // Try to issue again
      await expect(invoiceService.issue(createResult.id)).rejects.toThrow()
    })

    it('should not issue invoice without required data', async () => {
      const createResult = await invoiceService.createDraft({
        buyerName: '', // Empty required field
        sellerName: 'Test Seller',
        items: [] // No items
      })

      await expect(invoiceService.issue(createResult.id)).rejects.toThrow()
    })
  })

  describe('cancel', () => {
    it('should cancel an issued invoice successfully', async () => {
      // Create and issue invoice
      const createResult = await invoiceService.createDraft({
        buyerName: 'Test Buyer',
        sellerName: 'Test Seller',
        items: [{ description: 'Test Item', quantity: 1, unitPrice: 100.0, taxRate: 10 }]
      })

      await invoiceService.issue(createResult.id)

      // Cancel the invoice
      const cancelResult = await invoiceService.cancel(createResult.id, 'Customer requested cancellation')

      expect(cancelResult.status).toBe('canceled')
      expect(cancelResult.cancelReason).toBe('Customer requested cancellation')
      expect(cancelResult.canceledAt).toBeDefined()
    })

    it('should require cancellation reason', async () => {
      const createResult = await invoiceService.createDraft({
        buyerName: 'Test Buyer',
        sellerName: 'Test Seller',
        items: [{ description: 'Test Item', quantity: 1, unitPrice: 100.0, taxRate: 10 }]
      })

      await invoiceService.issue(createResult.id)

      // Try to cancel without reason
      await expect(invoiceService.cancel(createResult.id, '')).rejects.toThrow()
    })

    it('should not cancel draft invoices', async () => {
      const createResult = await invoiceService.createDraft({
        buyerName: 'Test Buyer',
        sellerName: 'Test Seller',
        items: [{ description: 'Test Item', quantity: 1, unitPrice: 100.0, taxRate: 10 }]
      })

      await expect(invoiceService.cancel(createResult.id, 'Cannot cancel draft')).rejects.toThrow()
    })
  })

  describe('replace', () => {
    it('should create replacement invoice successfully', async () => {
      // Create, issue original invoice
      const originalData = {
        buyerName: 'Test Buyer',
        sellerName: 'Test Seller',
        items: [{ description: 'Original Item', quantity: 1, unitPrice: 100.0, taxRate: 10 }]
      }

      const createResult = await invoiceService.createDraft(originalData)
      await invoiceService.issue(createResult.id)

      // Create replacement
      const replacementData = {
        buyerName: 'Test Buyer',
        sellerName: 'Test Seller',
        items: [{ description: 'Corrected Item', quantity: 2, unitPrice: 120.0, taxRate: 10 }]
      }

      const replaceResult = await invoiceService.replace(createResult.id, replacementData)

      expect(replaceResult.new.status).toBe('issued')
      expect(replaceResult.new.number).toBeDefined()
      expect(replaceResult.new.replacementOfId).toBe(createResult.id)
      expect(Number(replaceResult.new.subtotal)).toBe(240.0) // 2 * 120

      // Check bidirectional relationship
      expect(replaceResult.old.replacedById).toBe(replaceResult.new.id)
    })

    it('should not replace non-issued invoices', async () => {
      const createResult = await invoiceService.createDraft({
        buyerName: 'Test Buyer',
        sellerName: 'Test Seller',
        items: [{ description: 'Test Item', quantity: 1, unitPrice: 100.0, taxRate: 10 }]
      })

      // Try to replace draft
      await expect(
        invoiceService.replace(createResult.id, {
          buyerName: 'Test Buyer',
          sellerName: 'Test Seller',
          items: [{ description: 'Should not work', quantity: 1, unitPrice: 100.0, taxRate: 10 }]
        })
      ).rejects.toThrow()
    })
  })

  describe('findById', () => {
    it('should retrieve invoice with items successfully', async () => {
      const createResult = await invoiceService.createDraft({
        buyerName: 'Test Buyer',
        sellerName: 'Test Seller',
        items: [
          { description: 'Item 1', quantity: 2, unitPrice: 50.0, taxRate: 10 },
          { description: 'Item 2', quantity: 1, unitPrice: 100.0, taxRate: 5 }
        ]
      })

      const getResult = await invoiceService.findById(createResult.id)

      expect(getResult).not.toBeNull()
      expect(getResult!.id).toBe(createResult.id)
      expect(getResult!.buyerName).toBe('Test Buyer')
      expect(getResult!.items).toHaveLength(2)
    })

    it('should return null for non-existent invoice', async () => {
      const result = await invoiceService.findById('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('list', () => {
    it('should list invoices with pagination', async () => {
      // Create multiple invoices
      const promises = []
      for (let i = 1; i <= 5; i++) {
        promises.push(
          invoiceService.createDraft({
            buyerName: `Buyer ${i}`,
            sellerName: `Seller ${i}`,
            items: [{ description: `Item ${i}`, quantity: 1, unitPrice: 100.0, taxRate: 10 }]
          })
        )
      }

      await Promise.all(promises)

      const listResult = await invoiceService.list({}, { page: 1, limit: 3 })

      expect(listResult.data).toHaveLength(3)
      expect(listResult.total).toBe(5)
      expect(listResult.page).toBe(1)
      expect(listResult.totalPages).toBe(2)
    })

    it('should filter by status', async () => {
      const draft = await invoiceService.createDraft({
        buyerName: 'Draft Buyer 2',
        sellerName: 'Draft Seller 2',
        items: [{ description: 'Draft Item', quantity: 1, unitPrice: 100.0, taxRate: 10 }]
      })

      await invoiceService.issue(draft.id)

      // Filter by draft status
      const draftList = await invoiceService.list({ status: 'draft' })
      expect(draftList.data).toHaveLength(1)
      expect(draftList.data[0].status).toBe('draft')

      // Filter by issued status
      const issuedList = await invoiceService.list({ status: 'issued' })
      expect(issuedList.data).toHaveLength(1)
      expect(issuedList.data[0].status).toBe('issued')
    })

    it('should search by buyer name', async () => {
      await invoiceService.createDraft({
        buyerName: 'ABC Company',
        sellerName: 'Test Seller',
        items: [{ description: 'Item', quantity: 1, unitPrice: 100.0, taxRate: 10 }]
      })

      await invoiceService.createDraft({
        buyerName: 'XYZ Corporation',
        sellerName: 'Test Seller',
        items: [{ description: 'Item', quantity: 1, unitPrice: 100.0, taxRate: 10 }]
      })

      const searchResult = await invoiceService.list({ buyerName: 'ABC' })
      expect(searchResult.data).toHaveLength(1)
      expect(searchResult.data[0].buyerName).toBe('ABC Company')
    })
  })

  describe('deleteDraft', () => {
    it('should delete draft invoice successfully', async () => {
      const createResult = await invoiceService.createDraft({
        buyerName: 'Test Buyer',
        sellerName: 'Test Seller',
        items: [{ description: 'Test Item', quantity: 1, unitPrice: 100.0, taxRate: 10 }]
      })

      const deleteResult = await invoiceService.deleteDraft(createResult.id)
      expect(deleteResult).toBe(true)

      // Verify it's deleted
      const getResult = await invoiceService.findById(createResult.id)
      expect(getResult).toBeNull()
    })

    it('should not delete issued invoices', async () => {
      const createResult = await invoiceService.createDraft({
        buyerName: 'Test Buyer',
        sellerName: 'Test Seller',
        items: [{ description: 'Test Item', quantity: 1, unitPrice: 100.0, taxRate: 10 }]
      })

      await invoiceService.issue(createResult.id)

      await expect(invoiceService.deleteDraft(createResult.id)).rejects.toThrow()
    })
  })
})
