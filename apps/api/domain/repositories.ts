import { Administrator } from './administrator'
import { AdministratorId, ImageId, ImageTagId, UserId } from './ids'
import { Image, ImageTag } from './image'
import { User } from './user'
import { NonEmptyArray } from '@/stdutils/array'
import { Repository, RepositoryOffsetPaging } from '@/stdutils/domain/repository'
import { YearMonth } from '@/stdutils/year-month'

export type QueryCompare = '=' | '>' | '<' | '>=' | '<='

// Administrator

export type AdministratorRepositoryGetInput = { type: 'id'; id: AdministratorId } | { type: 'email'; email: string }
export type AdministratorRepositoryListInput = {}
export type AdministratorRepositoryListOrderByKey = 'id'
export type AdministratorRepository<Tx> = RepositoryOffsetPaging<
  Tx,
  Administrator,
  AdministratorRepositoryGetInput,
  AdministratorRepositoryListInput,
  AdministratorRepositoryListOrderByKey
>

// User

export type UserRepositoryGetInput =
  | { type: 'lineUid'; lineUid: string }
  | { type: 'id'; id: UserId }
  | { type: 'customerNumber'; customerNumber: string }
export type UserRepositoryListInput = {
  customerNumberPrefix?: string
  yearMonth?: YearMonth
}
export type UserRepositoryListOrderByKey = 'id' | 'signedUpAt'
export type UserRepository<Tx> = Repository<Tx, User, UserRepositoryGetInput, UserRepositoryListInput>

// Image

export type ImageRepositoryGetInput = { type: 'id'; id: ImageId }
export type ImageRepositoryListInput = {
  ids?: NonEmptyArray<ImageId>
  imageTagId?: ImageTagId
}
export type ImageRepositoryListOrderByKey = 'id'
export type ImageRepository<Tx> = RepositoryOffsetPaging<
  Tx,
  Image,
  ImageRepositoryGetInput,
  ImageRepositoryListInput,
  ImageRepositoryListOrderByKey
>

export type ImageTagRepositoryGetInput = { type: 'id'; id: ImageTagId } | { type: 'adminName'; adminName: string }
export type ImageTagRepositoryListInput = {
  ids?: NonEmptyArray<ImageTagId>
}
export type ImageTagRepositoryListOrderByKey = 'id'
export type ImageTagRepository<Tx> = RepositoryOffsetPaging<
  Tx,
  ImageTag,
  ImageTagRepositoryGetInput,
  ImageTagRepositoryListInput,
  ImageTagRepositoryListOrderByKey
>
