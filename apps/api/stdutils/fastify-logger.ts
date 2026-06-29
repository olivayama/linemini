import { appConfig } from '@/config'
import { getLogFieldsForRequest } from '@/stdutils/log-context'
import { FastifyServerOptions } from 'fastify'

// default loggers:
//   req: {"level":30,"time":1702777183797,"pid":8,"hostname":"...","reqId":"req-a8ep","req":{"method":"GET","url":"/health",...},"msg":"incoming request"}
//   res: {"level":30,"time":1702777183797,"pid":8,"hostname":"...","reqId":"req-a8ep","res":{"statusCode":200},"responseTime":0.27,"msg":"request completed"}

type ReqSerializerInput = {
  url?: string
  method?: string
  headers?: unknown
}

type ResSerializerInput = {
  statusCode?: number
  request?: {
    url?: string
    method?: string
  }
}

const serializers = {
  req(request: ReqSerializerInput) {
    return {
      ...getLogFieldsForRequest(request),
      method: request.method,
      url: request.url,
      headers: request.headers,
    }
  },
  res(reply: ResSerializerInput) {
    return {
      ...(reply.request != null ? getLogFieldsForRequest(reply.request) : undefined),
      statusCode: reply.statusCode,
      method: reply.request?.method,
      url: reply.request?.url,
    }
  },
}

const loggerBaseOptions = {
  redact: ['req.headers.authorization', 'req.headers.cookie'],
  serializers,
}

// devMode(LOGGING_DEV_MODE)ではローカル向けに pino-pretty で人間可読に整形し、
// それ以外は本番同様の素の JSON(level: info)で出力する。serializers / redact は両者で共有する。
export const fastifyLogger: FastifyServerOptions['logger'] = appConfig.logging.devMode
  ? {
      ...loggerBaseOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    }
  : {
      ...loggerBaseOptions,
      level: 'info',
    }
