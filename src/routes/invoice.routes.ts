import { Router } from 'express'
import { InvoiceController } from '../controllers/invoice.controller'
import { validateBody, validateQuery, validateParams } from '../middlewares/validation'
import { wrapAsyncHandler } from '../utils/wrap-handler'
import {
  InvoiceCreateInputSchema,
  InvoiceUpdateInputSchema,
  InvoiceCancelInputSchema,
  InvoiceListQuerySchema,
  UUIDParamSchema
} from '../schemas/invoice.schema'

const router = Router()
const invoiceController = new InvoiceController()

// POST /invoices - Tạo hoá đơn draft
router.post('/', validateBody(InvoiceCreateInputSchema), wrapAsyncHandler(invoiceController.createDraft))

// GET /invoices - Lấy danh sách hoá đơn với filter & pagination
router.get('/', validateQuery(InvoiceListQuerySchema), wrapAsyncHandler(invoiceController.list))

// GET /invoices/number/:number - Tìm hoá đơn theo số
router.get('/number/:number', wrapAsyncHandler(invoiceController.getByNumber))

// GET /invoices/:id - Lấy chi tiết hoá đơn
router.get('/:id', validateParams(UUIDParamSchema), wrapAsyncHandler(invoiceController.getById))

// PATCH /invoices/:id - Cập nhật hoá đơn draft
router.patch(
  '/:id',
  validateParams(UUIDParamSchema),
  validateBody(InvoiceUpdateInputSchema),
  wrapAsyncHandler(invoiceController.updateDraft)
)

// DELETE /invoices/:id - Xoá hoá đơn draft
router.delete('/:id', validateParams(UUIDParamSchema), wrapAsyncHandler(invoiceController.deleteDraft))

// POST /invoices/:id/issue - Xuất hoá đơn
router.post('/:id/issue', validateParams(UUIDParamSchema), wrapAsyncHandler(invoiceController.issue))

// POST /invoices/:id/cancel - Huỷ hoá đơn
router.post(
  '/:id/cancel',
  validateParams(UUIDParamSchema),
  validateBody(InvoiceCancelInputSchema),
  wrapAsyncHandler(invoiceController.cancel)
)

// POST /invoices/:id/replace - Thay thế hoá đơn
router.post(
  '/:id/replace',
  validateParams(UUIDParamSchema),
  validateBody(InvoiceCreateInputSchema),
  wrapAsyncHandler(invoiceController.replace)
)

// POST /invoices/:id/pdf - Generate PDF
router.post('/:id/pdf', validateParams(UUIDParamSchema), wrapAsyncHandler(invoiceController.generatePdf))

// GET /invoices/:id/pdf - Download PDF
router.get('/:id/pdf', validateParams(UUIDParamSchema), wrapAsyncHandler(invoiceController.downloadPdf))

export { router as invoiceRoutes }
