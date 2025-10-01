import { Response } from 'express'
import { httpStatusCode, reasonPhrases } from './httpStatusCode'

interface ErrorResponseParams<TData = unknown> {
  readonly message?: string
  readonly statusCode?: number
  readonly reasonStatusCode?: string
  readonly data?: TData
}

class ErrorResponse<TData = unknown> {
  readonly message: string
  readonly status: number
  readonly success = false as const
  readonly data?: TData

  constructor({ message, statusCode, reasonStatusCode, data }: ErrorResponseParams<TData>) {
    this.message = message || reasonStatusCode || 'Unknown error'
    this.status = statusCode || httpStatusCode.INTERNAL_SERVER_ERROR
    this.data = data
  }

  send(res: Response, headers: Record<string, string> = {}) {
    Object.entries(headers).forEach(([key, value]) => {
      res.set(key, value)
    })

    return res.status(this.status).json({
      success: this.success,
      message: this.message,
      data: this.data
    })
  }
}

const createErrorResponse = <TData = unknown>(statusCode: number, reasonStatusCode: string) => {
  return class extends ErrorResponse<TData> {
    constructor({ message, data }: { message?: string; data?: TData }) {
      super({ message, statusCode, reasonStatusCode, data })
    }
  }
}

const BAD_REQUEST = createErrorResponse(httpStatusCode.BAD_REQUEST, reasonPhrases.BAD_REQUEST)
const UNAUTHORIZED = createErrorResponse(httpStatusCode.UNAUTHORIZED, reasonPhrases.UNAUTHORIZED)
const NOT_FOUND = createErrorResponse(httpStatusCode.NOT_FOUND, reasonPhrases.NOT_FOUND)
const FORBIDDEN = createErrorResponse(httpStatusCode.FORBIDDEN, reasonPhrases.FORBIDDEN)
const INTERNAL_SERVER_ERROR = createErrorResponse(
  httpStatusCode.INTERNAL_SERVER_ERROR,
  reasonPhrases.INTERNAL_SERVER_ERROR
)
const CONFLICT = createErrorResponse(httpStatusCode.CONFLICT, reasonPhrases.CONFLICT)
export { ErrorResponse, BAD_REQUEST, UNAUTHORIZED, NOT_FOUND, FORBIDDEN, INTERNAL_SERVER_ERROR, CONFLICT }
