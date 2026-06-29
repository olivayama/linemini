import { NonEmptyArray } from './array'
import { Pool } from './db-pool'
import { Create, Delete, Update, UpdateFn } from './domain/effect'
import { CursorPagingListInput, OffsetPagingListInput, Paging } from './domain/repository'
import { JsonValue } from '@/db/db'
import { DomainContext } from '@/domain/context'
import { DomainError } from '@/domain/errors'
import { DomainEventEmitter, MaybeContainsDomainEvents } from '@/domain/event'
import { isNonEmptyArray } from '@sindresorhus/is'
import {
  ColumnType,
  Insertable,
  Kysely,
  SelectQueryBuilder,
  Selectable,
  Simplify,
  Transaction,
  Updateable,
  sql,
  Expression,
  OperationNode,
} from 'kysely'

export abstract class MySQLRepository<
  DB,
  K extends keyof DB & string,
  T extends DB[K] & { id: string },
  E extends MaybeContainsDomainEvents<{ id: string }>,
  Get,
  ListInput,
> {
  constructor(
    private pool: Pool<DB>,
    private domainEventEmitter: DomainEventEmitter<Transaction<DB>>,
    protected readonly tableName?: K,
  ) {}

  protected getReader(options?: { weakConsistency?: boolean }) {
    return options?.weakConsistency ? this.pool.reader : this.pool.writer
  }

  protected selectReadDB = (options?: { weakConsistency?: boolean }) => this.getReader(options)

  protected transaction(ctx: DomainContext, tx: Transaction<DB> | undefined, fn: (db: Transaction<DB>) => Promise<E>) {
    if (tx != null) {
      return fn(tx)
    } else {
      return this.pool.writer.transaction().execute(async (tx) => {
        const result = await fn(tx)
        if (result.__domainEvents != null && result.__domainEvents.length > 0) {
          for (const e of result.__domainEvents) {
            await this.domainEventEmitter.emit(ctx, tx, e.type, e)
          }
        }
        return result
      })
    }
  }

  protected bulkTransaction(
    ctx: DomainContext,
    tx: Transaction<DB> | undefined,
    fn: (db: Transaction<DB>) => Promise<E[]>,
  ) {
    if (tx != null) {
      return fn(tx)
    } else {
      return this.pool.writer.transaction().execute(async (tx) => {
        const result = await fn(tx)
        for (const e of result) {
          if (e.__domainEvents != null && e.__domainEvents.length > 0) {
            for (const ev of e.__domainEvents) {
              await this.domainEventEmitter.emit(ctx, tx, ev.type, ev)
            }
          }
        }
        return result
      })
    }
  }

  async persistCreate(
    ctx: DomainContext,
    entity: Create<E>,
    options?: { domainEventTransaction?: Transaction<DB> },
  ): Promise<E> {
    return await this.transaction(ctx, options?.domainEventTransaction, async (tx) => {
      await this.insert(tx, [entity])
      return entity
    })
  }

  async persistBulkCreate(
    ctx: DomainContext,
    entities: Create<E>[],
    options?: { domainEventTransaction?: Transaction<DB> },
  ): Promise<E[]> {
    return await this.bulkTransaction(ctx, options?.domainEventTransaction, async (tx) => {
      if (isNonEmptyArray(entities)) {
        await this.insert(tx, entities)
      }
      return entities
    })
  }

  async get(ctx: DomainContext, input: Get, options?: { weakConsistency?: boolean }): Promise<E | undefined> {
    const db = this.getReader(options)
    const [row] = await this.getQuery(ctx, db, input).limit(1).execute()
    if (row == null) return
    return this.loadChildren(db, row)
  }

  async mustGet(ctx: DomainContext, input: Get, options?: { weakConsistency?: boolean }): Promise<E> {
    const entity = await this.get(ctx, input, options)
    if (entity == null) {
      throw new DomainError('EntityNotFound')
    }
    return entity
  }

  async acquireLock(tx: Transaction<DB>, entity: E): Promise<E> {
    try {
      const [row] = await this.acquireLockQuery(tx, entity.id).limit(1).execute()
      if (row == null) {
        throw new DomainError('FailedToAcquireLock')
      }
      return this.loadChildren(tx, row)
    } catch (e) {
      // https://github.com/sidorares/node-mysql2/blob/v3.11.0/typings/mysql/lib/protocol/sequences/Query.d.ts#L100
      if (e != null && typeof e === 'object' && 'code' in e) {
        switch (e.code) {
          // https://github.com/sidorares/node-mysql2/blob/v3.11.0/lib/constants/errors.js#L3378
          case 'ER_LOCK_NOWAIT':
            throw new DomainError('FailedToAcquireLock', { cause: e })
          // https://github.com/sidorares/node-mysql2/blob/v3.11.0/lib/constants/errors.js#L409
          case 'ER_LOCK_WAIT_TIMEOUT':
            throw new DomainError('FailedToAcquireLock', { cause: e })
          // https://github.com/sidorares/node-mysql2/blob/v3.11.0/lib/constants/errors.js#L417
          case 'ER_LOCK_DEADLOCK':
            throw new DomainError('FailedToAcquireLock', { cause: e })
        }
      }
      throw e
    }
  }

  async getAllByIds(ctx: DomainContext, ids: E['id'][], options?: { weakConsistency?: boolean }): Promise<E[]> {
    if (!isNonEmptyArray(ids)) {
      return []
    }
    const db = this.getReader(options)
    const rows = await this.getAllByIdsQuery(ctx, db, ids).execute()
    return isNonEmptyArray(rows) ? this.loadAllChildren(db, rows) : []
  }

  async cursorPagingList(
    ctx: DomainContext,
    input: CursorPagingListInput<ListInput>,
    options?: { weakConsistency?: boolean },
  ): Promise<{ paging: Paging['cursor']['res']; items: E[] }> {
    const db = this.getReader(options)
    const baseQuery = this.listQuery(ctx, db, input).clearOrderBy()

    // CONSIDER: 本来 as がいらないはずだが、tsc が通らないので一旦 as で回避
    const { count } = (await baseQuery
      .clearSelect()
      .select(db.fn.countAll().as('count'))
      .executeTakeFirstOrThrow()) as { count: bigint }

    const idColumn = sql.ref(this.tableName == null ? 'id' : `${this.tableName}.id`)

    const rows = await (input.paging.exclusiveStartId == null
      ? baseQuery
      : baseQuery.where(idColumn, input.orderBy?.desc ? '<' : '>', input.paging.exclusiveStartId)
    )
      .orderBy(idColumn, input.orderBy?.desc ? 'desc' : 'asc')
      .limit(input.paging.limit)
      .execute()

    return {
      items: isNonEmptyArray(rows) ? await this.loadAllChildren(db, rows) : [],
      paging: {
        // CONSIDER: 本来 as がいらないはずだが、tsc が通らないので一旦 as で回避
        lastEvaluatedId: (rows[rows.length - 1] as { id?: string } | undefined)?.id,
        totalCount: BigInt(count),
      },
    }
  }

  async persistUpdate(
    ctx: DomainContext,
    entity: E,
    updatedEntityOrUpdateFn: Update<E> | UpdateFn<E>,
    options?: { domainEventTransaction?: Transaction<DB> },
  ): Promise<E> {
    if (typeof updatedEntityOrUpdateFn === 'function') {
      return await this.transaction(ctx, options?.domainEventTransaction, async (tx) => {
        const currentLocked = await this.acquireLock(tx, entity)
        const next = await updatedEntityOrUpdateFn(Update(currentLocked))
        await this.update(tx, currentLocked, next)
        return next
      })
    } else {
      const current = entity
      const next = updatedEntityOrUpdateFn
      return await this.transaction(ctx, options?.domainEventTransaction, async (tx) => {
        await this.update(tx, current, next)
        return next
      })
    }
  }

  async persistDelete(
    ctx: DomainContext,
    entity: Delete<E>,
    options?: { domainEventTransaction?: Transaction<DB> },
  ): Promise<E> {
    return await this.transaction(ctx, options?.domainEventTransaction, async (tx) => {
      await this.delete(tx, [entity])
      return entity
    })
  }

  async persistBulkDelete(
    ctx: DomainContext,
    entities: Delete<E>[],
    options?: { domainEventTransaction?: Transaction<DB> },
  ): Promise<E[]> {
    return await this.bulkTransaction(ctx, options?.domainEventTransaction, async (tx) => {
      if (isNonEmptyArray(entities)) {
        await this.delete(tx, entities)
      }
      return entities
    })
  }

  async loadChildren(db: Kysely<DB>, primaryRow: Simplify<Selectable<T>>): Promise<E> {
    const [entity] = await this.loadAllChildren(db, [primaryRow])
    return entity
  }

  protected abstract getQuery(ctx: DomainContext, db: Kysely<DB>, input: Get): SelectQueryBuilder<DB, K, Selectable<T>>
  protected abstract acquireLockQuery(tx: Transaction<DB>, id: E['id']): SelectQueryBuilder<DB, K, Selectable<T>>
  protected abstract getAllByIdsQuery(
    ctx: DomainContext,
    db: Kysely<DB>,
    ids: NonEmptyArray<E['id']>,
  ): SelectQueryBuilder<DB, K, Selectable<T>>
  protected abstract listQuery(
    ctx: DomainContext,
    db: Kysely<DB>,
    input: ListInput,
  ): SelectQueryBuilder<DB, K, Selectable<T>>
  protected abstract loadAllChildren(
    db: Kysely<DB>,
    primaryRows: NonEmptyArray<Simplify<Selectable<T>>>,
  ): Promise<NonEmptyArray<E>>

  protected abstract insert(tx: Transaction<DB>, entities: NonEmptyArray<Create<E>>): Promise<void>
  protected abstract update(tx: Transaction<DB>, current: E, next: Update<E>): Promise<void>
  protected abstract delete(tx: Transaction<DB>, entities: NonEmptyArray<Delete<E>>): Promise<void>
}

