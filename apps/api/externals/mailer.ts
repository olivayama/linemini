import { appConfig } from '@/config'
import { Mailer } from '@/services/externals'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'

export class MailerImpl implements Mailer {
  private sesClient: SESv2Client

  constructor() {
    this.sesClient = new SESv2Client({
      endpoint: appConfig.ses.endpoint,
    })
  }

  async send(input: { from: string; to: string; subject: string; body: string }) {
    return await this.sesClient.send(
      new SendEmailCommand({
        FromEmailAddress: input.from,
        Destination: { ToAddresses: [input.to] },
        Content: {
          Simple: {
            Subject: { Data: input.subject },
            Body: { Text: { Data: input.body } },
          },
        },
      }),
    )
  }
}
