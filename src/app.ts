import express, { Application } from 'express'
import { isPrismaError } from './types/common'
import rootRouterV1 from './routes'
import compression from 'compression'
import morgan from 'morgan'
import helmet from 'helmet'
import cors from 'cors'

const app: Application = express()

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "'data:'"]
      }
    }
  })
)

app.use(compression())
app.use(morgan('dev'))
app.use(cors())

app.use('/api/v1', rootRouterV1)

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint không tìm thấy'
  })
})

app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', error)

  if (error && typeof error === 'object' && 'send' in error && typeof error.send === 'function') {
    return (error as { send: (res: express.Response) => void }).send(res)
  }

  if (isPrismaError(error)) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Dữ liệu đã tồn tại (unique constraint)',
        error: 'DUPLICATE_ERROR'
      })
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bản ghi',
        error: 'NOT_FOUND'
      })
    }
  }

  if (error instanceof Error && error.message) {
    return res.status(400).json({
      success: false,
      message: error.message,
      error: 'BUSINESS_ERROR'
    })
  }

  res.status(500).json({
    success: false,
    message: 'Lỗi máy chủ nội bộ',
    error: 'INTERNAL_SERVER_ERROR'
  })
})

export { app }
