import { z } from 'zod'

// Schema cho InvoiceItem input
export const InvoiceItemInputSchema = z.object({
  description: z.string().min(1, 'Mô tả không được để trống'),
  quantity: z.number().positive('Số lượng phải lớn hơn 0'),
  unitPrice: z.number().nonnegative('Đơn giá không được âm'),
  taxRate: z.number().min(0, 'Thuế suất không được âm').max(100, 'Thuế suất không được vượt quá 100%')
})

// Schema cho tạo hoá đơn draft
export const InvoiceCreateInputSchema = z.object({
  buyerName: z.string().min(1, 'Tên người mua không được để trống'),
  buyerTaxId: z.string().optional(),
  buyerAddress: z.string().optional(),
  sellerName: z.string().min(1, 'Tên người bán không được để trống'),
  sellerTaxId: z.string().optional(),
  dueDate: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  notes: z.string().optional(),
  items: z.array(InvoiceItemInputSchema).min(1, 'Phải có ít nhất 1 item')
})

// Schema cho cập nhật hoá đơn draft
export const InvoiceUpdateInputSchema = z.object({
  buyerName: z.string().min(1, 'Tên người mua không được để trống').optional(),
  buyerTaxId: z.string().optional(),
  buyerAddress: z.string().optional(),
  sellerName: z.string().min(1, 'Tên người bán không được để trống').optional(),
  sellerTaxId: z.string().optional(),
  dueDate: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  notes: z.string().optional(),
  items: z.array(InvoiceItemInputSchema).optional()
})

// Schema cho cancel invoice
export const InvoiceCancelInputSchema = z.object({
  reason: z.string().min(1, 'Lý do huỷ không được để trống')
})

// Schema cho query parameters
export const InvoiceListQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10)),
  status: z.enum(['draft', 'issued', 'canceled']).optional(),
  q: z.string().optional(), // search query
  buyerName: z.string().optional(),
  issueDateFrom: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  issueDateTo: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined))
})

// Schema cho UUID params
export const UUIDParamSchema = z.object({
  id: z.string().uuid('ID không hợp lệ')
})

// Type exports
export type InvoiceItemInput = z.infer<typeof InvoiceItemInputSchema>
export type InvoiceCreateInput = z.infer<typeof InvoiceCreateInputSchema>
export type InvoiceUpdateInput = z.infer<typeof InvoiceUpdateInputSchema>
export type InvoiceCancelInput = z.infer<typeof InvoiceCancelInputSchema>
export type InvoiceListQuery = z.infer<typeof InvoiceListQuerySchema>
export type UUIDParam = z.infer<typeof UUIDParamSchema>