export abstract class MySQLRepositoryOffsetPaging<
  DB,
  K extends keyof DB & string,
  T extends DB[K] & { id: string },
  E extends MaybeContainsDomainEvents<{ id: string }>,
  Get,
  ListInput,
  ListOrderByKey extends string,
> extends MySQLRepository<DB, K, T, E, Get, ListInput> {
  async offsetPagingList(
    ctx: DomainContext,
    input: OffsetPagingListInput<ListInput, ListOrderByKey>,
    options?: { weakConsistency?: boolean },
  ): Promise<{ paging: Paging['offset']['res']; items: E[] }> {
    const db = this.getReader(options)
    const baseQuery = this.listQuery(ctx, db, input)

    // CONSIDER: 本来 as がいらないはずだが、tsc が通らないので一旦 as で回避
    const { count } = (await baseQuery
      .clearSelect()
      .select(db.fn.countAll().as('count'))
      .executeTakeFirstOrThrow()) as { count: bigint }

    const rows = await baseQuery
      .orderBy(input.orderBy.map((o) => (o.desc ? sql`${sql.ref(o.key)} desc` : sql`${sql.ref(o.key)} asc`)))
      .limit(input.paging.limit)
      .offset(input.paging?.offset ?? 0)
      .execute()

    return {
      items: isNonEmptyArray(rows) ? await this.loadAllChildren(db, rows) : [],
      paging: {
        totalCount: BigInt(count),
      },
    }
  }

  protected abstract listQuery(
    ctx: DomainContext,
    db: Kysely<DB>,
    input: ListInput,
  ): SelectQueryBuilder<DB, K, Selectable<T> & Record<ListOrderByKey, unknown>>
}

