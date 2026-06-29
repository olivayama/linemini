import { AsyncLocalStorage } from 'async_hooks'
import { FastifyBaseLogger } from 'fastify'

export type LogContext = {
  userId?: string
  administratorId?: string
  logger?: FastifyBaseLogger
}

const asyncLocalStorage = new AsyncLocalStorage<LogContext>()
const requestLogContexts = new WeakMap<object, LogContext>()
let rootLogger: FastifyBaseLogger | undefined

export const setRootLogger = (logger: FastifyBaseLogger) => {
  rootLogger = logger
}

export const runWithLogContext = <T>(context: LogContext, fn: () => T): T => {
  return asyncLocalStorage.run(context, fn)
}

export const getLogContext = (): LogContext | undefined => {
  return asyncLocalStorage.getStore()
}

export const getLogger = (): FastifyBaseLogger | undefined => {
  return getLogContext()?.logger ?? rootLogger
}

export const setLogContextForRequest = (request: object, context: LogContext) => {
  requestLogContexts.set(request, context)
}

export const getLogContextForRequest = (request: object): LogContext | undefined => {
  return requestLogContexts.get(request)
}

export const getLogFieldsForRequest = (request: object): Omit<LogContext, 'logger'> | undefined => {
  const context = getLogContextForRequest(request)
  if (context == null) return
  return {
    userId: context.userId,
    administratorId: context.administratorId,
  }
}
