import { ObjectStorage } from './externals'
import { appConfig } from '@/config'
import { HandlerDomainContext } from '@/context'
import { DomainError } from '@/domain/errors'
import { ImageId, ImageTagId } from '@/domain/ids'
import {
  createImage,
  ImageTag,
  ImageBundle,
  makeImageBundles,
  makeImageBundle,
  updateImage,
  createImageTag,
  updateImageTag,
} from '@/domain/image'
import { ImageRepository, ImageTagRepository } from '@/domain/repositories'
import * as imagePb from '@/gen/services/image/v1/image_pb'
import { ImageService } from '@/gen/services/image/v1/image_service_connect'
import * as pb from '@/gen/services/image/v1/image_service_pb'
import { ensureNotNull } from '@/stdutils/null'
import { mapOption } from '@/stdutils/option'
import { Timestamp } from '@bufbuild/protobuf'
import { HandlerContext, ServiceImpl } from '@connectrpc/connect'
import { init } from '@paralleldrive/cuid2'

const generateImageFileName = init({ length: 12 })

export const ImageServiceV1Gen = ImageService

export class ImageServiceV1<Tx> implements ServiceImpl<typeof ImageService> {
  constructor(
    private readonly imageRepository: ImageRepository<Tx>,
    private readonly imageTagRepository: ImageTagRepository<Tx>,
    private readonly objectStorage: ObjectStorage,
  ) {}

  async uploadImage(req: AsyncIterable<pb.UploadImageRequest>, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    ctx.ensureAdminAuthenticated()

    const firstChunk = await req[Symbol.asyncIterator]().next()
    const bucket = appConfig.s3.publicBucket
    const key = `image/${generateImageFileName()}.png`

    await this.objectStorage.multipartUpload({
      bucket,
      key,
      asyncIter: req,
      mapIterValue: (v) => v.image?.image ?? new Uint8Array(0),
      publicRead: true,
    })

    const image = await createImage(ctx, {
      adminName: firstChunk.value.image.adminName,
      imageUrl: `${appConfig.s3.publicBucketBaseUrl}/${key}`,
      tagIds: firstChunk.value.image.tagIds,
    })
    await this.imageRepository.persistCreate(ctx, image)

    const imageBundle = await makeImageBundle(ctx, this.imageTagRepository, image)

    return new pb.UploadImageResponse({
      image: ImageServiceV1.makeProtoImage(ctx, imageBundle),
    })
  }

  async tmpUploadImage(req: pb.TmpUploadImageRequest, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    ctx.ensureAdminAuthenticated()

    async function* iter() {
      yield new pb.UploadImageRequest({
        adminSecretToken: req.adminSecretToken,
        image: {
          adminName: req.image?.adminName,
          tagIds: req.image?.tagIds,
        },
      })
      yield new pb.UploadImageRequest({
        image: {
          image: req.image?.image,
        },
      })
    }

    const { image } = await this.uploadImage(iter(), context)

    return new pb.TmpUploadImageResponse({
      image,
    })
  }

  async updateUploadImage(req: AsyncIterable<pb.UpdateUploadImageRequest>, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    ctx.ensureAdminAuthenticated()

    const firstChunk = await req[Symbol.asyncIterator]().next()

    let newKey: string | undefined = undefined
    // TODO: value が any になる件を別途調査
    if (Boolean(firstChunk.value.replaceImage)) {
      const bucket = appConfig.s3.publicBucket
      newKey = `image/${generateImageFileName()}.png`
      await this.objectStorage.multipartUpload({
        bucket,
        key: newKey,
        asyncIter: req,
        mapIterValue: (v) => v.image?.image ?? new Uint8Array(0),
        publicRead: true,
      })
    }

    const { prevImage, nextImage } = await updateImage(ctx, this.imageRepository, {
      id: ImageId(firstChunk.value.image.id),
      adminName: firstChunk.value.image.adminName,
      imageUrl: newKey != null ? `${appConfig.s3.publicBucketBaseUrl}/${newKey}` : undefined,
      tagIds: firstChunk.value.image.tagIds,
    })

    await this.imageRepository.persistUpdate(ctx, prevImage, nextImage)

    const imageBundle = await makeImageBundle(ctx, this.imageTagRepository, nextImage)

    return new pb.UpdateUploadImageResponse({
      image: ImageServiceV1.makeProtoImage(ctx, imageBundle),
    })
  }

  async updateTmpUploadImage(req: pb.UpdateTmpUploadImageRequest, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    ctx.ensureAdminAuthenticated()

    async function* iter() {
      yield new pb.UpdateUploadImageRequest({
        image: {
          id: req.image?.id,
          adminName: req.image?.adminName,
          tagIds: req.image?.tagIds,
        },
        replaceImage: req.replaceImage,
      })
      if (req.replaceImage) {
        yield new pb.UpdateUploadImageRequest({
          image: {
            image: req.image?.image,
          },
        })
      }
    }

    const { image } = await this.updateUploadImage(iter(), context)

    return new pb.UpdateTmpUploadImageResponse({
      image,
    })
  }

  async listImages(req: pb.ListImagesRequest, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    ctx.ensureAdminAuthenticated()

    const res = await this.imageRepository.offsetPagingList(
      ctx,
      {
        imageTagId: mapOption(req.imageTagId, ImageTagId),
        orderBy: [{ key: 'id', desc: true }],
        paging: {
          limit: Math.min(req.paging?.limit ?? 20, 100),
          offset: req.paging?.offset,
        },
      },
      { weakConsistency: true },
    )

    const imageBundles = await makeImageBundles(ctx, this.imageTagRepository, res.items)

    return new pb.ListImagesResponse({
      images: ImageServiceV1.makeProtoImages(ctx, imageBundles),
      paging: res.paging,
    })
  }

