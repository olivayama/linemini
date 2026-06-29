import { Code, ConnectError } from '@connectrpc/connect'
import { createConnectTransport as createTransportWeb } from '@connectrpc/connect-web'

import { appConfig } from '@/app/config'

export const createConnectTransportUserWeb = (session: { token?: string }) => {
  return createTransportWeb({
    baseUrl: appConfig.connect.baseUrl,
    interceptors: [
      (next) => async (req) => {
        console.log(session)
        if (session.token != null) {
          req.header.append('Authorization', 'Bearer u$' + session.token)
        }
        return await next(req)
      },
    ],
  })
}

export const createConnectTransportAdminWeb = (session: { token?: string }) => {
  return createTransportWeb({
    baseUrl: appConfig.connect.baseUrl,
    interceptors: [
      (next) => async (req) => {
        if (session.token != null) {
          req.header.append('Authorization', 'Bearer a$' + session.token)
        }
        return await next(req)
      },
    ],
  })
}

export const ensureConnectError = (e: unknown) => {
  return e instanceof ConnectError ? e : ConnectError.from(e, Code.Internal)
}
