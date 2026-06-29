import { appConfig } from './config'
import { kLogContext, kNow } from './context'
import { createAdministratorWithoutInvitation } from './domain/administrator'
import { DomainContext } from './domain/context'
import { DomainEventEmitter } from './domain/event'
import { AdministratorId } from './domain/ids'
import { AdministratorRepository } from './domain/repositories'
import { MailerImpl } from './externals/mailer'
import { ObjectStorageImpl } from './externals/object_storage'
import { AdministratorServiceV1, AdministratorServiceV1Gen } from './services/administrator_service_v1'
import { ImageServiceV1, ImageServiceV1Gen } from './services/image_service_v1'
import { authenticator, errorHandler, logContext } from './services/interceptors'
import { UserServiceV1, UserServiceV1Gen } from './services/user_service_v1'
import { fastifyLogger } from './stdutils/fastify-logger'
import { setLogContextForRequest, setRootLogger } from './stdutils/log-context'
import { AdministratorRepositoryImpl } from '@/repositories/administrator/administrator-repository'
import { ImageRepositoryImpl } from '@/repositories/image/image-repository'
import { ImageTagRepositoryImpl } from '@/repositories/image/image-tag-repository'
import { UserRepositoryImpl } from '@/repositories/user/user-repository'
import { connectDBPool, Pool } from '@/stdutils/db-pool'
import { createContextValues } from '@connectrpc/connect'
import { cors } from '@connectrpc/connect'
import { fastifyConnectPlugin } from '@connectrpc/connect-fastify'
import fastifyCors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { fastify } from 'fastify'
import { Kysely, sql, Transaction } from 'kysely'

/**
 * DB 接続時の TLS/SSL 状態をログに出力する
 *
 * アプリケーションの mysql2 クライアント経由で `SHOW SESSION STATUS` /
 * `SHOW VARIABLES` を実行し、ECS (Fargate) から Aurora RDS への接続が
 * 暗号化されていることの証跡を CloudWatch Logs に残す。
 *
 * セキュリティ監査・ペネトレーションテストでの暗号化エビデンス提出時に、
 * CloudWatch Logs Insights で `tag=DB_CONNECTION_STATUS` を検索することで取得できる。
 *
 * 本リポジトリの DB 接続は `apps/api/config.ts` の `ssl: awsCaBundle` により
 * localhost 以外の環境で常に TLS/SSL 接続となる。
 */
const logDatabaseConnectionStatus = async (db: Pool<DB>) => {
  type ConnectionStatus = {
    sessionStatus: Array<{ Variable_name: string; Value: string }>
    variables: Array<{ Variable_name: string; Value: string }>
    error?: string
  }

  const fetchStatus = async (client: Kysely<DB>): Promise<ConnectionStatus> => {
    try {
      const sessionStatus = await sql<{ Variable_name: string; Value: string }>`
        SHOW SESSION STATUS WHERE Variable_name IN (
          'Ssl_cipher', 'Ssl_version', 'Ssl_verify_mode', 'Ssl_verify_depth'
        )
      `.execute(client)

      const variables = await sql<{ Variable_name: string; Value: string }>`
        SHOW VARIABLES WHERE Variable_name IN (
          'have_ssl', 'have_openssl', 'require_secure_transport'
        )
      `.execute(client)

      return { sessionStatus: sessionStatus.rows, variables: variables.rows }
    } catch (e) {
      return { sessionStatus: [], variables: [], error: String(e) }
    }
  }

  const [writer, reader] = await Promise.all([fetchStatus(db.writer), fetchStatus(db.reader)])

  console.log(
    JSON.stringify({
      tag: 'DB_CONNECTION_STATUS',
      appEnv: appConfig.appEnv,
      writer,
      reader,
    }),
  )
}

