import request from 'supertest'
import { app } from '../src/app'

describe('Health Endpoint Test', () => {
  it('should return 200 for health endpoint', async () => {
    const response = await request(app).get('/api/v1/health').expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.message).toBe('Welcome to Binvoice API')
  })
})
