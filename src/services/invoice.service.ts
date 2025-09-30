import { InvoiceRepository } from '../repositories/invoice.repo'
import { generateInvoiceNumber } from '../libs/numbering'
import { calculateInvoiceFromItems, type InvoiceItemInput } from '../utils/money'
import { type InvoiceFilterCondition } from '../types/common'
import { ERROR_MESSAGES } from '../constants/messages/invoice.message'
import { BAD_REQUEST, NOT_FOUND } from '../core/error.response'
import {
  InvoiceStatus,
  type InvoiceStatusType,
  type InvoiceWithItems,
  type PaginationInput,
  type PaginationResult
} from '../db/types'

export interface CreateInvoiceDraftInput {
  buyerName: string
  buyerTaxId?: string
  buyerAddress?: string
  sellerName: string
  sellerTaxId?: string
  dueDate?: Date
  notes?: string
  items: InvoiceItemInput[]
}

export interface UpdateInvoiceDraftInput {
  buyerName?: string
  buyerTaxId?: string
  buyerAddress?: string
  sellerName?: string
  sellerTaxId?: string
  dueDate?: Date
  notes?: string
  items?: InvoiceItemInput[]
}

export interface InvoiceFilter {
  status?: InvoiceStatusType
  q?: string // search query
  buyerName?: string
  issueDate?: {
    from?: Date
    to?: Date
  }
}

export class InvoiceService {
  private repository: InvoiceRepository

  constructor() {
    this.repository = new InvoiceRepository()
  }

  /**
   * Tạo hoá đơn draft với tính toán tổng tiền tự động
   */
  async createDraft(input: CreateInvoiceDraftInput): Promise<InvoiceWithItems> {
    const { items: inputItems, ...invoiceData } = input

    // Tính toán totals từ items
    const { items: calculatedItems, totals } = calculateInvoiceFromItems(inputItems)

    // Tạo hoá đơn với status = draft
    return this.repository.createDraft({
      ...invoiceData,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
      status: InvoiceStatus.draft,
      items: {
        create: calculatedItems
      }
    })
  }

  /**
   * Cập nhật hoá đơn draft và tính lại tổng tiền
   */
  async updateDraft(id: string, input: UpdateInvoiceDraftInput): Promise<InvoiceWithItems> {
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new NOT_FOUND({ message: ERROR_MESSAGES.NOT_EXISTS })
    }

    if (existing.status !== InvoiceStatus.draft) {
      throw new BAD_REQUEST({ message: ERROR_MESSAGES.ONLY_UPDATE_DRAFT })
    }

    const { items: inputItems, ...updateData } = input

