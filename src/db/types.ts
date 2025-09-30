import { Prisma } from '@prisma/client'

// =============================================
// Invoice Related Types
// =============================================

// Định nghĩa các include patterns sử dụng nhiều
export const invoiceInclude = {
  items: true,
  replacementOf: true,
  replacedBy: true
} as const

// Include pattern tối ưu cho listing (không có circular refs)
export const invoiceListInclude = {
  items: true,
  replacementOf: {
    select: {
      id: true,
      number: true,
      status: true,
      issueDate: true,
      buyerName: true,
      grandTotal: true
    }
  },
  replacedBy: {
    select: {
      id: true,
      number: true,
      status: true,
      issueDate: true,
      buyerName: true,
      grandTotal: true
    }
  }
} as const

// Types for Invoice operations với full relations
export type InvoiceWithItems = Prisma.InvoiceGetPayload<{
  include: typeof invoiceInclude
}>

// Type tối ưu cho listing
export type InvoiceWithItemsList = Prisma.InvoiceGetPayload<{
  include: typeof invoiceListInclude
}>

// Types cho các operations cơ bản
export type InvoiceCreateInput = Prisma.InvoiceCreateInput
export type InvoiceUpdateInput = Prisma.InvoiceUpdateInput
export type InvoiceItemCreateInput = Prisma.InvoiceItemCreateInput

// Types for filters and queries
export type InvoiceWhereInput = Prisma.InvoiceWhereInput
export type InvoiceOrderByInput = Prisma.InvoiceOrderByWithRelationInput

// Transaction type for Prisma
export type PrismaTransaction = Prisma.TransactionClient

// =============================================
// Enums
// =============================================

// Enum values cho Invoice Status
export const InvoiceStatus = {
  draft: 'draft',
  issued: 'issued',
  canceled: 'canceled'
} as const

export type InvoiceStatusType = (typeof InvoiceStatus)[keyof typeof InvoiceStatus]

// =============================================
// Utility Types
// =============================================

// Pagination input parameters
export interface PaginationInput {
  page?: number
  limit?: number
}

// Pagination result wrapper
export interface PaginationResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// API Response wrapper (deprecated - use types/common.ts)
export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  error?: string
}

// =============================================
// Constants
// =============================================

export const DEFAULT_PAGE_SIZE = 10
export const MAX_PAGE_SIZE = 100
