import { Response } from 'express'
import { httpStatusCode, reasonPhrases } from './httpStatusCode'

interface SuccessResponseParams<TData = unknown> {
  readonly message?: string
  readonly statusCode?: number
  readonly reasonStatusCode?: string
  readonly data?: TData
}

/**
 * Base class cho tất cả success responses
 * Đảm bảo format response consistent across API
 */
class SuccessResponse<TData = unknown> {
  readonly message: string
  readonly status: number
  readonly success = true as const
  readonly data?: TData

  constructor({
    message,
    statusCode = httpStatusCode.OK,
    reasonStatusCode = reasonPhrases.OK,
    data
  }: SuccessResponseParams<TData>) {
    this.message = message || reasonStatusCode
    this.status = statusCode
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

interface OKParams<TData = unknown> {
  readonly message?: string
  readonly data?: TData
}

/**
 * 200 OK Response - Thành công
 */
class OK<TData = unknown> extends SuccessResponse<TData> {
  constructor({ message, data }: OKParams<TData>) {
    super({ message, data })
  }
}

interface CreatedParams<TData = unknown> {
  readonly message?: string
  readonly data?: TData
}

/**
 * 201 Created Response - Tạo mới thành công
 */
class CREATED<TData = unknown> extends SuccessResponse<TData> {
  constructor({ message, data }: CreatedParams<TData>) {
    super({
      message,
      statusCode: httpStatusCode.CREATED,
      reasonStatusCode: reasonPhrases.CREATED,
      data
    })
  }
}

export { SuccessResponse, OK, CREATED }
