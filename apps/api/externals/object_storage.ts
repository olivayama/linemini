import { appConfig } from '@/config'
import { ObjectStorage } from '@/services/externals'
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CompletedPart,
  CreateMultipartUploadCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3'
import assert from 'node:assert'
import stream from 'node:stream'

export class ObjectStorageImpl implements ObjectStorage {
  private s3Client: S3Client

  constructor() {
    this.s3Client = new S3Client({
      forcePathStyle: appConfig.s3.forcePathStyle,
      endpoint: appConfig.s3.endpoint,
    })
  }

  // NOTE: S3 側の制限により、最後の Part 以外は最小でも 5MB 以上のサイズで分割する必要がある
  async multipartUpload<T>(input: {
    bucket: string
    key: string
    asyncIter: AsyncIterable<T>
    mapIterValue: (v: T) => Uint8Array
    publicRead?: boolean
  }) {
    const uploadId = await this.#createUpload({
      bucket: input.bucket,
      key: input.key,
      publicRead: input.publicRead,
    })
    try {
      const completedPart: CompletedPart[] = []
      let partNumber = 1
      let buf: Uint8Array = new Uint8Array()
      for await (const iterValue of input.asyncIter) {
        const currentBufLength = buf.length
        const chunk = input.mapIterValue(iterValue)
        buf = new Uint8Array(currentBufLength + chunk.length)
        buf.set(buf)
        buf.set(chunk, currentBufLength)
        if (buf.byteLength > 5 * 1024 * 1024) {
          const part = await this.#uploadPart({
            bucket: input.bucket,
            key: input.key,
            uploadId: uploadId,
            partNumber: partNumber,
            part: buf,
          })
          completedPart.push({ ...part, PartNumber: partNumber })
          partNumber++
          buf = new Uint8Array()
        }
      }
      if (buf.length > 0) {
        const part = await this.#uploadPart({
          bucket: input.bucket,
          key: input.key,
          uploadId: uploadId,
          partNumber: partNumber,
          part: buf,
        })
        completedPart.push({ ...part, PartNumber: partNumber })
      }

      this.#completeUpload({
        bucket: input.bucket,
        key: input.key,
        uploadId: uploadId,
        uploadedParts: completedPart,
      })
    } catch (e) {
      await this.#abortUpload({
        bucket: input.bucket,
        key: input.key,
        uploadId: uploadId,
      })
      throw e
    }
  }

  async #createUpload(input: { bucket: string; key: string; publicRead?: boolean }): Promise<string> {
    const command = new CreateMultipartUploadCommand({
      Bucket: input.bucket,
      Key: input.key,
      ...(appConfig.s3.enableACL && { ACL: input.publicRead ? 'public-read' : undefined }),
    })

    const response = await this.s3Client.send(command)
    assert(response.UploadId != null, 'expect UploadId is present from CreateMultipartUploadCommand')
    return response.UploadId
  }

  async #uploadPart(input: {
    bucket: string
    key: string
    uploadId: string
    partNumber: number
    part: string | Uint8Array | Buffer | stream.Readable
  }): Promise<CompletedPart> {
    const command = new UploadPartCommand({
      Bucket: input.bucket,
      Key: input.key,
      UploadId: input.uploadId,
      PartNumber: input.partNumber,
      Body: input.part,
    })
    return this.s3Client.send(command)
  }

  async #completeUpload(input: {
    bucket: string
    key: string
    uploadId: string
    uploadedParts: CompletedPart[]
  }): Promise<void> {
    const command = new CompleteMultipartUploadCommand({
      Bucket: input.bucket,
      Key: input.key,
      UploadId: input.uploadId,
      MultipartUpload: { Parts: input.uploadedParts },
    })
    await this.s3Client.send(command)
  }

  async #abortUpload(input: { bucket: string; key: string; uploadId: string }): Promise<void> {
    const command = new AbortMultipartUploadCommand({
      Bucket: input.bucket,
      Key: input.key,
      UploadId: input.uploadId,
    })
    await this.s3Client.send(command)
  }
}
