import jwt from 'jsonwebtoken'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { generateKeyPairSync } from 'node:crypto'

// 外部サービス API 由来の builder / signing utility / 定数 を service ごとの section に集約する。
// fake 本体(クロージャで capture array を参照するもの)は各 ix_test 内に置き、ここには混ぜない。

// ───────── line ─────────

// LINE OpenID トークン検証は domain 内で jwks-rsa が `https://api.line.me/oauth2/v2.1/certs` を
// 直接 fetch する設計のため、test 内で valid token を作るには JWKS endpoint を制御する必要がある。
// production を変えずにテストするため、test 専用の RSA keypair を生成して MSW で JWKS を返し、
// 同じ秘密鍵で署名した JWT を渡す。

const LINE_JWKS_URL = 'https://api.line.me/oauth2/v2.1/certs'
const LINE_TEST_KID = 'test-line-kid'

// 2048bit RSA 生成は重いため遅延化する
let lineKeyPair: ReturnType<typeof generateKeyPairSync> | undefined
const getLineKeyPair = () => (lineKeyPair ??= generateKeyPairSync('rsa', { modulusLength: 2048 }))

const buildLineJwks = () => {
  const jwk = getLineKeyPair().publicKey.export({ format: 'jwk' })
  return { keys: [{ ...jwk, kid: LINE_TEST_KID, alg: 'RS256', use: 'sig' }] }
}
let lineJwksCache: ReturnType<typeof buildLineJwks> | undefined
const getLineJwks = () => (lineJwksCache ??= buildLineJwks())

export const lineOpenIdMockServer = setupServer(http.get(LINE_JWKS_URL, () => HttpResponse.json(getLineJwks())))

export const signLineOpenIdToken = (now: Date, input: { lineUid: string; expSecondsFromNow?: number }): string =>
  jwt.sign(
    { sub: input.lineUid, exp: Math.floor(now.getTime() / 1000) + (input.expSecondsFromNow ?? 3600) },
    getLineKeyPair().privateKey.export({ format: 'pem', type: 'pkcs8' }),
    { algorithm: 'RS256', keyid: LINE_TEST_KID },
  )
