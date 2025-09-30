// ===========================================
// Advanced Type Definitions for BINVOICE API
// ===========================================

import { Request } from 'express'
import { ZodIssue } from 'zod'
import { Prisma } from '@prisma/client'

/**
 * Enhanced Express Request with validated data
 */
export interface ValidatedRequest<TBody = unknown, TQuery = unknown, TParams = unknown>
  extends Request<TParams, unknown, TBody, TQuery> {
  validatedQuery?: TQuery
  validatedBody?: TBody
  validatedParams?: TParams
}

/**
 * Validation error details from Zod
 */
export interface ValidationErrorDetail {
  readonly path: string
  readonly message: string
  readonly code?: string
  readonly received?: unknown
  readonly expected?: string[]
}

/**
 * Standardized validation error response
 */
export interface ValidationErrorResponse {
  readonly error: 'Validation Error'
  readonly message: string
  readonly details: readonly ValidationErrorDetail[]
}

/**
 * Prisma error types for better error handling
 */
export interface PrismaError extends Error {
  readonly code: string
  readonly meta?: {
    readonly target?: string[]
    readonly field_name?: string
    readonly table?: string
    readonly constraint?: string
  }
}

/**
 * Application error types
 */
export type ApplicationError = PrismaError | ValidationError | BusinessLogicError | NotFoundError | ConflictError

export interface ValidationError extends Error {
  readonly type: 'VALIDATION_ERROR'
  readonly details: readonly ValidationErrorDetail[]
}

export interface BusinessLogicError extends Error {
  readonly type: 'BUSINESS_ERROR'
  readonly code?: string
}

export interface NotFoundError extends Error {
  readonly type: 'NOT_FOUND'
  readonly resource?: string
}

export interface ConflictError extends Error {
  readonly type: 'CONFLICT'
  readonly constraint?: string
}

/**
 * Strongly typed API response format
 */
export interface SuccessResponse<TData = unknown> {
  readonly success: true
  readonly message: string
  readonly data: TData
}

export interface ErrorResponse {
  readonly success: false
  readonly message: string
  readonly error: string
  readonly details?: readonly ValidationErrorDetail[]
}

export type ApiResponse<TData = unknown> = SuccessResponse<TData> | ErrorResponse

/**
 * Prisma where condition builder types
 */
export type InvoiceFilterCondition = Prisma.InvoiceWhereInput

/**
 * Helper to transform Zod issues to validation errors
 */
export const transformZodIssue = (issue: ZodIssue): ValidationErrorDetail =>
  ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code
  }) as const

/**
 * Type-safe error handler types
 */
export interface ErrorHandler {
  (error: ApplicationError): ErrorResponse
}

/**
 * Database transaction type alias
 */
export type DatabaseTransaction = Prisma.TransactionClient

/**
 * Type guards for error identification
 */
export const isPrismaError = (error: unknown): error is PrismaError => {
  return error instanceof Error && 'code' in error && typeof (error as Error & { code: string }).code === 'string'
}

export const isValidationError = (error: unknown): error is ValidationError => {
  return error instanceof Error && 'type' in error && (error as Error & { type: string }).type === 'VALIDATION_ERROR'
}

export const isBusinessLogicError = (error: unknown): error is BusinessLogicError => {
  return error instanceof Error && 'type' in error && (error as Error & { type: string }).type === 'BUSINESS_ERROR'
}

/**
 * Request handler return types
 */
export type AsyncRequestHandler<TData = unknown> = Promise<SuccessResponse<TData>>

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  readonly page: number
  readonly limit: number
  readonly total: number
  readonly totalPages: number
  readonly hasNextPage: boolean
  readonly hasPrevPage: boolean
}

/**
 * Enhanced pagination result with metadata
 */
export type PaginatedResponse<TData> = SuccessResponse<{
  readonly items: readonly TData[]
  readonly meta: PaginationMeta
}>
