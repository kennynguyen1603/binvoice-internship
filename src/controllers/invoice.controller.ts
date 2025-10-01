import { Request, Response, NextFunction } from 'express'
import { InvoiceService } from '../services/invoice.service'
import { type ValidatedRequest } from '../types/common'
import { OK, CREATED } from '../core/succes.response'
import { NOT_FOUND } from '../core/error.response'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../constants/messages/invoice.message'
import { pdfService } from '../libs/pdf'
import {
  InvoiceCreateInput,
  InvoiceUpdateInput,
  InvoiceCancelInput,
  InvoiceListQuery,
  UUIDParam
} from '../schemas/invoice.schema'

export class InvoiceController {
  private invoiceService: InvoiceService

  constructor() {
    this.invoiceService = new InvoiceService()
  }

  /**
   * POST /invoices - Tạo hoá đơn draft
   */
  createDraft = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const input = req.body as InvoiceCreateInput
    const invoice = await this.invoiceService.createDraft(input)

    new CREATED({
      message: SUCCESS_MESSAGES.DRAFT_CREATED,
      data: invoice
    }).send(res)
  }

  /**
   * GET /invoices - Lấy danh sách hoá đơn
   */
  list = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const validatedReq = req as unknown as ValidatedRequest<unknown, InvoiceListQuery>
    const query = validatedReq.validatedQuery || (req.query as unknown as InvoiceListQuery)
    const { page, limit, status, q, buyerName, issueDateFrom, issueDateTo } = query

    const filter = {
      status,
      q,
      buyerName,
      issueDate:
        issueDateFrom || issueDateTo
          ? {
              from: issueDateFrom,
              to: issueDateTo
            }
          : undefined
    }

    const result = await this.invoiceService.list(filter, { page, limit })

    new OK({
      message: SUCCESS_MESSAGES.LIST_RETRIEVED,
      data: {
        invoices: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    }).send(res)
  }

  /**
   * GET /invoices/number/:number - Tìm hoá đơn theo số
   */
  getByNumber = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { number } = req.params
    const invoice = await this.invoiceService.findByNumber(number)

    if (!invoice) {
      new NOT_FOUND({
        message: ERROR_MESSAGES.NOT_FOUND
      }).send(res)
      return
    }

    new OK({
      message: SUCCESS_MESSAGES.DETAIL_RETRIEVED,
      data: invoice
    }).send(res)
  }

  /**
   * GET /invoices/:id - Lấy chi tiết hoá đơn
   */
  getById = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id } = req.params as UUIDParam
    const invoice = await this.invoiceService.findById(id)

    if (!invoice) {
      new NOT_FOUND({
        message: ERROR_MESSAGES.NOT_FOUND
      }).send(res)
      return
    }

    new OK({
      message: SUCCESS_MESSAGES.DETAIL_RETRIEVED,
      data: invoice
    }).send(res)
  }

  /**
   * PATCH /invoices/:id - Cập nhật hoá đơn draft
   */
  updateDraft = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id } = req.params as UUIDParam
    const input = req.body as InvoiceUpdateInput

    const invoice = await this.invoiceService.updateDraft(id, input)

    new OK({
      message: SUCCESS_MESSAGES.DRAFT_UPDATED,
      data: invoice
    }).send(res)
  }

  /**
   * DELETE /invoices/:id - Xoá hoá đơn draft
   */
  deleteDraft = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id } = req.params as UUIDParam

    await this.invoiceService.deleteDraft(id)

    new OK({
      message: SUCCESS_MESSAGES.DRAFT_DELETED
    }).send(res)
  }

  /**
   * POST /invoices/:id/issue - Xuất hoá đơn
   */
  issue = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id } = req.params as UUIDParam

    const invoice = await this.invoiceService.issue(id)

    // Clear PDF cache
    // Note: Accessing internal service via pdfService instance
    if (pdfService && typeof pdfService.clearInvoiceCache === 'function') {
      pdfService.clearInvoiceCache(id)
    }

    new OK({
      message: SUCCESS_MESSAGES.ISSUED,
      data: invoice
    }).send(res)
  }

  /**
   * POST /invoices/:id/cancel - Huỷ hoá đơn
   */
  cancel = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id } = req.params as UUIDParam
    const { reason } = req.body as InvoiceCancelInput

    const invoice = await this.invoiceService.cancel(id, reason)

    if (pdfService && typeof pdfService.clearInvoiceCache === 'function') {
      pdfService.clearInvoiceCache(id)
    }

    new OK({
      message: SUCCESS_MESSAGES.CANCELLED,
      data: invoice
    }).send(res)
  }

  /**
   * POST /invoices/:id/replace - Thay thế hoá đơn
   */
  replace = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id } = req.params as UUIDParam
    const input = req.body as InvoiceCreateInput

    const result = await this.invoiceService.replace(id, input)

    if (pdfService && typeof pdfService.clearInvoiceCache === 'function') {
      pdfService.clearInvoiceCache(id)
      if (result.new) {
        pdfService.clearInvoiceCache(result.new.id)
      }
    }

    new OK({
      message: SUCCESS_MESSAGES.REPLACEMENT_CREATED,
      data: result
    }).send(res)
  }

  /**
   * POST /invoices/:id/pdf - Generate PDF
   */
  generatePdf = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id } = req.params as UUIDParam

    const invoice = await this.invoiceService.findById(id)
    if (!invoice) {
      new NOT_FOUND({
        message: ERROR_MESSAGES.NOT_EXISTS
      }).send(res)
      return
    }

    const { fileName } = await pdfService.generatePdf(id)

    new CREATED({
      message: 'PDF generated successfully',
      data: {
        fileName,
        downloadUrl: `/invoices/${id}/pdf`
      }
    }).send(res)
  }

  /**
   * GET /invoices/:id/pdf - Download PDF
   */
  downloadPdf = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params as UUIDParam

      const invoice = await this.invoiceService.findById(id)
      if (!invoice) {
        new NOT_FOUND({
          message: ERROR_MESSAGES.NOT_EXISTS
        }).send(res)
        return
      }

      const pdfInfo = await pdfService.pdfExists(id)
      if (!pdfInfo.exists || !pdfInfo.filePath) {
        new NOT_FOUND({
          message: 'PDF not found. Please generate PDF first.'
        }).send(res)
        return
      }

      const pdfBuffer = await pdfService.readPdf(pdfInfo.filePath)

      if (!pdfBuffer || pdfBuffer.length === 0) {
        new NOT_FOUND({
          message: 'PDF file is empty or corrupted. Please regenerate PDF.'
        }).send(res)
        return
      }

      const fileName = `${invoice.number || `draft-${id}`}.pdf`

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
      res.setHeader('Content-Length', pdfBuffer.length.toString())
      res.setHeader('Cache-Control', 'no-cache')

      res.send(pdfBuffer)
    } catch (error) {
      console.error('Error in downloadPdf:', error)

      if (!res.headersSent) {
        new NOT_FOUND({
          message: 'Failed to download PDF. Please try again.'
        }).send(res)
      }
    }
  }
}
