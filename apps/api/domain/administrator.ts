import { DomainContext } from './context'
import { DomainError } from './errors'
import { AdministratorId, NewAdministratorId } from './ids'
import { AdministratorRepository } from './repositories'
import { appConfig } from '@/config'
import { compareHash, hash } from '@/stdutils/bcrypt'
import { Create, Update } from '@/stdutils/domain/effect'
import cuid2 from '@paralleldrive/cuid2'
import { produce } from 'immer'
import jwt from 'jsonwebtoken'

const invitationTokenGenerator = cuid2.init({ length: 16 })

export type Administrator = {
  id: AdministratorId
  email: string
  deactivatedAt?: Date
  invitation?: {
    hashedToken: string
    expirationDate: Date
    invitedAt: Date
    acceptedAt?: Date
  }
  loginCredential?: {
    hashedPassword: string
    initializedAt: Date
    changedAt?: Date
  }
}

export const createAdministrator = async (
  ctx: DomainContext,
  input: { email: string },
): Promise<[Create<Administrator>, string]> => {
  const [invitation, invitationToken] = await makeAdministratorInvitation(ctx)
  return [
    Create({
      id: NewAdministratorId(),
      email: input.email,
      invitation,
    }),
    invitationToken,
  ]
}

export const reinviteAdministrator = async (
  ctx: DomainContext,
  administrator: Administrator,
): Promise<[Update<Administrator>, string]> => {
  const [invitation, invitationToken] = await makeAdministratorInvitation(ctx)
  return [
    Update(
      produce(administrator, (draft) => {
        draft.invitation = invitation
      }),
    ),
    invitationToken,
  ]
}

const makeAdministratorInvitation = async (ctx: DomainContext) => {
  const invitationToken = invitationTokenGenerator()
  return [
    {
      hashedToken: await hash(invitationToken, { pepper: appConfig.adminInvitation.pepper }),
      expirationDate: new Date(ctx.now.getTime() + 30 * 24 * 60 * 60 * 1000),
      invitedAt: ctx.now,
    },
    invitationToken,
  ] as const
}

export const createAdministratorWithoutInvitation = async (
  ctx: DomainContext,
  input: { email: string; password: string },
): Promise<Create<Administrator>> => {
  return Create({
    id: NewAdministratorId(),
    email: input.email,
    loginCredential: {
      hashedPassword: await hash(input.password, { pepper: appConfig.adminLoginCredential.pepper }),
      initializedAt: ctx.now,
    },
  })
}

export const deactivateAdministrator = (ctx: DomainContext, administrator: Administrator): Update<Administrator> => {
  return Update(
    produce(administrator, (draft) => {
      draft.deactivatedAt = ctx.now
    }),
  )
}

export const updateMyAdministratorPassword = async (
  ctx: DomainContext,
  administrator: Administrator,
  currentPassword: string,
  newPassword: string,
): Promise<Update<Administrator>> => {
  if (administrator.loginCredential == null) {
    throw new DomainError('Unauthenticated')
  }
  const passwordMatch = await compareHash(currentPassword, administrator.loginCredential.hashedPassword, {
    pepper: appConfig.adminLoginCredential.pepper,
  })
  if (!passwordMatch) {
    throw new DomainError('Unauthenticated')
  }

  const hashedPassword = await hash(newPassword, { pepper: appConfig.adminLoginCredential.pepper })
  return Update(
    produce(administrator, (draft) => {
      if (draft.loginCredential == null) {
        draft.loginCredential = { hashedPassword, changedAt: ctx.now, initializedAt: ctx.now }
      } else {
        draft.loginCredential.hashedPassword = hashedPassword
        draft.loginCredential.changedAt = ctx.now
      }
    }),
  )
}

export const signInAsAdministrator = async (
  ctx: DomainContext,
  administratorRepository: AdministratorRepository<unknown>,
  input: { email: string; password: string },
) => {
  const administrator = await administratorRepository.get(ctx, { type: 'email', email: input.email })
  if (administrator == null) {
    throw new DomainError('Unauthenticated')
  }
  if (administrator.loginCredential == null) {
    throw new DomainError('Unauthenticated')
  }
  if (administrator.deactivatedAt != null) {
    throw new DomainError('Unauthenticated')
  }

  const passwordMatch = await compareHash(input.password, administrator.loginCredential.hashedPassword, {
    pepper: appConfig.adminLoginCredential.pepper,
  })
  if (!passwordMatch) {
    throw new DomainError('Unauthenticated')
  }

  return {
    accessToken: generateAdministratorAccessToken(ctx, administrator),
    administrator,
  }
}

const generateAdministratorAccessToken = (ctx: DomainContext, administrator: Administrator): string => {
  const payload = {
    iss: appConfig.session.jwtIssuer,
    sub: `administrator:${administrator.id}`,
    aud: appConfig.session.jwtAudience,
    exp: Math.floor(ctx.now.getTime() / 1000) + 60 * 60 * 24 * 30,
  }
  return jwt.sign(payload, appConfig.session.jwtSecret)
}

export const verifyAdministratorAccessToken = async (
  accessToken: string,
): Promise<{ administratorId: AdministratorId } | undefined> => {
  return new Promise((resolve) => {
    jwt.verify(accessToken, appConfig.session.jwtSecret, (err, decoded) => {
      if (err != null || typeof decoded !== 'object' || decoded.sub == null) {
        console.log('failed to verifyAdministratorAccessToken', err, decoded)
        resolve(undefined)
      } else if (decoded.aud !== appConfig.session.jwtAudience) {
        console.log('invalid audience', decoded.aud)
        resolve(undefined)
      } else if (decoded.exp == null || decoded.exp < Math.floor(Date.now() / 1000)) {
        console.log('expired', decoded.exp)
        resolve(undefined)
      } else {
        const [kind, administratorId] = decoded.sub.split(':')
        if (kind !== 'administrator' || administratorId == null) {
          console.log('invalid subject', decoded.sub)
          resolve(undefined)
        } else {
          resolve({ administratorId: AdministratorId(administratorId) })
        }
      }
    })
  })
}