  async getImageById(req: pb.GetImageByIdRequest, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    ctx.ensureAdminAuthenticated()

    const image = await this.imageRepository.get(
      ctx,
      {
        id: ImageId(req.imageId),
        type: 'id',
      },
      { weakConsistency: true },
    )
    if (image == null) {
      throw new DomainError('EntityNotFound')
    }

    const imageBundle = await makeImageBundle(ctx, this.imageTagRepository, image)

    return new pb.GetImageByIdResponse({
      image: ImageServiceV1.makeProtoImage(ctx, imageBundle),
    })
  }

  async createImageTag(req: pb.CreateImageTagRequest, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    ctx.ensureAdminAuthenticated()

    const reqImageTag = ensureNotNull(req.imageTag)

    const createdImageTag = await createImageTag(ctx, this.imageTagRepository, {
      adminName: reqImageTag.adminName,
      isLocked: reqImageTag.isLocked,
    })
    await this.imageTagRepository.persistCreate(ctx, createdImageTag)

    return new pb.CreateImageTagResponse({
      imageTag: ImageServiceV1.makeProtoImageTag(ctx, createdImageTag),
    })
  }

  async getImageTagById(req: pb.GetImageTagByIdRequest, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    ctx.ensureAdminAuthenticated()

    const imageTag = await this.imageTagRepository.get(
      ctx,
      {
        id: ImageTagId(req.imageTagId),
        type: 'id',
      },
      { weakConsistency: true },
    )
    if (imageTag == null) {
      throw new DomainError('EntityNotFound')
    }

    return new pb.GetImageTagByIdResponse({
      imageTag: ImageServiceV1.makeProtoImageTag(ctx, imageTag),
    })
  }

  async getImageTagByAdminName(req: pb.GetImageTagByAdminNameRequest, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    ctx.ensureAdminAuthenticated()

    const imageTag = await this.imageTagRepository.get(
      ctx,
      { type: 'adminName', adminName: req.adminName },
      { weakConsistency: true },
    )
    if (imageTag == null) {
      throw new DomainError('EntityNotFound')
    }

    return new pb.GetImageTagByAdminNameResponse({
      imageTag: ImageServiceV1.makeProtoImageTag(ctx, imageTag),
    })
  }

  async listImageTags(req: pb.ListImageTagsRequest, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    ctx.ensureAdminAuthenticated()

    const res = await this.imageTagRepository.offsetPagingList(
      ctx,
      {
        orderBy: [{ key: 'id', desc: true }],
        paging: {
          limit: Math.min(req.paging?.limit ?? 20, 100),
          offset: req.paging?.offset,
        },
      },
      { weakConsistency: true },
    )

    return new pb.ListImageTagsResponse({
      imageTags: ImageServiceV1.makeProtoImageTags(ctx, res.items),
      paging: res.paging,
    })
  }

  async updateImageTag(req: pb.UpdateImageTagRequest, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    ctx.ensureAdminAuthenticated()

    const reqImageTag = ensureNotNull(req.imageTag)

    const { prevImageTag, nextImageTag } = await updateImageTag(ctx, this.imageTagRepository, {
      id: ImageTagId(reqImageTag.id),
      adminName: reqImageTag.adminName,
      isLocked: reqImageTag.isLocked,
    })

    await this.imageTagRepository.persistUpdate(ctx, prevImageTag, nextImageTag)

    return new pb.UpdateImageTagResponse({
      imageTag: ImageServiceV1.makeProtoImageTag(ctx, nextImageTag),
    })
  }

  static makeProtoImage(ctx: HandlerDomainContext, imageBundle: ImageBundle) {
    return new imagePb.Image({
      id: imageBundle.image.id,
      adminName: ctx.maskAdminValue(imageBundle.image.adminName, ''),
      imageUrl: imageBundle.image.imageUrl,
      createdAt: Timestamp.fromDate(imageBundle.image.createdAt),
      updatedAt: mapOption(imageBundle.image.updatedAt, Timestamp.fromDate),
      tagIds: imageBundle.image.tagIds,
      tags: imageBundle.imageTags.map((imageTag) => ImageServiceV1.makeProtoImageTag(ctx, imageTag)),
    })
  }

  static makeProtoImages(ctx: HandlerDomainContext, imageBundles: ImageBundle[]) {
    return imageBundles.map((imageBundle) => ImageServiceV1.makeProtoImage(ctx, imageBundle))
  }

  static makeProtoImageTag(ctx: HandlerDomainContext, imageTag: ImageTag) {
    return new imagePb.ImageTag({
      id: imageTag.id,
      adminName: ctx.maskAdminValue(imageTag.adminName, ''),
      isLocked: imageTag.isLocked,
      createdAt: Timestamp.fromDate(imageTag.createdAt),
      updatedAt: mapOption(imageTag.updatedAt, Timestamp.fromDate),
    })
  }

  static makeProtoImageTags(ctx: HandlerDomainContext, imageTags: ImageTag[]) {
    return imageTags.map((imageTag) => ImageServiceV1.makeProtoImageTag(ctx, imageTag))
  }
}
