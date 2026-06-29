import { AdministratorServiceV1, AdministratorServiceV1Gen } from './administrator_service_v1'
import { Mailer } from './externals'
import { cleanAdministrator, makeAdministratorFixtures } from './testing/fixtures'
import {
  connectIxTestDbPool,
  disconnectIxTestDbPool,
  expectConnectError,
  makeTestDomainContext,
  makeTestServiceClient,
  withoutAdminSession,
} from './testing/helpers'
import { DomainEventEmitter } from '@/domain/event'
import { AdministratorRepository } from '@/domain/repositories'
import { AdministratorRepositoryImpl } from '@/repositories/administrator/administrator-repository'
import { SendEmailCommandOutput } from '@aws-sdk/client-sesv2'
import { Code, PromiseClient } from '@connectrpc/connect'
import { Transaction } from 'kysely'
import assert from 'node:assert'
import { after, before, beforeEach, describe, it } from 'node:test'

const now = new Date()
const ctx = makeTestDomainContext({ now })

describe('AdministratorServiceV1', () => {
  let dbPool: ReturnType<typeof connectIxTestDbPool>
  let administratorRepository: AdministratorRepository<Transaction<DB>>
  let serviceImpl: AdministratorServiceV1<Transaction<DB>>
  let client: PromiseClient<typeof AdministratorServiceV1Gen>
  let administratorFixtures: ReturnType<typeof makeAdministratorFixtures>
  const sentMails: Parameters<Mailer['send']>[0][] = []

  const fakeMailer: Mailer = {
    send: async (input) => {
      sentMails.push(input)
      return {} as unknown as SendEmailCommandOutput
    },
  }

  before(async () => {
    dbPool = connectIxTestDbPool()
    const domainEventEmitter = new DomainEventEmitter<Transaction<DB>>()
    administratorRepository = new AdministratorRepositoryImpl(dbPool, domainEventEmitter)
    administratorFixtures = makeAdministratorFixtures(ctx, administratorRepository)

    serviceImpl = new AdministratorServiceV1(administratorRepository, fakeMailer)
    client = makeTestServiceClient(AdministratorServiceV1Gen, serviceImpl, ctx)
  })

  after(async () => {
    await disconnectIxTestDbPool(dbPool)
  })

  beforeEach(async () => {
    await cleanAdministrator(dbPool.writer)
    sentMails.length = 0
  })

  describe('createAdministrator', () => {
    it('管理者セッションなしは認証エラー（Unauthenticated）', async () => {
      const noAdminClient = makeTestServiceClient(AdministratorServiceV1Gen, serviceImpl, withoutAdminSession(ctx))

      await assert.rejects(
        () => noAdminClient.createAdministrator({ email: 'new-admin@example.com' }),
        expectConnectError(Code.Unauthenticated),
      )
    })

    it('メールアドレスを指定すると管理者を作成して返す', async () => {
      const res = await client.createAdministrator({ email: 'new-admin@example.com' })

      assert.strictEqual(res.administrator?.email, 'new-admin@example.com')
      assert.notStrictEqual(res.administrator?.id, '')
    })

    it('作成時に招待メールが送信される', async () => {
      await client.createAdministrator({ email: 'new-admin@example.com' })

      assert.strictEqual(sentMails.length, 1)
      assert.strictEqual(sentMails[0]?.to, 'new-admin@example.com')
    })
  })

  describe('sendAdministratorInvitation', () => {
    it('既存管理者を指定すると招待メールが再送される', async () => {
      const admin = await administratorFixtures.createPersistedInvited({ email: 'invited@example.com' })

      await client.sendAdministratorInvitation({ administratorId: admin.id })

      assert.strictEqual(sentMails.length, 1)
      assert.strictEqual(sentMails[0]?.to, 'invited@example.com')
    })
  })

  describe('deactivateAdministrator', () => {
    it('無効化した管理者のサインインは認証エラー（Unauthenticated）', async () => {
      const admin = await administratorFixtures.createPersistedWithPassword({
        email: 'active@example.com',
        password: 'password',
      })

      await client.deactivateAdministrator({ administratorId: admin.id })

      await assert.rejects(
        () => client.signInAsAdministrator({ email: 'active@example.com', password: 'password' }),
        expectConnectError(Code.Unauthenticated),
      )
    })
  })

  describe('signInAsAdministrator', () => {
    it('正しいメールとパスワードでサインインすると管理者 ID とトークンを返す', async () => {
      const admin = await administratorFixtures.createPersistedWithPassword({
        email: 'admin@example.com',
        password: 'password',
      })

      const signInRes = await client.signInAsAdministrator({
        email: 'admin@example.com',
        password: 'password',
      })

      assert.strictEqual(signInRes.administratorId, admin.id)
      assert.notStrictEqual(signInRes.accessToken, '')
    })

    it('未登録メールアドレスは認証エラー（Unauthenticated）', async () => {
      await assert.rejects(
        () =>
          client.signInAsAdministrator({
            email: 'unknown@example.com',
            password: 'password',
          }),
        expectConnectError(Code.Unauthenticated),
      )
    })

    it('パスワード不一致は認証エラー（Unauthenticated）', async () => {
      await administratorFixtures.createPersistedWithPassword({
        email: 'admin@example.com',
        password: 'correct',
      })

      await assert.rejects(
        () =>
          client.signInAsAdministrator({
            email: 'admin@example.com',
            password: 'wrong',
          }),
        expectConnectError(Code.Unauthenticated),
      )
    })

    it('パスワード未設定（招待のみ）の管理者は認証エラー（Unauthenticated）', async () => {
      await administratorFixtures.createPersistedInvited({ email: 'invited@example.com' })

      await assert.rejects(
        () =>
          client.signInAsAdministrator({
            email: 'invited@example.com',
            password: 'password',
          }),
        expectConnectError(Code.Unauthenticated),
      )
    })

    it('無効化済み管理者は認証エラー（Unauthenticated）', async () => {
      await administratorFixtures.createPersistedWithPassword({
        email: 'deactivated@example.com',
        password: 'password',
        deactivated: true,
      })

      await assert.rejects(
        () =>
          client.signInAsAdministrator({
            email: 'deactivated@example.com',
            password: 'password',
          }),
        expectConnectError(Code.Unauthenticated),
      )
    })
  })

  describe('getMyAdministratorSession', () => {
    it('有効なアクセストークンで自分の管理者 ID とトークンを返す', async () => {
      const admin = await administratorFixtures.createPersistedWithPassword({
        email: 'me@example.com',
        password: 'password',
      })
      const { accessToken } = await client.signInAsAdministrator({
        email: 'me@example.com',
        password: 'password',
      })

      const res = await client.getMyAdministratorSession({ accessToken })

      assert.strictEqual(res.administratorId, admin.id)
      assert.strictEqual(res.accessToken, accessToken)
    })

    it('不正なアクセストークンは認証エラー（Unauthenticated）', async () => {
      await assert.rejects(
        () => client.getMyAdministratorSession({ accessToken: 'invalid' }),
        expectConnectError(Code.Unauthenticated),
      )
    })
  })

  describe('updateMyAdministratorPassword', () => {
    const setupMyAdmin = (password: string) =>
      administratorFixtures.createPersistedWithPassword({
        id: ctx.requireAdministratorId(),
        email: 'me@example.com',
        password,
      })

    it('現在のパスワードが正しければ新パスワードでサインインできる', async () => {
      await setupMyAdmin('old-password')

      await client.updateMyAdministratorPassword({
        currentPassword: 'old-password',
        newPassword: 'new-password',
      })

      const signInRes = await client.signInAsAdministrator({
        email: 'me@example.com',
        password: 'new-password',
      })

      assert.strictEqual(signInRes.administratorId, ctx.requireAdministratorId())
    })

    it('パスワード更新後は旧パスワードでのサインインが認証エラー（Unauthenticated）', async () => {
      await setupMyAdmin('old-password')

      await client.updateMyAdministratorPassword({
        currentPassword: 'old-password',
        newPassword: 'new-password',
      })

      await assert.rejects(
        () =>
          client.signInAsAdministrator({
            email: 'me@example.com',
            password: 'old-password',
          }),
        expectConnectError(Code.Unauthenticated),
      )
    })

    it('現在のパスワード不一致は認証エラー（Unauthenticated）', async () => {
      await setupMyAdmin('correct-password')

      await assert.rejects(
        () =>
          client.updateMyAdministratorPassword({
            currentPassword: 'wrong-password',
            newPassword: 'new-password',
          }),
        expectConnectError(Code.Unauthenticated),
      )
    })

    it('パスワード未設定（招待のみ）の管理者は認証エラー（Unauthenticated）', async () => {
      await administratorFixtures.createPersistedInvited({
        id: ctx.requireAdministratorId(),
        email: 'invited@example.com',
      })

      await assert.rejects(
        () =>
          client.updateMyAdministratorPassword({
            currentPassword: 'any',
            newPassword: 'new-password',
          }),
        expectConnectError(Code.Unauthenticated),
      )
    })
  })
})
