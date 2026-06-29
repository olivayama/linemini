import { errorHandler } from '../interceptors'
import { appConfig } from '@/config'
import { kAdministratorSession, kAppEnv, kNow, kUserSession } from '@/context'
import { DomainContext } from '@/domain/context'
import { DomainError } from '@/domain/errors'
import { AdministratorId, UserId } from '@/domain/ids'
import { connectDBPool, disconnectDBPool } from '@/stdutils/db-pool'
import { mapOption } from '@/stdutils/option'
import { ServiceType } from '@bufbuild/protobuf'
import {
  Code,
  ConnectError,
  PromiseClient,
  ServiceImpl,
  createPromiseClient,
  createRouterTransport,
} from '@connectrpc/connect'

const TEST_USER_ID = UserId('test-user')
const TEST_ADMIN_ID = AdministratorId('test-admin')

export const connectIxTestDbPool = () =>
  connectDBPool<DB>({
    writer: appConfig.mysql,
    reader: appConfig.mysqlReadOnly,
  })

export const disconnectIxTestDbPool = async (pool: ReturnType<typeof connectIxTestDbPool> | undefined) => {
  if (pool != null) await disconnectDBPool(pool)
}

// session の有無から全メンバを導出して DomainContext を組む。
// HandlerDomainContext(本番)の導出をミラーし、withoutUserSession/withoutAdminSession で
// セッションを外したときに isUser/isAdmin・require*・ensure* が一貫して追従するようにする。
const buildTestDomainContext = (input: {
  now: Date
  userSession?: { userId: UserId }
  adminSession?: { administratorId: AdministratorId }
}): DomainContext => {
  const { now, userSession, adminSession } = input
  const isAdminSecretTokenValid = false
  const isUser = userSession != null
  const isAdmin = adminSession != null || isAdminSecretTokenValid

  const requireUserId = (): UserId => {
    if (userSession == null) throw new DomainError('Unauthenticated')
    return userSession.userId
  }

  return {
    now,
    userSession,
    adminSession,
    isAdminSecretTokenValid,
    isUser,
    isAdmin,
    maskAdminValue: <T>(v: T, mask: T) => (isAdmin ? v : mask),
    requireAdministratorId: () => {
      if (adminSession == null) throw new DomainError('Unauthenticated')
      return adminSession.administratorId
    },
    requireUserId,
    requireOverridableUserId: (req) => (isAdmin ? mapOption(req.userId, UserId) : requireUserId()),
    ensureUserAuthenticated: () => {
      if (!isUser) throw new DomainError('Unauthenticated')
    },
    ensureAdminAuthenticated: () => {
      if (!isAdmin) throw new DomainError('Unauthenticated')
    },
    ensureAuthenticated: () => {
      if (!isUser && !isAdmin) throw new DomainError('Unauthenticated')
    },
  }
}

export const makeTestDomainContext = (input: {
  now: Date
  userId?: UserId
  adminId?: AdministratorId
}): DomainContext =>
  buildTestDomainContext({
    now: input.now,
    userSession: { userId: input.userId ?? TEST_USER_ID },
    adminSession: { administratorId: input.adminId ?? TEST_ADMIN_ID },
  })

export const withoutUserSession = (ctx: DomainContext): DomainContext =>
  buildTestDomainContext({ now: ctx.now, userSession: undefined, adminSession: ctx.adminSession })

export const withoutAdminSession = (ctx: DomainContext): DomainContext =>
  buildTestDomainContext({ now: ctx.now, userSession: ctx.userSession, adminSession: undefined })

export const makeTestServiceClient = <T extends ServiceType>(
  service: T,
  impl: ServiceImpl<T>,
  ctx: DomainContext,
  options?: { appEnv?: string },
): PromiseClient<T> =>
  createPromiseClient(
    service,
    createRouterTransport((router) => router.service(service, impl), {
      router: {
        interceptors: [
          (next) => (req) => {
            req.contextValues
              .set(kNow, ctx.now)
              .set(kUserSession, ctx.userSession)
              .set(kAdministratorSession, ctx.adminSession)
            if (options?.appEnv != null) {
              req.contextValues.set(kAppEnv, options.appEnv)
            }
            return next(req)
          },
          errorHandler,
        ],
      },
    }),
  )

export const expectConnectError =
  (code: Code) =>
  (err: unknown): boolean =>
    err instanceof ConnectError && err.code === code
