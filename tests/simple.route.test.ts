import request from 'supertest'
import { app } from '../src/app'

describe('Route Test', () => {
  it('should debug POST /api/v1/invoices', async () => {
    const response = await request(app)
      .post('/api/v1/invoices')
      .send({
        buyerName: 'Test Buyer',
        sellerName: 'Test Seller',
        items: [
          {
            description: 'Test Item',
            quantity: 1,
            unitPrice: 100,
            taxRate: 10
          }
        ]
      })

    console.log('Response status:', response.status)
    console.log('Response body:', response.body)
  })
})
