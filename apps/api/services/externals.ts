import { SendEmailCommandOutput } from '@aws-sdk/client-sesv2'

export type ObjectStorage = {
  multipartUpload<T>(input: {
    bucket: string
    key: string
    asyncIter: AsyncIterable<T>
    mapIterValue: (v: T) => Uint8Array
    publicRead?: boolean
  }): Promise<void>
}

export type Mailer = {
  send(input: { from: string; to: string; subject: string; body: string }): Promise<SendEmailCommandOutput>
}
