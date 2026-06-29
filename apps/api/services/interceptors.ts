import { appConfig } from '@/config'
import { kAdministratorSession, kIsAdminSecretTokenValid, kLogContext, kUserSession } from '@/context'
import { verifyAdministratorAccessToken } from '@/domain/administrator'
import { DomainError } from '@/domain/errors'
import { verifyUserAccessToken } from '@/domain/user'
import { runWithLogContext } from '@/stdutils/log-context'
import { log } from '@/stdutils/structured-logger'
import { Code, ConnectError, type Interceptor } from '@connectrpc/connect'

export const logContext: Interceptor = (next) => async (req) => {
  return await runWithLogContext(req.contextValues.get(kLogContext) ?? {}, () => next(req))
}

export const authenticator: Interceptor = (next) => async (req) => {
  if ((req.message as { adminSecretToken?: string }).adminSecretToken === appConfig.admin.secretToken) {
    req.contextValues.set(kIsAdminSecretTokenValid, true)
  }

  const authorizationHeader = req.header.get('Authorization')

  if (authorizationHeader == null || authorizationHeader === '') {
    return await next(req)
  }
  const [type, token] = (authorizationHeader.split(' ')[1] ?? '').split('$')
  if (token == null || token === '') {
    return await next(req)
  }

  switch (type) {
    case 'a':
      const adminSession = await verifyAdministratorAccessToken(token)
      if (adminSession == null) {
        return await next(req)
      }
      req.contextValues.set(kAdministratorSession, adminSession)
      const adminLogContext = req.contextValues.get(kLogContext)
      if (adminLogContext != null) {
        adminLogContext.administratorId = adminSession.administratorId
        adminLogContext.logger = adminLogContext.logger?.child({ administratorId: adminSession.administratorId })
      }
      return await next(req)
    case 'u':
      const userSession = await verifyUserAccessToken(token)
      if (userSession == null) {
        return await next(req)
      }
      req.contextValues.set(kUserSession, userSession)
      const userLogContext = req.contextValues.get(kLogContext)
      if (userLogContext != null) {
        userLogContext.userId = userSession.userId
        userLogContext.logger = userLogContext.logger?.child({ userId: userSession.userId })
      }
      return await next(req)
    default:
      return await next(req)
  }
}

const serializeError = (e: unknown) => {
  if (e instanceof Error) {
    return {
      errorName: e.name,
      errorMessage: e.message,
      errorStack: e.stack,
    }
  }
  return {
    errorName: typeof e,
    errorMessage: String(e),
  }
}

export const errorHandler: Interceptor = (next) => async (req) => {
  return await next(req).catch((e) => {
    if (e instanceof DomainError) {
      const code = domainErrorToConnectErrorCode(e)
      // サーバ起因の異常(Internal / Unavailable)は error、業務エラーは warn で出し分ける
      const serverFault = code === Code.Internal || code === Code.Unavailable
      log(serverFault ? 'error' : 'warn', 'connect_domain_error', {
        ...serializeError(e),
        domainErrorCode: e.code,
        connectCode: code,
      })
      return Promise.reject(new ConnectError(e.code, code))
    }

    log('error', 'connect_unexpected_error', {
      ...serializeError(e),
      connectCode: e instanceof ConnectError ? e.code : undefined,
    })
    return Promise.reject(e)
  })
}

export const domainErrorToConnectErrorCode = (e: DomainError): Code => {
  switch (e.code) {
    case 'InvalidArgument':
      return Code.InvalidArgument
    case 'EntityNotFound':
      return Code.NotFound
    case 'EntityAlreadyExists':
      return Code.AlreadyExists
    case 'PermissionDenied':
      return Code.PermissionDenied
    case 'ResourceExhausted':
      return Code.ResourceExhausted
    case 'FailedPrecondition':
      return Code.FailedPrecondition
    case 'OutOfRange':
      return Code.OutOfRange
    case 'OperationNotImplemented':
      return Code.Unimplemented
    case 'Internal':
    case 'EntityRefsInvariantViolation':
    case 'FailedToAcquireLock':
      return Code.Internal
    case 'Unavailable':
      return Code.Unavailable
    case 'Unauthenticated':
      return Code.Unauthenticated
  }
}
