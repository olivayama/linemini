import { appConfig } from './config'
import { DomainContext } from './domain/context'
import { DomainError } from './domain/errors'
import { AdministratorId, UserId } from './domain/ids'
import { LogContext } from './stdutils/log-context'
import { mapOption } from './stdutils/option'
import { HandlerContext, createContextKey } from '@connectrpc/connect'

export const kNow = createContextKey<Date>(new Date())
export const kLogContext = createContextKey<LogContext | undefined>(undefined)
export const kAppEnv = createContextKey<string>(appConfig.appEnv)
export const kUserSession = createContextKey<{ userId: UserId } | undefined>(undefined)
export const kAdministratorSession = createContextKey<{ administratorId: AdministratorId } | undefined>(undefined)
export const kIsAdminSecretTokenValid = createContextKey<boolean>(false)

export class HandlerDomainContext implements DomainContext {
  constructor(private readonly handlerContext: HandlerContext) {}

  get now() {
    return this.handlerContext.values.get(kNow)
  }

  get appEnv() {
    return this.handlerContext.values.get(kAppEnv)
  }

  get adminSession() {
    return this.handlerContext.values.get(kAdministratorSession)
  }

  get userSession() {
    return this.handlerContext.values.get(kUserSession)
  }

  get isAdminSecretTokenValid() {
    return this.handlerContext.values.get(kIsAdminSecretTokenValid)
  }

  get isUser() {
    return this.userSession != null
  }

  get isAdmin() {
    return this.adminSession != null || this.isAdminSecretTokenValid
  }

  maskAdminValue: <T>(v: T, mask: T) => T = (v, mask) => {
    return this.isAdmin ? v : mask
  }

  requireAdministratorId: () => AdministratorId = () => {
    if (this.adminSession == null) {
      throw new DomainError('Unauthenticated')
    }
    return this.adminSession.administratorId
  }

  requireUserId: () => UserId = () => {
    if (this.userSession == null) {
      throw new DomainError('Unauthenticated')
    }
    return this.userSession.userId
  }

  requireOverridableUserId: (req: { userId?: string }) => UserId | undefined = (req) => {
    return this.isAdmin ? mapOption(req.userId, UserId) : this.requireUserId()
  }

  ensureUserAuthenticated = () => {
    if (!this.isUser) {
      throw new DomainError('Unauthenticated')
    }
  }

  ensureAdminAuthenticated = () => {
    if (!this.isAdmin) {
      throw new DomainError('Unauthenticated')
    }
  }

  ensureAuthenticated = () => {
    if (!this.isUser && !this.isAdmin) {
      throw new DomainError('Unauthenticated')
    }
  }
}
