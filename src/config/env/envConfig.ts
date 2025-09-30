import { Static, Type } from '@sinclair/typebox'
import envSchema from 'env-schema'

enum NodeEnv {
  development = 'development',
  production = 'production',
  test = 'test'
}

export enum LogLevel {
  debug = 'debug',
  info = 'info',
  warn = 'warn',
  error = 'error'
}

const schema = Type.Object({
  // Database
  DATABASE_URL: Type.String(),

  // Redis
  REDIS_URL: Type.String({ default: 'redis://localhost:6379' }),

  // Server
  LOG_LEVEL: Type.Enum(LogLevel),
  NODE_ENV: Type.Enum(NodeEnv),
  HOST: Type.String({ default: 'localhost' }),
  PORT: Type.Number({ default: 8080 })
})

const env = envSchema<Static<typeof schema>>({
  dotenv: true,
  schema
})

export default {
  nodeEnv: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === NodeEnv.development,
  isProduction: env.NODE_ENV === NodeEnv.production,
  isTest: env.NODE_ENV === NodeEnv.test,

  log: {
    level: env.LOG_LEVEL
  },

  server: {
    host: env.HOST,
    port: env.PORT
  },

  db: {
    url: env.DATABASE_URL
  },

  redis: {
    url: env.REDIS_URL
  }
}
