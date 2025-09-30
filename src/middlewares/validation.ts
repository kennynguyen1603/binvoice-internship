import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError, ZodIssue } from 'zod'
import { transformZodIssue, type ValidatedRequest } from '../types/common'
import { ERROR_MESSAGES } from '../constants/messages/invoice.message'

/**
 * Middleware để validate request body bằng Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          message: ERROR_MESSAGES.INVALID_INPUT_DATA,
          details: error.issues.map((err: ZodIssue) => transformZodIssue(err))
        })
      }
      next(error)
    }
  }
}

/**
 * Middleware để validate query parameters
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.query)
      // Use a different property to avoid Express 5.x issues
      ;(req as ValidatedRequest).validatedQuery = parsed
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          message: ERROR_MESSAGES.INVALID_QUERY_PARAMS,
          details: error.issues.map((err: ZodIssue) => transformZodIssue(err))
        })
      }
      next(error)
    }
  }
}

/**
 * Middleware để validate route parameters
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.params)
      Object.assign(req.params, parsed)
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          message: ERROR_MESSAGES.INVALID_ROUTE_PARAMS,
          details: error.issues.map((err: ZodIssue) => transformZodIssue(err))
        })
      }
      next(error)
    }
  }
}