const createInitialAdministratorIfNeeded = async (
  administratorRepository: AdministratorRepository<Transaction<DB>>,
) => {
  if (appConfig.initialAdministrator == null) return

  const ctx = {
    now: new Date(),
    adminSession: {
      administratorId: AdministratorId('$system'),
    },
    isAdminSecretTokenValid: false,
    isUser: false,
    isAdmin: false,
    maskAdminValue: (value, mask) => value,
    requireAdministratorId: () => AdministratorId('$system'),
    requireOverridableUserId: () => {
      throw new Error('unexpected')
    },
    requireUserId: () => {
      throw new Error('unexpected')
    },
    ensureUserAuthenticated: () => {
      throw new Error('unexpected')
    },
    ensureAdminAuthenticated: () => {
      throw new Error('unexpected')
    },
    ensureAuthenticated: () => {
      throw new Error('unexpected')
    },
  } satisfies DomainContext

  try {
    const administrators = await administratorRepository.offsetPagingList(ctx, {
      paging: { limit: 1, offset: 0 },
      orderBy: [{ key: 'id' }],
    })
    if (administrators.paging.totalCount === 0n) {
      const initialAdministrator = await createAdministratorWithoutInvitation(ctx, {
        email: appConfig.initialAdministrator.email,
        password: appConfig.initialAdministrator.password,
      })
      await administratorRepository.persistCreate(ctx, initialAdministrator)
    }
  } catch (e) {
    // NOTE: エラー発生時もサーバは起動して欲しいので、ログ出力のみとする
    console.error(e)
  }
}

export const build = async (db: Pool<DB>) => {
  const domainEventEmitter = new DomainEventEmitter<Transaction<DB>>()

  const userRepository = new UserRepositoryImpl(db, domainEventEmitter)
  const administratorRepository = new AdministratorRepositoryImpl(db, domainEventEmitter)
  const imageRepository = new ImageRepositoryImpl(db, domainEventEmitter)
  const imageTagRepository = new ImageTagRepositoryImpl(db, domainEventEmitter)
  const objectStorage = new ObjectStorageImpl()
  const mailer = new MailerImpl()

  await logDatabaseConnectionStatus(db)
  await createInitialAdministratorIfNeeded(administratorRepository)

  // ロガー設定(serializers / redact)は ./stdutils/fastify-logger に集約している
  const server = fastify({
    logger: fastifyLogger,
  })
  setRootLogger(server.log)

  await server.register(helmet, { contentSecurityPolicy: false })
  await server.register(fastifyCors, {
    origin: appConfig.cors.origins,
    methods: [...cors.allowedMethods],
    allowedHeaders: [...cors.allowedHeaders, ...appConfig.cors.allowHeaders],
    exposedHeaders: [...cors.exposedHeaders],
    maxAge: appConfig.cors.maxAge,
  })

  await server.register(fastifyConnectPlugin, {
    routes: (router) =>
      router
        .service(UserServiceV1Gen, new UserServiceV1(userRepository))
        .service(AdministratorServiceV1Gen, new AdministratorServiceV1(administratorRepository, mailer))
        .service(ImageServiceV1Gen, new ImageServiceV1(imageRepository, imageTagRepository, objectStorage)),
    contextValues: (req) => {
      const logContextValue = { logger: req.log }
      setLogContextForRequest(req, logContextValue)
      return createContextValues().set(kNow, new Date()).set(kLogContext, logContextValue)
    },
    interceptors: [logContext, errorHandler, authenticator],
  })

  server.get('/', { logLevel: 'silent' }, (req, res) => {
    res.send('ok')
  })

  server.get('/health', { logLevel: 'silent' }, (req, res) => {
    res.send('ok')
  })

  return server
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully')
    server.close()
  })

  const dbPool = connectDBPool<DB>({
    writer: appConfig.mysql,
    reader: appConfig.mysqlReadOnly,
  })
  const server = await build(dbPool)
  await server.listen({
    host: '0.0.0.0',
    port: 4000,
  })
}
