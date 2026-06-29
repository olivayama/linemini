import { lineOpenIdMockServer, signLineOpenIdToken } from './testing/externals'
import { cleanUser, makeUserFixtures } from './testing/fixtures'
import {
  connectIxTestDbPool,
  disconnectIxTestDbPool,
  expectConnectError,
  makeTestDomainContext,
  makeTestServiceClient,
  withoutAdminSession,
  withoutUserSession,
} from './testing/helpers'
import { UserServiceV1, UserServiceV1Gen } from './user_service_v1'
import { appConfig } from '@/config'
import { DomainContext } from '@/domain/context'
import { DomainEventEmitter } from '@/domain/event'
import { NewUserId, UserId } from '@/domain/ids'
import { UserRepository } from '@/domain/repositories'
import * as pb from '@/gen/services/user/v1/user_service_pb'
import { UserRepositoryImpl } from '@/repositories/user/user-repository'
import { Code, PromiseClient } from '@connectrpc/connect'
import jwt from 'jsonwebtoken'
import { Transaction } from 'kysely'
import assert from 'node:assert'
import { after, before, beforeEach, describe, it } from 'node:test'

const now = new Date()
const ctx = makeTestDomainContext({ now })

describe('UserServiceV1', () => {
  let dbPool: ReturnType<typeof connectIxTestDbPool>
  let userRepository: UserRepository<Transaction<DB>>
  let serviceImpl: UserServiceV1<Transaction<DB>>
  let client: PromiseClient<typeof UserServiceV1Gen>
  let userFixtures: ReturnType<typeof makeUserFixtures>

  const makeClient = (clientCtx: DomainContext, options?: { appEnv?: string }) =>
    makeTestServiceClient(UserServiceV1Gen, serviceImpl, clientCtx, options)

  before(async () => {
    dbPool = connectIxTestDbPool()
    const domainEventEmitter = new DomainEventEmitter<Transaction<DB>>()
    userRepository = new UserRepositoryImpl(dbPool, domainEventEmitter)
    serviceImpl = new UserServiceV1(userRepository)
    userFixtures = makeUserFixtures(ctx, userRepository)

    client = makeClient(ctx)
  })

  after(async () => {
    await disconnectIxTestDbPool(dbPool)
  })

  beforeEach(async () => {
    await cleanUser(dbPool.writer)
  })

  describe('signInOrUpByLineOpenId', () => {
    const signUpParams = { firstAccessPath: '/', serviceAgreementVersion: '1' }

    before(() => {
      lineOpenIdMockServer.listen({ onUnhandledRequest: 'error' })
    })

    after(() => {
      lineOpenIdMockServer.close()
    })

    it('不正な LINE OpenID トークンは認証エラー（Unauthenticated）', async () => {
      await assert.rejects(
        () => client.signInOrUpByLineOpenId({ lineOpenIdToken: 'invalid-token' }),
        expectConnectError(Code.Unauthenticated),
      )
    })

    it('未登録 LINE ユーザーはサインアップして新規ユーザーを作成する', async () => {
      const lineUid = 'new-line-uid'
      const lineOpenIdToken = signLineOpenIdToken(now, { lineUid })

      const res = await client.signInOrUpByLineOpenId({ lineOpenIdToken, signUpParams })

      assert.strictEqual(res.userLineAccountUid, lineUid)
      const created = await userRepository.get(ctx, { type: 'lineUid', lineUid })
      assert.strictEqual(created?.id, res.userId)
    })

    it('未登録 LINE ユーザーでサインアップ情報がないときは拒否される（FailedPrecondition）', async () => {
      const lineUid = 'unknown-line-uid'
      const lineOpenIdToken = signLineOpenIdToken(now, { lineUid })

      await assert.rejects(
        () => client.signInOrUpByLineOpenId({ lineOpenIdToken }),
        expectConnectError(Code.FailedPrecondition),
      )

      const user = await userRepository.get(ctx, { type: 'lineUid', lineUid })
      assert.strictEqual(user, undefined)
    })

    it('登録済み LINE ユーザーはサインインして同じユーザー ID を返す', async () => {
      const lineUid = 'existing-line-uid'
      const existing = await userFixtures.createPersisted({ id: NewUserId(), lineUid })
      const lineOpenIdToken = signLineOpenIdToken(now, { lineUid })

      const res = await client.signInOrUpByLineOpenId({ lineOpenIdToken })

      assert.strictEqual(res.userId, existing.id)
      assert.strictEqual(res.userLineAccountUid, lineUid)
    })
  })

  describe('getMyUserSession', () => {
    const signUserAccessToken = (userId: UserId): string =>
      jwt.sign(
        {
          iss: appConfig.session.jwtIssuer,
          sub: userId,
          aud: appConfig.session.jwtAudience,
          exp: Math.floor(now.getTime() / 1000) + 3600,
        },
        appConfig.session.jwtSecret,
      )

    it('有効なアクセストークンでユーザー ID とトークンを返す', async () => {
      const accessToken = signUserAccessToken(ctx.requireUserId())

      const res = await client.getMyUserSession({ accessToken })

      assert.strictEqual(res.userId, ctx.requireUserId())
      assert.strictEqual(res.accessToken, accessToken)
    })

    it('不正なアクセストークンは認証エラー（Unauthenticated）', async () => {
      await assert.rejects(
        () => client.getMyUserSession({ accessToken: 'invalid' }),
        expectConnectError(Code.Unauthenticated),
      )
    })
  })

  describe('getMyUser', () => {
    it('ユーザーセッションなしは認証エラー（Unauthenticated）', async () => {
      const noUserClient = makeClient(withoutUserSession(ctx))

      await assert.rejects(() => noUserClient.getMyUser({}), expectConnectError(Code.Unauthenticated))
    })

    it('ログイン中の自分のユーザー情報を返す', async () => {
      const user = await userFixtures.createPersisted({ customerNumber: '1234567890123456' })

      const res = await client.getMyUser({})

      assert.strictEqual(res.user?.id, user.id)
      assert.strictEqual(res.user?.customerNumber, '1234567890123456')
    })

    it('ログイン中のユーザーが存在しないときは見つからない（NotFound）', async () => {
      await assert.rejects(() => client.getMyUser({}), expectConnectError(Code.NotFound))
    })
  })

  describe('listUsers', () => {
    it('管理者セッションなしは認証エラー（Unauthenticated）', async () => {
      const noAdminClient = makeClient(withoutAdminSession(ctx))

      await assert.rejects(() => noAdminClient.listUsers({}), expectConnectError(Code.Unauthenticated))
    })

    it('全ユーザーを総件数付きで返す', async () => {
      const a = await userFixtures.createPersisted({ id: NewUserId() })
      const b = await userFixtures.createPersisted({ id: NewUserId() })

      const res = await client.listUsers({ paging: { limit: 100 } })

      assert.strictEqual(res.users.length, 2)
      assert.strictEqual(res.paging?.totalCount, 2n)
      assert.deepStrictEqual(new Set(res.users.map((u) => u.id)), new Set([a.id, b.id]))
    })

    it('会員番号の前方一致で絞り込んで返す', async () => {
      const matched = await userFixtures.createPersisted({ id: NewUserId(), customerNumber: '1111000000000001' })
      await userFixtures.createPersisted({ id: NewUserId(), customerNumber: '2222000000000002' })

      const res = await client.listUsers({ customerNumberPrefix: '1111', paging: { limit: 100 } })

      assert.strictEqual(res.users.length, 1)
      assert.strictEqual(res.users[0]?.id, matched.id)
    })

    it('年月(signedUpAt)で絞り込んで返す', async () => {
      // JST 2024-03 の登録ユーザー（UTC では 2024-02-29 15:00 〜 2024-03-31 14:59:59.999）
      const matched = await userFixtures.createPersisted({
        id: NewUserId(),
        signedUpAt: new Date('2024-03-15T00:00:00+09:00'),
      })
      // 前月・翌月の境界外
      await userFixtures.createPersisted({ id: NewUserId(), signedUpAt: new Date('2024-02-29T23:00:00+09:00') })
      await userFixtures.createPersisted({ id: NewUserId(), signedUpAt: new Date('2024-04-01T00:00:00+09:00') })

      const res = await client.listUsers({ yearMonth: { year: 2024, month: 3 }, paging: { limit: 100 } })

      assert.strictEqual(res.users.length, 1)
      assert.strictEqual(res.users[0]?.id, matched.id)
    })
  })

  describe('exportUsersCSV', () => {
    it('メタデータ・ヘッダー・データの順で返す', async () => {
      await userFixtures.createPersisted({ customerNumber: '1234567890123456' })

      const chunks: pb.ExportUsersCSVResponse[] = []
      for await (const chunk of client.exportUsersCSV({})) {
        chunks.push(chunk)
      }

      assert.ok(chunks.length >= 3)
      assert.strictEqual(chunks[0]?.csv?.payload.case, 'metadata')

      assert.strictEqual(chunks[1]?.csv?.payload.case, 'chunk')
      const header = Buffer.from(chunks[1]?.csv?.payload.value as Uint8Array).toString('utf-8')
      assert.match(header, /id,customerNumber/)

      const dataChunk = chunks
        .slice(2)
        .map((c) => Buffer.from(c.csv?.payload.value as Uint8Array).toString('utf-8'))
        .join('')
      assert.match(dataChunk, /1234567890123456/)
    })

    it('年月・会員番号で絞り込んで出力する', async () => {
      await userFixtures.createPersisted({
        id: NewUserId(),
        customerNumber: '1111000000000001',
        signedUpAt: new Date('2024-03-15T00:00:00+09:00'),
      })
      // 会員番号不一致 / 年月不一致は除外される
      await userFixtures.createPersisted({
        id: NewUserId(),
        customerNumber: '2222000000000002',
        signedUpAt: new Date('2024-03-15T00:00:00+09:00'),
      })
      await userFixtures.createPersisted({
        id: NewUserId(),
        customerNumber: '1111000000000003',
        signedUpAt: new Date('2024-04-15T00:00:00+09:00'),
      })

      const chunks: pb.ExportUsersCSVResponse[] = []
      for await (const chunk of client.exportUsersCSV({
        yearMonth: { year: 2024, month: 3 },
        customerNumberPrefix: '1111',
      })) {
        chunks.push(chunk)
      }

      const body = chunks
        .filter((c) => c.csv?.payload.case === 'chunk')
        .map((c) => Buffer.from(c.csv?.payload.value as Uint8Array).toString('utf-8'))
        .join('')
      assert.match(body, /1111000000000001/)
      assert.doesNotMatch(body, /2222000000000002/)
      assert.doesNotMatch(body, /1111000000000003/)
    })
  })

  describe('deleteMyUser', () => {
    it('自分のアカウント削除後は自分の情報取得が見つからない（NotFound）', async () => {
      await userFixtures.createPersisted()

      await client.deleteMyUser({})

      await assert.rejects(() => client.getMyUser({}), expectConnectError(Code.NotFound))
    })

    it('本番環境では実行不可（Unimplemented）', async () => {
      await userFixtures.createPersisted()
      const prdClient = makeClient(ctx, { appEnv: 'prd' })

      await assert.rejects(() => prdClient.deleteMyUser({}), expectConnectError(Code.Unimplemented))
    })
  })

  describe('deleteUserById', () => {
    it('管理者による削除後はユーザー ID 取得で見つからない（NotFound）', async () => {
      const user = await userFixtures.createPersisted({ id: NewUserId() })

      await client.deleteUserById({ userId: user.id })

      await assert.rejects(() => client.getUserById({ userId: user.id }), expectConnectError(Code.NotFound))
    })

    it('本番環境では実行不可（Unimplemented）', async () => {
      const user = await userFixtures.createPersisted({ id: NewUserId() })
      const prdClient = makeClient(ctx, { appEnv: 'prd' })

      await assert.rejects(() => prdClient.deleteUserById({ userId: user.id }), expectConnectError(Code.Unimplemented))
    })
  })

  describe('setMyProfile', () => {
    it('プロフィールを設定して返す', async () => {
      await userFixtures.createPersisted()

      const res = await client.setMyProfile({ profile: { sexCode: 1, prefectureCode: 13 } })

      assert.strictEqual(res.profile?.sexCode, 1)
      assert.strictEqual(res.profile?.prefectureCode, 13)
    })
  })

  describe('agreeToService', () => {
    it('利用規約への同意を記録する', async () => {
      await userFixtures.createPersisted()

      const res = await client.agreeToService({ version: '1' })

      assert.strictEqual(res.serviceAgreements.length, 1)
      assert.strictEqual(res.serviceAgreements[0]?.version, '1')
    })
  })

  describe('completeTutorial', () => {
    it('チュートリアル完了を記録する', async () => {
      await userFixtures.createPersisted()

      const res = await client.completeTutorial({ version: '1' })

      assert.strictEqual(res.tutorialCompletions.length, 1)
      assert.strictEqual(res.tutorialCompletions[0]?.version, '1')
    })

    it('同じバージョンの再登録は冪等に成功する（重複しない）', async () => {
      await userFixtures.createPersisted()
      await client.completeTutorial({ version: '1' })

      const res = await client.completeTutorial({ version: '1' })

      assert.strictEqual(res.tutorialCompletions.length, 1)
    })
  })
})
