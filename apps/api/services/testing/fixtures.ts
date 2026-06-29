import {
  Administrator,
  createAdministrator,
  createAdministratorWithoutInvitation,
  deactivateAdministrator,
} from '@/domain/administrator'
import { DomainContext } from '@/domain/context'
import { AdministratorId, ImageTagId, NewImageTagId, UserId } from '@/domain/ids'
import { ImageTag, createImage, createImageTag } from '@/domain/image'
import { AdministratorRepository, ImageRepository, ImageTagRepository, UserRepository } from '@/domain/repositories'
import { User } from '@/domain/user'
import { generateCustomerNumber } from '@/stdutils/customer-number'
import { Create } from '@/stdutils/domain/effect'
import { Kysely, Transaction } from 'kysely'
import invariant from 'tiny-invariant'

// aggregate ごとに `make<X>Fixtures` factory と `clean<X>` を section コメントで区切って並べる。
// テンプレが出荷しているサービス(administrator / user / image)の集約を一通り seed してある。
// 案件でサービス・集約を増やしたら、対応する section をここに追加する
// (`/gen-api-test <service>` 初回実行で雛形が生成される)。

// ───────── administrator ─────────

export const makeAdministratorFixtures = (
  ctx: DomainContext,
  administratorRepository: AdministratorRepository<Transaction<DB>>,
) => ({
  createPersistedInvited: async (input: { id?: AdministratorId; email: string }) => {
    const [created] = await createAdministrator(ctx, { email: input.email })
    const admin: Create<Administrator> = input.id != null ? Create({ ...created, id: input.id }) : created
    await administratorRepository.persistCreate(ctx, admin)
    return admin
  },
  createPersistedWithPassword: async (input: {
    id?: AdministratorId
    email: string
    password: string
    deactivated?: boolean
  }) => {
    const created = await createAdministratorWithoutInvitation(ctx, {
      email: input.email,
      password: input.password,
    })
    const admin: Create<Administrator> = input.id != null ? Create({ ...created, id: input.id }) : created
    await administratorRepository.persistCreate(ctx, admin)
    if (input.deactivated === true) {
      const got = await administratorRepository.get(ctx, { type: 'id', id: admin.id })
      invariant(got != null)
      await administratorRepository.persistUpdate(ctx, got, deactivateAdministrator(ctx, got))
    }
    return admin
  },
})

export const cleanAdministrator = async (db: Kysely<DB>) => {
  await db.deleteFrom('administratorInvitation').execute()
  await db.deleteFrom('administratorLoginCredential').execute()
  await db.deleteFrom('administrator').execute()
}

// ───────── user ─────────

export const makeUserFixtures = (ctx: DomainContext, userRepository: UserRepository<Transaction<DB>>) => ({
  createPersisted: async (input?: {
    id?: UserId
    customerNumber?: string
    lineUid?: string
    signedUpAt?: Date
  }): Promise<Create<User>> => {
    const id = input?.id ?? ctx.requireUserId()
    const user: Create<User> = Create({
      id,
      customerNumber: input?.customerNumber ?? generateCustomerNumber(),
      signedUpAt: input?.signedUpAt ?? ctx.now,
      firstAccessPath: 'test',
      lineAccount: { uid: input?.lineUid ?? `line-${id}` },
      serviceAgreements: [],
      tutorialCompletions: [],
    })
    await userRepository.persistCreate(ctx, user)
    return user
  },
})

export const cleanUser = async (db: Kysely<DB>) => {
  await db.deleteFrom('userServiceAgreement').execute()
  await db.deleteFrom('userTutorialCompletion').execute()
  await db.deleteFrom('userProfile').execute()
  await db.deleteFrom('userLineAccount').execute()
  await db.deleteFrom('user').execute()
}

// ───────── image ─────────

export const makeImageFixtures = (ctx: DomainContext, imageRepository: ImageRepository<Transaction<DB>>) => ({
  createPersisted: async (input?: { adminName?: string; imageUrl?: string; tagIds?: ImageTagId[] }) => {
    const image = await createImage(ctx, {
      adminName: input?.adminName ?? 'test-image',
      imageUrl: input?.imageUrl ?? 'https://example.com/image.png',
      tagIds: input?.tagIds ?? [],
    })
    await imageRepository.persistCreate(ctx, image)
    return image
  },
})

export const cleanImage = async (db: Kysely<DB>) => {
  await db.deleteFrom('imageTagRel').execute()
  await db.deleteFrom('image').execute()
}

// ───────── image tag ─────────

export const makeImageTagFixtures = (ctx: DomainContext, imageTagRepository: ImageTagRepository<Transaction<DB>>) => ({
  createPersisted: async (input?: { id?: ImageTagId; adminName?: string; isLocked?: boolean }) => {
    const created = await createImageTag(ctx, imageTagRepository, {
      adminName: input?.adminName ?? `tag-${NewImageTagId()}`,
      isLocked: input?.isLocked ?? false,
    })
    const tag: Create<ImageTag> = input?.id != null ? Create({ ...created, id: input.id }) : created
    await imageTagRepository.persistCreate(ctx, tag)
    return tag
  },
})

export const cleanImageTag = async (db: Kysely<DB>) => {
  await db.deleteFrom('imageTag').execute()
}
