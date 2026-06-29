import { Mailer } from './externals'
import { appConfig } from '@/config'
import { HandlerDomainContext } from '@/context'
import {
  Administrator,
  createAdministrator,
  deactivateAdministrator,
  reinviteAdministrator,
  signInAsAdministrator,
  updateMyAdministratorPassword,
  verifyAdministratorAccessToken,
} from '@/domain/administrator'
import { DomainError } from '@/domain/errors'
import { AdministratorId } from '@/domain/ids'
import { AdministratorRepository } from '@/domain/repositories'
import * as administratorPb from '@/gen/services/administrator/v1/administrator_pb'
import { AdministratorService } from '@/gen/services/administrator/v1/administrator_service_connect'
import * as pb from '@/gen/services/administrator/v1/administrator_service_pb'
import { HandlerContext, ServiceImpl } from '@connectrpc/connect'

export const AdministratorServiceV1Gen = AdministratorService

export class AdministratorServiceV1<Tx> implements ServiceImpl<typeof AdministratorServiceV1Gen> {
  constructor(
    private readonly administratorRepository: AdministratorRepository<Tx>,
    private readonly mailer: Mailer,
  ) {}

  async createAdministrator(req: pb.CreateAdministratorRequest, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    ctx.ensureAdminAuthenticated()

    const [administrator, invitationToken] = await createAdministrator(ctx, {
      email: req.email,
    })
    await this.administratorRepository.persistCreate(ctx, administrator)
    await this.#sendInvitationEmail(administrator, invitationToken)

    return new pb.CreateAdministratorResponse({
      administrator: this.#makeProtoAdministrator(administrator),
    })
  }

  async sendAdministratorInvitation(req: pb.SendAdministratorInvitationRequest, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    ctx.ensureAdminAuthenticated()

    const administrator = await this.administratorRepository.get(ctx, {
      type: 'id',
      id: AdministratorId(req.administratorId),
    })
    if (administrator == null) {
      throw new DomainError('EntityNotFound')
    }

    const [newAdministrator, invitationToken] = await reinviteAdministrator(ctx, administrator)
    await this.administratorRepository.persistUpdate(ctx, administrator, newAdministrator)
    await this.#sendInvitationEmail(newAdministrator, invitationToken)

    return new pb.SendAdministratorInvitationResponse({
      administrator: this.#makeProtoAdministrator(newAdministrator),
    })
  }

  async deactivateAdministrator(req: pb.DeactivateAdministratorRequest, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    ctx.ensureAdminAuthenticated()

    const administrator = await this.administratorRepository.get(ctx, {
      type: 'id',
      id: AdministratorId(req.administratorId),
    })
    if (administrator == null) {
      throw new DomainError('EntityNotFound')
    }

    const newAdministrator = deactivateAdministrator(ctx, administrator)
    await this.administratorRepository.persistUpdate(ctx, administrator, newAdministrator)

    return new pb.DeactivateAdministratorResponse({
      administrator: this.#makeProtoAdministrator(newAdministrator),
    })
  }

  async signInAsAdministrator(req: pb.SignInAsAdministratorRequest, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    const { administrator, accessToken } = await signInAsAdministrator(ctx, this.administratorRepository, {
      email: req.email,
      password: req.password,
    })

    return new pb.SignInAsAdministratorResponse({
      administratorId: administrator.id,
      accessToken,
    })
  }

  async getMyAdministratorSession(req: pb.GetMyAdministratorSessionRequest, context: HandlerContext) {
    const session = await verifyAdministratorAccessToken(req.accessToken)
    if (session == null) {
      throw new DomainError('Unauthenticated')
    }

    return new pb.GetMyAdministratorSessionResponse({
      administratorId: session.administratorId,
      accessToken: req.accessToken,
    })
  }

  async updateMyAdministratorPassword(req: pb.UpdateMyAdministratorPasswordRequest, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    ctx.ensureAdminAuthenticated()

    const administrator = await this.administratorRepository.get(ctx, {
      type: 'id',
      id: ctx.requireAdministratorId(),
    })
    if (administrator == null) {
      throw new DomainError('EntityNotFound')
    }

    const newAdministrator = await updateMyAdministratorPassword(
      ctx,
      administrator,
      req.currentPassword,
      req.newPassword,
    )
    await this.administratorRepository.persistUpdate(ctx, administrator, newAdministrator)

    return new pb.UpdateMyAdministratorPasswordResponse({
      administrator: this.#makeProtoAdministrator(newAdministrator),
    })
  }

  async #sendInvitationEmail(administrator: Administrator, invitationToken: string) {
    await this.mailer.send({
      from: appConfig.ses.from,
      to: administrator.email,
      subject: '【xxxappnamexxx管理画面】管理者として招待されました',
      body: `このURLからパスワードを設定してログインしてください http://localhost:4000/admin/signin?email=${administrator.email}&invitationToken=${invitationToken}`,
    })
  }

  #makeProtoAdministrator(administrator: Administrator) {
    return new administratorPb.Administrator({
      id: administrator.id,
      email: administrator.email,
    })
  }
}
