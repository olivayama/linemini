import { JsonValueImpl } from '../mysql-repository'
import { Create, Delete, Update, UpdateFn } from './effect'
import { DomainContext } from '@/domain/context'

export type Paging = {
  cursor: {
    req: {
      exclusiveStartId?: string
      limit: number
    }
    res: {
      lastEvaluatedId?: string
      totalCount: bigint
    }
  }
  offset: {
    req: {
      offset?: number
      limit: number
    }
    res: {
      totalCount: bigint
    }
  }
}

export interface RepositoryQueryOptions {
  weakConsistency?: true
}
export interface RepositoryMutationOptions<Tx> {
  domainEventTransaction?: Tx
}
export type CursorPagingListInput<T> = T & { orderBy?: { desc?: boolean }; paging: Paging['cursor']['req'] }
export type OffsetPagingListInput<T, K> = T & { orderBy: { key: K; desc?: boolean }[]; paging: Paging['offset']['req'] }

// NOTE: domainEventTransaction の渡して良いのは domain event handler のみ
export interface Repository<Tx, Entity extends { id: string }, GetInput, ListInput> {
  persistCreate(ctx: DomainContext, entity: Create<Entity>, options?: RepositoryMutationOptions<Tx>): Promise<Entity>
  persistBulkCreate(
    ctx: DomainContext,
    entities: Create<Entity>[],
    options?: { domainEventTransaction?: Tx },
  ): Promise<Entity[]>
  get(ctx: DomainContext, input: GetInput, options?: RepositoryQueryOptions): Promise<Entity | undefined>
  mustGet(ctx: DomainContext, input: GetInput, options?: RepositoryQueryOptions): Promise<Entity>
  getAllByIds(ctx: DomainContext, ids: Entity['id'][], options?: RepositoryQueryOptions): Promise<Entity[]>
  cursorPagingList(
    ctx: DomainContext,
    input: CursorPagingListInput<ListInput>,
    options?: { weakConsistency?: true },
  ): Promise<{ paging: Paging['cursor']['res']; items: Entity[] }>
  persistUpdate(
    ctx: DomainContext,
    entity: Entity,
    updatedEntityOrUpdateFn: Update<Entity> | UpdateFn<Entity>,
    options?: RepositoryMutationOptions<Tx>,
  ): Promise<Entity>
  persistDelete(ctx: DomainContext, entity: Delete<Entity>, options?: RepositoryMutationOptions<Tx>): Promise<Entity>
  persistBulkDelete(
    ctx: DomainContext,
    entities: Delete<Entity>[],
    options?: RepositoryMutationOptions<Tx>,
  ): Promise<Entity[]>
}

export interface RepositoryOffsetPaging<Tx, Entity extends { id: string }, GetInput, ListInput, OrderByKey>
  extends Repository<Tx, Entity, GetInput, ListInput> {
  offsetPagingList(
    ctx: DomainContext,
    input: OffsetPagingListInput<ListInput, OrderByKey>,
    options?: { weakConsistency?: true },
  ): Promise<{ paging: Paging['offset']['res']; items: Entity[] }>
}

export const getChangedColumns = <T>(prevData: T, nextData: T, columns: readonly (keyof T)[]) => {
  const changedColumns: Partial<T> = {}
  for (const column of columns) {
    if (prevData[column] !== nextData[column]) {
      // NOTE: JSON 型は ===, !== で比較できないので JsonValueImpl の equals を使う
      const prevColumnData = prevData[column]
      const nextColumnData = nextData[column]
      if (prevColumnData instanceof JsonValueImpl && nextColumnData instanceof JsonValueImpl) {
        if (!prevColumnData.equals(nextColumnData)) {
          changedColumns[column] = nextColumnData
        }
      } else if (prevColumnData instanceof Date && nextColumnData instanceof Date) {
        if (prevColumnData.getTime() !== nextColumnData.getTime()) {
          changedColumns[column] = nextColumnData
        }
      } else {
        changedColumns[column] = nextColumnData
      }
    }
  }
  return changedColumns
}
