import { DomainContext } from './context'
import { DomainError } from './errors'
import { ImageId, ImageTagId, NewImageId, NewImageTagId } from './ids'
import { ImageRepository, ImageTagRepository } from './repositories'
import { Create, Update } from '@/stdutils/domain/effect'
import { isNonEmptyArray } from '@sindresorhus/is'
import { produce } from 'immer'
import invariant from 'tiny-invariant'

export type Image = {
  id: ImageId
  adminName: string
  imageUrl: string
  createdAt: Date
  updatedAt?: Date
  tagIds: ImageTagId[]
}

export type ImageTag = {
  id: ImageTagId
  adminName: string
  createdAt: Date
  updatedAt?: Date
  isLocked: boolean
}

export type ImageBundle = {
  image: Image
  imageTags: ImageTag[]
}

export const createImage = async (
  ctx: DomainContext,
  image: Omit<Image, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Create<Image>> => {
  return Create({
    ...image,
    id: NewImageId(),
    createdAt: ctx.now,
    updatedAt: undefined,
  })
}

export const updateImage = async (
  ctx: DomainContext,
  imageRepository: ImageRepository<unknown>,
  image: Omit<Image, 'createdAt' | 'updatedAt' | 'imageUrl'> & { imageUrl?: string },
): Promise<{ prevImage: Image; nextImage: Update<Image> }> => {
  const prevImage = await imageRepository.get(ctx, { type: 'id', id: image.id }, { weakConsistency: true })
  if (prevImage == null) {
    throw new DomainError('EntityNotFound')
  }

  const nextImage = Update(
    produce(prevImage, (draft) => {
      draft.adminName = image.adminName
      if (image.imageUrl != null) {
        draft.imageUrl = image.imageUrl
      }
      draft.tagIds = image.tagIds
      draft.updatedAt = ctx.now
    }),
  )

  return { prevImage, nextImage }
}

export const createImageTag = async (
  ctx: DomainContext,
  imageTagRepository: ImageTagRepository<unknown>,
  imageTag: Omit<ImageTag, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Create<ImageTag>> => {
  const tag = await imageTagRepository.get(
    ctx,
    { type: 'adminName', adminName: imageTag.adminName },
    { weakConsistency: true },
  )
  if (tag != null) {
    throw new DomainError('EntityAlreadyExists')
  }

  return Create({
    ...imageTag,
    id: NewImageTagId(),
    createdAt: ctx.now,
    updatedAt: undefined,
  })
}

export const updateImageTag = async (
  ctx: DomainContext,
  imageTagRepository: ImageTagRepository<unknown>,
  imageTag: Omit<ImageTag, 'createdAt' | 'updatedAt'>,
): Promise<{ prevImageTag: ImageTag; nextImageTag: Update<ImageTag> }> => {
  const prevImageTag = await imageTagRepository.get(
    ctx,
    { type: 'id', id: ImageTagId(imageTag.id) },
    { weakConsistency: true },
  )
  if (prevImageTag == null) {
    throw new DomainError('EntityNotFound')
  }
  if (prevImageTag.isLocked) {
    throw new DomainError('FailedPrecondition')
  }

  if (imageTag.adminName !== prevImageTag.adminName) {
    const tag = await imageTagRepository.get(
      ctx,
      { type: 'adminName', adminName: imageTag.adminName },
      { weakConsistency: true },
    )
    if (tag != null) {
      throw new DomainError('EntityAlreadyExists')
    }
  }

  const nextImageTag = Update(
    produce(prevImageTag, (draft) => {
      draft.adminName = imageTag.adminName
      draft.isLocked = imageTag.isLocked
      draft.updatedAt = ctx.now
    }),
  )

  return { prevImageTag, nextImageTag }
}

export const makeImageBundle = async (
  ctx: DomainContext,
  imageTagRepository: ImageTagRepository<unknown>,
  image: Image,
): Promise<ImageBundle> => {
  const [imageBundle] = await makeImageBundles(ctx, imageTagRepository, [image])
  invariant(imageBundle != null)
  return imageBundle
}

export const makeImageBundles = async (
  ctx: DomainContext,
  imageTagRepository: ImageTagRepository<unknown>,
  images: Image[],
): Promise<ImageBundle[]> => {
  const imageTagIds = images.flatMap((image) => image.tagIds)

  const imageTags = isNonEmptyArray(imageTagIds)
    ? (
        await imageTagRepository.offsetPagingList(
          ctx,
          {
            ids: imageTagIds,
            orderBy: [{ key: 'id' }],
            paging: { limit: 10000 },
          },
          { weakConsistency: true },
        )
      ).items
    : []

  return images.map((image) => ({
    image,
    imageTags: imageTags.filter((imageTag) => image.tagIds.includes(imageTag.id)),
  }))
}
