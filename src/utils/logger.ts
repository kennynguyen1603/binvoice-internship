import env from '#config/env'
import pino from 'pino'

const createLogger = () => {
  const logLevel = env.log?.level || (env.isProduction ? 'warn' : 'debug')

  return pino({
    level: logLevel,
    transport: env.isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
          }
        }
      : undefined,
    base: {
      pid: process.pid,
      hostname: require('os').hostname()
    },
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err
    }
  })
}

export const logger = createLogger()

export const createChildLogger = (bindings: Record<string, any>) => {
  return logger.child(bindings)
}
