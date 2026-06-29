import { ObjectStorage } from './externals'
import { ImageServiceV1, ImageServiceV1Gen } from './image_service_v1'
import { cleanImage, cleanImageTag, makeImageFixtures, makeImageTagFixtures } from './testing/fixtures'
import {
  connectIxTestDbPool,
  disconnectIxTestDbPool,
  expectConnectError,
  makeTestDomainContext,
  makeTestServiceClient,
  withoutAdminSession,
} from './testing/helpers'
import { appConfig } from '@/config'
import { DomainEventEmitter } from '@/domain/event'
import { ImageRepository, ImageTagRepository } from '@/domain/repositories'
import * as pb from '@/gen/services/image/v1/image_service_pb'
import { ImageRepositoryImpl } from '@/repositories/image/image-repository'
import { ImageTagRepositoryImpl } from '@/repositories/image/image-tag-repository'
import { Code, PromiseClient } from '@connectrpc/connect'
import { Transaction } from 'kysely'
import assert from 'node:assert'
import { after, before, beforeEach, describe, it } from 'node:test'

const now = new Date()
const ctx = makeTestDomainContext({ now })

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

describe('ImageServiceV1', () => {
  let dbPool: ReturnType<typeof connectIxTestDbPool>
  let imageRepository: ImageRepository<Transaction<DB>>
  let imageTagRepository: ImageTagRepository<Transaction<DB>>
  let serviceImpl: ImageServiceV1<Transaction<DB>>
  let client: PromiseClient<typeof ImageServiceV1Gen>
  let imageFixtures: ReturnType<typeof makeImageFixtures>
  let imageTagFixtures: ReturnType<typeof makeImageTagFixtures>

  const uploadedObjects: { bucket: string; key: string; publicRead?: boolean }[] = []

  const fakeObjectStorage: ObjectStorage = {
    multipartUpload: async (input) => {
      uploadedObjects.push({ bucket: input.bucket, key: input.key, publicRead: input.publicRead })
    },
  }

  before(async () => {
    dbPool = connectIxTestDbPool()
    const domainEventEmitter = new DomainEventEmitter<Transaction<DB>>()
    imageRepository = new ImageRepositoryImpl(dbPool, domainEventEmitter)
    imageTagRepository = new ImageTagRepositoryImpl(dbPool, domainEventEmitter)
    imageFixtures = makeImageFixtures(ctx, imageRepository)
    imageTagFixtures = makeImageTagFixtures(ctx, imageTagRepository)

    serviceImpl = new ImageServiceV1(imageRepository, imageTagRepository, fakeObjectStorage)
    client = makeTestServiceClient(ImageServiceV1Gen, serviceImpl, ctx)
  })

  after(async () => {
    await disconnectIxTestDbPool(dbPool)
  })

  beforeEach(async () => {
    await cleanImage(dbPool.writer)
    await cleanImageTag(dbPool.writer)
    uploadedObjects.length = 0
  })

  describe('tmpUploadImage', () => {
    const baseInput = { adminName: 'test', tagIds: [] as string[] }

    it('管理者セッションなしは認証エラー（Unauthenticated）', async () => {
      const noAdminClient = makeTestServiceClient(ImageServiceV1Gen, serviceImpl, withoutAdminSession(ctx))

      await assert.rejects(
        () => noAdminClient.tmpUploadImage({ image: { ...baseInput, image: pngBytes } }),
        expectConnectError(Code.Unauthenticated),
      )
    })

    it('画像をアップロードすると作成結果を返す', async () => {
      const res = await client.tmpUploadImage({ image: { ...baseInput, image: pngBytes } })

      assert.strictEqual(res.image?.adminName, baseInput.adminName)
      assert.ok(res.image?.imageUrl)
    })

    it('アップロードはオブジェクトストレージへ公開設定で書き込まれる', async () => {
      const res = await client.tmpUploadImage({ image: { ...baseInput, image: pngBytes } })

      assert.strictEqual(uploadedObjects.length, 1)
      const uploaded = uploadedObjects[0]
      assert.ok(uploaded)
      assert.strictEqual(uploaded.bucket, appConfig.s3.publicBucket)
      assert.match(uploaded.key, /^image\/.+\.png$/)
      assert.ok(res.image?.imageUrl.endsWith(uploaded.key))
      assert.strictEqual(uploaded.publicRead, true)
    })
  })

  describe('updateTmpUploadImage', () => {
    const baseInput = (id: string) => ({ id, adminName: 'updated', tagIds: [] as string[] })

    it('画像差し替えありで送ると新しい画像 URL に更新される', async () => {
      const image = await imageFixtures.createPersisted({
        adminName: 'initial',
        imageUrl: 'https://example.com/initial.png',
      })

      const res = await client.updateTmpUploadImage({
        image: { ...baseInput(image.id), image: pngBytes },
        replaceImage: true,
      })

      assert.notStrictEqual(res.image?.imageUrl, image.imageUrl)
      assert.ok(res.image?.imageUrl)
    })

    it('画像差し替えなしでは画像 URL を維持して更新する', async () => {
      const image = await imageFixtures.createPersisted({
        adminName: 'initial',
        imageUrl: 'https://example.com/initial.png',
      })

      const res = await client.updateTmpUploadImage({
        image: baseInput(image.id),
        replaceImage: false,
      })

      assert.strictEqual(res.image?.adminName, 'updated')
      assert.strictEqual(res.image?.imageUrl, image.imageUrl)
    })
  })

  describe('uploadImage', () => {
    const streamRequest = async function* (imageBytes: Uint8Array | undefined) {
      yield new pb.UploadImageRequest({ image: { adminName: 'streaming', tagIds: [] } })
      yield new pb.UploadImageRequest({ image: { image: imageBytes } })
    }

    it('ストリーミングでアップロードすると作成結果を返す', async () => {
      const res = await client.uploadImage(streamRequest(pngBytes))

      assert.strictEqual(res.image?.adminName, 'streaming')
      assert.ok(res.image?.imageUrl)
    })

    it('ストリーミングアップロードはオブジェクトストレージへ公開設定で書き込まれる', async () => {
      const res = await client.uploadImage(streamRequest(pngBytes))

      assert.strictEqual(uploadedObjects.length, 1)
      const uploaded = uploadedObjects[0]
      assert.ok(uploaded)
      assert.strictEqual(uploaded.bucket, appConfig.s3.publicBucket)
      assert.match(uploaded.key, /^image\/.+\.png$/)
      assert.ok(res.image?.imageUrl.endsWith(uploaded.key))
      assert.strictEqual(uploaded.publicRead, true)
    })
  })

  describe('updateUploadImage', () => {
    const streamRequest = async function* (imageId: string, replaceImage: boolean, imageBytes: Uint8Array | undefined) {
      yield new pb.UpdateUploadImageRequest({
        image: { id: imageId, adminName: 'updated-streaming', tagIds: [] },
        replaceImage,
      })
      if (replaceImage) {
        yield new pb.UpdateUploadImageRequest({ image: { image: imageBytes } })
      }
    }

    it('画像差し替えありでストリーミング送信すると画像 URL が更新され、ストレージへ書き込まれる', async () => {
      const image = await imageFixtures.createPersisted({
        adminName: 'initial',
        imageUrl: 'https://example.com/initial.png',
      })

      const res = await client.updateUploadImage(streamRequest(image.id, true, pngBytes))

      assert.notStrictEqual(res.image?.imageUrl, image.imageUrl)
      assert.strictEqual(uploadedObjects.length, 1)
    })

    it('画像差し替えなしのストリーミングはストレージへ書き込まず画像 URL を維持する', async () => {
      const image = await imageFixtures.createPersisted({
        adminName: 'initial',
        imageUrl: 'https://example.com/initial.png',
      })

      const res = await client.updateUploadImage(streamRequest(image.id, false, undefined))

      assert.strictEqual(uploadedObjects.length, 0)
      assert.strictEqual(res.image?.adminName, 'updated-streaming')
      assert.strictEqual(res.image?.imageUrl, image.imageUrl)
    })
  })

  describe('listImages', () => {
    it('画像タグ ID 指定でそのタグを持つ画像のみ返す', async () => {
      const tagA = await imageTagFixtures.createPersisted({ adminName: 'タグA' })
      const tagB = await imageTagFixtures.createPersisted({ adminName: 'タグB' })
      const taggedA = await imageFixtures.createPersisted({ adminName: 'with-a', tagIds: [tagA.id] })
      await imageFixtures.createPersisted({ adminName: 'with-b', tagIds: [tagB.id] })
      await imageFixtures.createPersisted({ adminName: 'no-tag' })

      const res = await client.listImages({ imageTagId: tagA.id, paging: { limit: 100, offset: 0 } })

      assert.strictEqual(res.images.length, 1)
      assert.strictEqual(res.images[0]?.id, taggedA.id)
    })
  })

  describe('createImageTag', () => {
    it('指定した管理名のタグを作成して返す', async () => {
      const res = await client.createImageTag({ imageTag: { adminName: '新タグ', isLocked: false } })

      assert.notStrictEqual(res.imageTag?.id, '')
      assert.strictEqual(res.imageTag?.adminName, '新タグ')
      assert.strictEqual(res.imageTag?.isLocked, false)
    })

    it('管理名が既存タグと重複するときは重複エラー（AlreadyExists）', async () => {
      await imageTagFixtures.createPersisted({ adminName: '既存タグ' })

      await assert.rejects(
        () => client.createImageTag({ imageTag: { adminName: '既存タグ', isLocked: false } }),
        expectConnectError(Code.AlreadyExists),
      )
    })
  })

  describe('updateImageTag', () => {
    it('ロックされていないタグの管理名・ロック状態を更新する', async () => {
      const tag = await imageTagFixtures.createPersisted({ adminName: 'before', isLocked: false })

      const res = await client.updateImageTag({ imageTag: { id: tag.id, adminName: 'after', isLocked: true } })

      assert.strictEqual(res.imageTag?.adminName, 'after')
      assert.strictEqual(res.imageTag?.isLocked, true)
    })

    it('ロック中のタグの更新は拒否される（FailedPrecondition）', async () => {
      const tag = await imageTagFixtures.createPersisted({ adminName: 'locked', isLocked: true })

      await assert.rejects(
        () => client.updateImageTag({ imageTag: { id: tag.id, adminName: 'changed', isLocked: true } }),
        expectConnectError(Code.FailedPrecondition),
      )
    })

    it('管理名を別タグと重複する名前へ変更するときは重複エラー（AlreadyExists）', async () => {
      await imageTagFixtures.createPersisted({ adminName: '既存A' })
      const target = await imageTagFixtures.createPersisted({ adminName: '既存B' })

      await assert.rejects(
        () => client.updateImageTag({ imageTag: { id: target.id, adminName: '既存A', isLocked: false } }),
        expectConnectError(Code.AlreadyExists),
      )
    })
  })
})