    // Nếu có update items thì tính lại totals
    if (inputItems) {
      const { items: calculatedItems, totals } = calculateInvoiceFromItems(inputItems)

      return this.repository.updateDraft(id, {
        ...updateData,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        grandTotal: totals.grandTotal,
        items: {
          deleteMany: {}, // Xoá tất cả items cũ
          create: calculatedItems // Tạo mới items
        }
      })
    } else {
      // Chỉ update thông tin hoá đơn, không đụng tới items
      return this.repository.updateDraft(id, updateData)
    }
  }

  /**
   * Xoá hoá đơn draft
   */
  async deleteDraft(id: string): Promise<boolean> {
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new NOT_FOUND({ message: ERROR_MESSAGES.NOT_EXISTS })
    }

    if (existing.status !== InvoiceStatus.draft) {
      throw new BAD_REQUEST({ message: ERROR_MESSAGES.ONLY_DELETE_DRAFT })
    }

    return this.repository.deleteDraft(id)
  }

  /**
   * Xuất hoá đơn (chuyển từ draft sang issued)
   */
  async issue(id: string): Promise<InvoiceWithItems> {
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new NOT_FOUND({ message: ERROR_MESSAGES.NOT_EXISTS })
    }

    if (existing.status !== InvoiceStatus.draft) {
      throw new BAD_REQUEST({ message: ERROR_MESSAGES.ONLY_ISSUE_DRAFT })
    }

    // Validate bắt buộc
    if (!existing.buyerName || existing.items.length === 0) {
      throw new BAD_REQUEST({ message: ERROR_MESSAGES.MISSING_REQUIRED_DATA })
    }

    // Generate số hoá đơn và set issue date
    const invoiceNumber = await generateInvoiceNumber()
    const issueDate = new Date()

    return this.repository.markIssued(id, invoiceNumber, issueDate)
  }

  /**
   * Huỷ hoá đơn (chỉ áp dụng với hoá đơn đã issued)
   */
  async cancel(id: string, reason: string): Promise<InvoiceWithItems> {
    if (!reason || reason.trim() === '') {
      throw new BAD_REQUEST({ message: ERROR_MESSAGES.CANCEL_REASON_REQUIRED })
    }

    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new NOT_FOUND({ message: ERROR_MESSAGES.NOT_EXISTS })
    }

    if (existing.status !== InvoiceStatus.issued) {
      throw new BAD_REQUEST({ message: ERROR_MESSAGES.ONLY_CANCEL_ISSUED })
    }

    if (existing.replacedById) {
      throw new BAD_REQUEST({ message: ERROR_MESSAGES.CANNOT_CANCEL_REPLACED })
    }

    return this.repository.markCanceled(id, reason)
  }

  /**
   * Thay thế hoá đơn (tạo hoá đơn mới thay thế hoá đơn cũ)
   */
  async replace(
    oldInvoiceId: string,
    newInvoiceData: CreateInvoiceDraftInput
  ): Promise<{
    old: InvoiceWithItems
    new: InvoiceWithItems
  }> {
    const oldInvoice = await this.repository.findById(oldInvoiceId)
    if (!oldInvoice) {
      throw new NOT_FOUND({ message: ERROR_MESSAGES.REPLACEMENT_TARGET_NOT_FOUND })
    }

    if (oldInvoice.status !== InvoiceStatus.issued) {
      throw new BAD_REQUEST({ message: ERROR_MESSAGES.ONLY_REPLACE_ISSUED })
    }

    if (oldInvoice.replacedById) {
      throw new BAD_REQUEST({ message: ERROR_MESSAGES.ALREADY_REPLACED })
    }

    // Tính toán cho hoá đơn mới
    const { items: inputItems, ...invoiceData } = newInvoiceData
    const { items: calculatedItems, totals } = calculateInvoiceFromItems(inputItems)

    // Generate số hoá đơn cho hoá đơn thay thế
    const invoiceNumber = await generateInvoiceNumber()
    const issueDate = new Date()

    // Tạo hoá đơn thay thế (status = issued ngay)
    return this.repository.createReplacement(oldInvoiceId, {
      ...invoiceData,
      number: invoiceNumber,
      issueDate,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
      status: InvoiceStatus.issued,
      items: {
        create: calculatedItems
      }
    })
  }

  /**
   * Lấy danh sách hoá đơn với filter và pagination - OPTIMIZED VERSION
   */
  async list(
    filter: InvoiceFilter = {},
    pagination: PaginationInput = {}
  ): Promise<PaginationResult<InvoiceWithItems>> {
    const whereCondition: InvoiceFilterCondition = {}

    // Filter theo status (có index)
    if (filter.status) {
      whereCondition.status = filter.status
    }

    // Filter theo buyer name (có index)
    if (filter.buyerName) {
      whereCondition.buyerName = {
        contains: filter.buyerName,
        mode: 'insensitive'
      }
    }

    // Filter theo issue date range (có index)
    if (filter.issueDate) {
      whereCondition.issueDate = {}
      if (filter.issueDate.from) {
        whereCondition.issueDate.gte = filter.issueDate.from
      }
      if (filter.issueDate.to) {
        whereCondition.issueDate.lte = filter.issueDate.to
      }
    }

    // Search query - tối ưu hóa để sử dụng indexes
    if (filter.q && filter.q.trim()) {
      const searchTerm = filter.q.trim()

      // Ưu tiên search theo buyerName trước (có index)
      if (searchTerm.length >= 3) {
        whereCondition.OR = [
          { buyerName: { contains: searchTerm, mode: 'insensitive' } },
          { number: { contains: searchTerm, mode: 'insensitive' } }
          // Bỏ notes search để tăng performance
        ]
      } else {
        // Search ngắn chỉ tìm theo number (exact match nhanh hơn)
        whereCondition.number = { contains: searchTerm, mode: 'insensitive' }
      }
    }

    return this.repository.list(whereCondition, pagination)
  }

  /**
   * Lấy hoá đơn theo ID
   */
  async findById(id: string): Promise<InvoiceWithItems | null> {
    return this.repository.findById(id)
  }

  /**
   * Lấy hoá đơn theo số hoá đơn
   */
  async findByNumber(number: string): Promise<InvoiceWithItems | null> {
    return this.repository.findByNumber(number)
  }
}
