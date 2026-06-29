// Usage: APP_ENV=<localhost|dev> USER_ID=<...> ADMIN_SECRET_TOKEN=<...> pnpm exec tsx scripts/delete-user.ts
import { UserService } from '@/gen/services/user/v1/user_service_connect'
import { Code, createPromiseClient } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-node'

const appEnv = process.env.APP_ENV ?? 'localhost'
const id = process.env.USER_ID
if (id == null) {
  throw new Error('USER_ID is required')
}
const adminSecretToken = process.env.ADMIN_SECRET_TOKEN
if (adminSecretToken == null) {
  throw new Error('ADMIN_SECRET_TOKEN is required')
}

const baseUrls: Record<string, string> = {
  localhost: 'http://localhost:4000',
  dev: 'https://api.dev.example.lineminiapps.com',
}

const baseUrl = baseUrls[appEnv]
if (baseUrl == null) {
  throw new Error(`baseUrl for ${appEnv} is not found`)
}

const transport = createConnectTransport({
  baseUrl: baseUrl,
  httpVersion: '1.1',
})
const client = createPromiseClient(UserService, transport)

const green = '\x1b[32m'
const red = '\x1b[31m'
const reset = '\x1b[0m'

client
  .deleteUserById({ adminSecretToken, userId: id })
  .then(() => {
    console.log(`${id}: ${green}削除しました${reset}`)
  })
  .catch((e) => {
    const message = (() => {
      switch (e.code) {
        case Code.NotFound:
          return '指定されたユーザーが存在しません'
        case Code.Unimplemented:
          return '無効な操作です'
        case Code.Internal:
          return '内部エラーが発生しました'
        case Code.Unauthenticated:
          return 'ADMIN_SECRET_TOKEN が間違っています'
        default:
          return e.message
      }
    })()
    console.error(`${id}: ${red}${message}${reset}`)
  })
