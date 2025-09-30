import { Request, Response, NextFunction, RequestHandler } from 'express'
import { logger } from './logger'

/**
 * Wrapper cho async request handlers để tự động catch errors
 * Loại bỏ việc phải viết try-catch trong từng controller method
 */
export const wrapRequestHandler = <P = unknown, ResBody = unknown, ReqBody = unknown, ReqQuery = unknown>(
  fn: (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction) => Promise<void> | void
): RequestHandler<P, ResBody, ReqBody, ReqQuery> => {
  return (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      logger.error('Error caught in wrapRequestHandler:', err)
      next(err)
    })
  }
}

/**
 * Alias cho wrapRequestHandler để dễ sử dụng
 * Sử dụng: wrapAsyncHandler(controller.method)
 */
export const wrapAsyncHandler = wrapRequestHandler
