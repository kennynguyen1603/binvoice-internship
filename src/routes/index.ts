import { Router } from 'express'
import { invoiceRoutes } from './invoice.routes'
import { OK } from '../core/succes.response'

const rootRouterV1 = Router()

rootRouterV1.get('/health', (_req, res) => {
  new OK({
    message: 'Welcome to Binvoice API',
    data: {
      timestamp: new Date().toISOString(),
      service: 'BINVOICE API'
    }
  }).send(res)
})

const defaultRoutes = [
  {
    path: '/invoices',
    route: invoiceRoutes
  }
]

defaultRoutes.forEach((route) => {
  rootRouterV1.use(route.path, route.route)
})

export default rootRouterV1
