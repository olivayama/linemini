import { columns } from '@/db/columns'
import { DomainContext } from '@/domain/context'
import { ImageTagId } from '@/domain/ids'
import { ImageTag } from '@/domain/image'
import {
  ImageTagRepository,
  ImageTagRepositoryGetInput,
  ImageTagRepositoryListInput,
  ImageTagRepositoryListOrderByKey,
} from '@/domain/repositories'
import { mapNonEmptyArray, NonEmptyArray } from '@/stdutils/array'
import { Create, Delete, Update } from '@/stdutils/domain/effect'
import { getChangedColumns } from '@/stdutils/domain/repository'
import { MarshalOutput, MySQLRepositoryOffsetPaging, UnmarshalInput } from '@/stdutils/mysql-repository'
import { Expression, Kysely, Selectable, SelectQueryBuilder, Simplify, SqlBool, Transaction } from 'kysely'

export class ImageTagRepositoryImpl
  extends MySQLRepositoryOffsetPaging<
    DB,
    'imageTag',
    DB['imageTag'],
    ImageTag,
    ImageTagRepositoryGetInput,
    ImageTagRepositoryListInput,
    ImageTagRepositoryListOrderByKey
  >
  implements ImageTagRepository<Transaction<DB>>
{
  protected override getQuery(
    ctx: DomainContext,
    db: Kysely<DB>,
    input: ImageTagRepositoryGetInput,
  ): SelectQueryBuilder<DB, 'imageTag', Selectable<DB['imageTag']>> {
    return db
      .selectFrom('imageTag')
      .selectAll()
      .where((eb) => {
        switch (input.type) {
          case 'id':
            return eb('id', '=', input.id)
          case 'adminName':
            return eb('adminName', '=', input.adminName)
        }
      })
  }

  protected override listQuery(
    ctx: DomainContext,
    db: Kysely<DB>,
    input: ImageTagRepositoryListInput,
  ): SelectQueryBuilder<DB, 'imageTag', Selectable<DB['imageTag']>> {
    return db
      .selectFrom('imageTag')
      .selectAll()
      .where((eb) => {
        const filters: Expression<SqlBool>[] = []

        if (input.ids != null) {
          filters.push(eb('id', 'in', input.ids))
        }

        return eb.and(filters)
      })
  }

  protected override acquireLockQuery(
    tx: Transaction<DB>,
    id: string,
  ): SelectQueryBuilder<DB, 'imageTag', Selectable<DB['imageTag']>> {
    return tx.selectFrom('imageTag').selectAll().where('id', '=', id).forUpdate().noWait()
  }

  protected override getAllByIdsQuery(
    ctx: DomainContext,
    db: Kysely<DB>,
    ids: NonEmptyArray<string>,
  ): SelectQueryBuilder<DB, 'imageTag', Selectable<DB['imageTag']>> {
    return db.selectFrom('imageTag').selectAll().where('id', 'in', ids)
  }

  protected override async loadAllChildren(
    db: Kysely<DB>,
    primaryRows: NonEmptyArray<Simplify<Selectable<DB['imageTag']>>>,
  ): Promise<NonEmptyArray<ImageTag>> {
    return mapNonEmptyArray(primaryRows, (imageTag) => {
      return this.#unmarshal({ imageTag })
    })
  }

  protected override async insert(tx: Transaction<DB>, entities: NonEmptyArray<Create<ImageTag>>): Promise<void> {
    const rowsets = entities.map(this.#marshal)
    // imageTag table
    {
      const rows = rowsets.map((rowset) => rowset.imageTag)
      await tx.insertInto('imageTag').values(rows).execute()
    }
  }

  protected override async update(tx: Transaction<DB>, current: ImageTag, next: Update<ImageTag>): Promise<void> {
    const currentRowset = this.#marshal(current)
    const nextRowset = this.#marshal(next)
    // imageTag table
    {
      const changedColumns = getChangedColumns(currentRowset.imageTag, nextRowset.imageTag, columns.imageTag)
      if (Object.keys(changedColumns).length > 0) {
        await tx.updateTable('imageTag').set(changedColumns).where('id', '=', nextRowset.imageTag.id).execute()
      }
    }
  }

  protected override async delete(tx: Transaction<DB>, entities: NonEmptyArray<Delete<ImageTag>>): Promise<void> {
    const ids = entities.map((entity) => entity.id)
    await tx.deleteFrom('imageTag').where('id', 'in', ids).execute()
  }

  #unmarshal(rowset: { imageTag: UnmarshalInput<ImageTagTable> }): ImageTag {
    return {
      id: ImageTagId(rowset.imageTag.id),
      adminName: rowset.imageTag.adminName,
      isLocked: rowset.imageTag.isLocked === 1,
      createdAt: rowset.imageTag.createdAt,
      updatedAt: rowset.imageTag.updatedAt ?? undefined,
    }
  }

  #marshal(entity: ImageTag): { imageTag: MarshalOutput<ImageTagTable> } {
    return {
      imageTag: {
        id: entity.id,
        adminName: entity.adminName,
        isLocked: entity.isLocked ? 1 : 0,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt ?? null,
      },
    }
  }
}
