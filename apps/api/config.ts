import { throwError } from './stdutils/error'
import awsCaBundle from 'aws-ssl-profiles'
import { PoolOptions } from 'mysql2'

export const appConfig = {
  appEnv: process.env.APP_ENV ?? throwError('APP_ENV is required'),
  logging: {
    devMode: process.env.LOGGING_DEV_MODE != null,
    disabled: process.env.LOGGING_DISABLED != null,
  },
  get admin() {
    return {
      secretToken: process.env.ADMIN_SECRET_TOKEN ?? throwError('ADMIN_SECRET_TOKEN is required'),
    }
  },
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') ?? [],
    allowHeaders: ['Authorization', 'User-Agent'],
    // Let browsers cache CORS information to reduce the number of
    // preflight requests. Modern Chrome caps the value at 2h.
    maxAge: 2 * 60 * 60,
  },
  mysql: {
    host: process.env.MYSQL_HOST ?? throwError('MYSQL_HOST is required'),
    port: parseInt(process.env.MYSQL_PORT ?? throwError('MYSQL_PORT is required')),
    user: process.env.MYSQL_USER ?? throwError('MYSQL_USER is required'),
    password: process.env.MYSQL_PASSWORD ?? '',
    database: process.env.MYSQL_DATABASE ?? throwError('MYSQL_DATABASE is required'),
    ssl: process.env.APP_ENV === 'localhost' ? undefined : awsCaBundle,
    waitForConnections: true, // default: true
    connectionLimit: 10, // default: 10
    maxIdle: 10, // default: 10
    idleTimeout: 60000, // default: 60000 (msec)
    queueLimit: 0,
  } satisfies PoolOptions,
  mysqlReadOnly: {
    host: process.env.MYSQL_HOST?.replace('.cluster-', '.cluster-ro-') ?? throwError('MYSQL_HOST is required'),
    port: parseInt(process.env.MYSQL_PORT ?? throwError('MYSQL_PORT is required')),
    user: process.env.MYSQL_USER ?? throwError('MYSQL_USER is required'),
    password: process.env.MYSQL_PASSWORD ?? '',
    database: process.env.MYSQL_DATABASE ?? throwError('MYSQL_DATABASE is required'),
    ssl: process.env.APP_ENV === 'localhost' ? undefined : awsCaBundle,
    waitForConnections: true, // default: true
    connectionLimit: 10, // default: 10
    maxIdle: 10, // default: 10
    idleTimeout: 60000, // default: 60000 (msec)
    queueLimit: 0,
  } satisfies PoolOptions,
  session: {
    jwtIssuer: process.env.SESSION_JWT_ISSUER ?? throwError('SESSION_JWT_ISSUER is required'),
    jwtAudience: process.env.SESSION_JWT_AUDIENCE ?? throwError('SESSION_JWT_AUDIENCE is required'),
    jwtSecret: process.env.SESSION_JWT_SECRET ?? throwError('SESSION_JWT_SECRET is required'),
  },
  get ses() {
    return {
      from: process.env.SES_FROM ?? throwError('SES_FROM is required'),
      endpoint: process.env.SES_ENDPOINT,
    }
  },
  get s3() {
    return {
      publicBucket: process.env.S3_PUBLIC_BUCKET ?? throwError('S3_PUBLIC_BUCKET is required'),
      publicBucketBaseUrl: process.env.S3_PUBLIC_BUCKET_BASE_URL ?? throwError('S3_PUBLIC_BUCKET_BASE_URL is required'),
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE != null,
      endpoint: process.env.S3_ENDPOINT,
      enableACL: process.env.S3_ENABLE_ACL != null,
    }
  },
  // additional config
  get adminSession() {
    return {
      jwtIssuer: process.env.ADMIN_SESSION_JWT_ISSUER ?? throwError('ADMIN_SESSION_JWT_ISSUER is required'),
      jwtAudience: process.env.ADMIN_SESSION_JWT_AUDIENCE ?? throwError('ADMIN_SESSION_JWT_AUDIENCE is required'),
      jwtSecret: process.env.ADMIN_SESSION_JWT_SECRET ?? throwError('ADMIN_SESSION_JWT_SECRET is required'),
    }
  },
  get initialAdministrator() {
    return process.env.INITIAL_ADMINISTRATOR_EMAIL != null && process.env.INITIAL_ADMINISTRATOR_PASSWORD != null
      ? {
          email: process.env.INITIAL_ADMINISTRATOR_EMAIL,
          password: process.env.INITIAL_ADMINISTRATOR_PASSWORD,
        }
      : undefined
  },
  get adminLoginCredential() {
    return {
      pepper: process.env.ADMIN_LOGIN_CREDENTIAL_PEPPER ?? throwError('ADMIN_LOGIN_CREDENTIAL_PEPPER is required'),
    }
  },
  get adminInvitation() {
    return {
      pepper: process.env.ADMIN_INVITATION_PEPPER ?? throwError('ADMIN_INVITATION_PEPPER is required'),
    }
  },
}