export type UnmarshalInput<T> = Selectable<T>
export type MarshalOutput<T> = Insertable<T> & Updateable<T>

// ref. Based on https://kysely.dev/docs/recipes/extending-kysely#expression
export class JsonValueImpl<T extends JsonValue>
  implements Expression<T>, ColumnType<T, Expression<JsonValue>, Expression<JsonValue>>
{
  #value: T

  get __select__(): T {
    return this.#value
  }

  get __insert__(): Expression<JsonValue> {
    return this
  }

  get __update__(): Expression<JsonValue> {
    return this
  }

  constructor(value: T) {
    this.#value = value
  }

  // This is a mandatory getter. You must add it and always return `undefined`.
  // The return type must always be `T | undefined`.
  get expressionType(): T | undefined {
    return undefined
  }

  equals<U extends JsonValue>(x: JsonValueImpl<U>): boolean {
    return JSON.stringify(this.#value) === JSON.stringify(x.#value)
  }

  toOperationNode(): OperationNode {
    const json = JSON.stringify(this.#value)
    // Most of the time you can use the `sql` template tag to build the returned node.
    // The `sql` template tag takes care of passing the `json` string as a parameter, alongside the sql string, to the DB.
    return sql`CAST(${json} AS JSON)`.toOperationNode()
  }
}

const DEFAULT_ESCAPE_CHAR = '\\'

const escape = (value: string): string => {
  return value
    .replace(DEFAULT_ESCAPE_CHAR, DEFAULT_ESCAPE_CHAR + DEFAULT_ESCAPE_CHAR)
    .replace('%', DEFAULT_ESCAPE_CHAR + '%')
    .replace('_', DEFAULT_ESCAPE_CHAR + '_')
}

export const beginsWith = (value: string): string => escape(value) + '%'

export const endsWith = (value: string): string => '%' + escape(value)

export const contains = (value: string): string => '%' + escape(value) + '%'
