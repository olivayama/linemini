import { columns } from '@/db/columns'
import { DomainContext } from '@/domain/context'
import { ImageId, ImageTagId } from '@/domain/ids'
import { Image } from '@/domain/image'
import {
  ImageRepository,
  ImageRepositoryGetInput,
  ImageRepositoryListInput,
  ImageRepositoryListOrderByKey,
} from '@/domain/repositories'
import { groupToListMap, mapNonEmptyArray, NonEmptyArray } from '@/stdutils/array'
import { Create, Delete, Update } from '@/stdutils/domain/effect'
import { getChangedColumns } from '@/stdutils/domain/repository'
import { MarshalOutput, MySQLRepositoryOffsetPaging, UnmarshalInput } from '@/stdutils/mysql-repository'
import { Expression, Kysely, Selectable, SelectQueryBuilder, Simplify, SqlBool, Transaction } from 'kysely'

export class ImageRepositoryImpl
  extends MySQLRepositoryOffsetPaging<
    DB,
    'image',
    DB['image'],
    Image,
    ImageRepositoryGetInput,
    ImageRepositoryListInput,
    ImageRepositoryListOrderByKey
  >
  implements ImageRepository<Transaction<DB>>
{
  protected override getQuery(
    ctx: DomainContext,
    db: Kysely<DB>,
    input: ImageRepositoryGetInput,
  ): SelectQueryBuilder<DB, 'image', Selectable<DB['image']>> {
    return db.selectFrom('image').selectAll().where('id', '=', input.id)
  }

  protected override listQuery(
    ctx: DomainContext,
    db: Kysely<DB>,
    input: ImageRepositoryListInput,
  ): SelectQueryBuilder<DB, 'image', Selectable<DB['image']>> {
    return db
      .selectFrom('image')
      .selectAll()
      .where((eb) => {
        const filters: Expression<SqlBool>[] = []

        if (input.ids != null) {
          filters.push(eb('id', 'in', input.ids))
        }

        if (input.imageTagId != null) {
          filters.push(
            eb.exists(
              eb
                .selectFrom('imageTagRel')
                .selectAll()
                .whereRef('imageTagRel.imageId', '=', 'image.id')
                .where('imageTagRel.imageTagId', '=', input.imageTagId),
            ),
          )
        }

        return eb.and(filters)
      })
  }

  protected override acquireLockQuery(
    tx: Transaction<DB>,
    id: string,
  ): SelectQueryBuilder<DB, 'image', Selectable<DB['image']>> {
    return tx.selectFrom('image').selectAll().where('id', '=', id).forUpdate().noWait()
  }

  protected override getAllByIdsQuery(
    ctx: DomainContext,
    db: Kysely<DB>,
    ids: NonEmptyArray<string>,
  ): SelectQueryBuilder<DB, 'image', Selectable<DB['image']>> {
    return db.selectFrom('image').selectAll().where('id', 'in', ids)
  }

  protected override async loadAllChildren(
    db: Kysely<DB>,
    primaryRows: NonEmptyArray<Simplify<Selectable<DB['image']>>>,
  ): Promise<NonEmptyArray<Image>> {
    const imageTagRels = await db
      .selectFrom('imageTagRel')
      .selectAll()
      .where(
        'imageId',
        'in',
        primaryRows.map((image) => image.id),
      )
      .orderBy('imageTagId', 'asc')
      .execute()
    const imageTagRelsMap = groupToListMap(imageTagRels, 'imageId')

    return mapNonEmptyArray(primaryRows, (image) => {
      const imageTagRels = imageTagRelsMap.get(image.id) ?? []
      return this.#unmarshal({ image, imageTagRels })
    })
  }

  protected override async insert(tx: Transaction<DB>, entities: NonEmptyArray<Create<Image>>): Promise<void> {
    const rowsets = entities.map(this.#marshal)
    // image table
    {
      const rows = rowsets.map((rowset) => rowset.image)
      await tx.insertInto('image').values(rows).execute()
    }
    // imageTagRel table
    {
      const rows = rowsets.flatMap((rowset) => rowset.imageTagRels)
      if (rows.length > 0) {
        await tx.insertInto('imageTagRel').values(rows).execute()
      }
    }
  }

  protected override async update(tx: Transaction<DB>, current: Image, next: Update<Image>): Promise<void> {
    const currentRowset = this.#marshal(current)
    const nextRowset = this.#marshal(next)
    // image table
    {
      const changedColumns = getChangedColumns(currentRowset.image, nextRowset.image, columns.image)
      if (Object.keys(changedColumns).length > 0) {
        await tx.updateTable('image').set(changedColumns).where('id', '=', nextRowset.image.id).execute()
      }
    }
    // imageTagRel table
    {
      if (currentRowset.imageTagRels.length > 0) {
        await tx.deleteFrom('imageTagRel').where('imageId', '=', nextRowset.image.id).execute()
      }
      if (nextRowset.imageTagRels.length > 0) {
        await tx.insertInto('imageTagRel').values(nextRowset.imageTagRels).execute()
      }
    }
  }

  protected override async delete(tx: Transaction<DB>, entities: NonEmptyArray<Delete<Image>>): Promise<void> {
    const ids = entities.map((entity) => entity.id)
    await tx.deleteFrom('imageTagRel').where('imageId', 'in', ids).execute()
    await tx.deleteFrom('image').where('id', 'in', ids).execute()
  }

  #unmarshal(rowset: { image: UnmarshalInput<ImageTable>; imageTagRels: UnmarshalInput<ImageTagRelTable>[] }): Image {
    return {
      id: ImageId(rowset.image.id),
      adminName: rowset.image.adminName,
      imageUrl: rowset.image.imageUrl,
      createdAt: rowset.image.createdAt,
      updatedAt: rowset.image.updatedAt ?? undefined,
      tagIds: rowset.imageTagRels.map((rel) => ImageTagId(rel.imageTagId)),
    }
  }

  #marshal(entity: Image): {
    image: MarshalOutput<ImageTable>
    imageTagRels: MarshalOutput<ImageTagRelTable>[]
  } {
    return {
      image: {
        id: entity.id,
        adminName: entity.adminName,
        imageUrl: entity.imageUrl,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt ?? null,
      },
      imageTagRels: entity.tagIds.map((tagId) => ({
        imageId: entity.id,
        imageTagId: tagId,
      })),
    }
  }
}
