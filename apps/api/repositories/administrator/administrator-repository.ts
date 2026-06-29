import { columns } from '@/db/columns'
import { Administrator } from '@/domain/administrator'
import { DomainContext } from '@/domain/context'
import { AdministratorId } from '@/domain/ids'
import {
  AdministratorRepository,
  AdministratorRepositoryGetInput,
  AdministratorRepositoryListInput,
  AdministratorRepositoryListOrderByKey,
} from '@/domain/repositories'
import { groupToMap, mapNonEmptyArray, NonEmptyArray } from '@/stdutils/array'
import { Create, Delete, Update } from '@/stdutils/domain/effect'
import { getChangedColumns } from '@/stdutils/domain/repository'
import { MarshalOutput, MySQLRepositoryOffsetPaging, UnmarshalInput } from '@/stdutils/mysql-repository'
import { isNotNull } from '@/stdutils/null'
import { Kysely, Selectable, SelectQueryBuilder, Simplify, Transaction } from 'kysely'

export class AdministratorRepositoryImpl
  extends MySQLRepositoryOffsetPaging<
    DB,
    'administrator',
    DB['administrator'],
    Administrator,
    AdministratorRepositoryGetInput,
    AdministratorRepositoryListInput,
    AdministratorRepositoryListOrderByKey
  >
  implements AdministratorRepository<Transaction<DB>>
{
  protected override getQuery(
    ctx: DomainContext,
    db: Kysely<DB>,
    input: AdministratorRepositoryGetInput,
  ): SelectQueryBuilder<DB, 'administrator', Selectable<DB['administrator']>> {
    return db
      .selectFrom('administrator')
      .selectAll()
      .where((eb) => {
        switch (input.type) {
          case 'id':
            return eb('id', '=', input.id)
          case 'email':
            return eb('email', '=', input.email)
        }
      })
  }

  protected override listQuery(
    ctx: DomainContext,
    db: Kysely<DB>,
    input: AdministratorRepositoryListInput,
  ): SelectQueryBuilder<DB, 'administrator', Selectable<DB['administrator']>> {
    return db.selectFrom('administrator').selectAll()
  }

  protected override acquireLockQuery(
    tx: Transaction<DB>,
    id: string,
  ): SelectQueryBuilder<DB, 'administrator', Selectable<DB['administrator']>> {
    return tx.selectFrom('administrator').selectAll().where('id', '=', id).forUpdate().noWait()
  }

  protected override getAllByIdsQuery(
    ctx: DomainContext,
    db: Kysely<DB>,
    ids: NonEmptyArray<string>,
  ): SelectQueryBuilder<DB, 'administrator', Selectable<DB['administrator']>> {
    return db.selectFrom('administrator').selectAll().where('id', 'in', ids)
  }

  protected override async loadAllChildren(
    db: Kysely<DB>,
    primaryRows: NonEmptyArray<Simplify<Selectable<DB['administrator']>>>,
  ): Promise<NonEmptyArray<Administrator>> {
    const administratorIds = primaryRows.map((administrator) => administrator.id)

    const administratorInvitations = await db
      .selectFrom('administratorInvitation')
      .selectAll()
      .where('administratorId', 'in', administratorIds)
      .execute()
    const administratorInvitationsMap = groupToMap(administratorInvitations, 'administratorId')

    const administratorLoginCredentials = await db
      .selectFrom('administratorLoginCredential')
      .selectAll()
      .where('administratorId', 'in', administratorIds)
      .execute()
    const administratorLoginCredentialsMap = groupToMap(administratorLoginCredentials, 'administratorId')

    return mapNonEmptyArray(primaryRows, (administrator) => {
      const administratorInvitation = administratorInvitationsMap.get(administrator.id)
      const administratorLoginCredential = administratorLoginCredentialsMap.get(administrator.id)
      return this.#unmarshal({ administrator, administratorInvitation, administratorLoginCredential })
    })
  }

  protected override async insert(tx: Transaction<DB>, entities: NonEmptyArray<Create<Administrator>>): Promise<void> {
    const rowsets = entities.map(this.#marshal)
    // administrator table
    {
      const rows = rowsets.map((rowset) => rowset.administrator)
      await tx.insertInto('administrator').values(rows).execute()
    }
    // administratorInvitation table
    {
      const rows = rowsets.map((rowset) => rowset.administratorInvitation).filter(isNotNull)
      if (rows.length > 0) {
        await tx.insertInto('administratorInvitation').values(rows).execute()
      }
    }
    // administratorLoginCredential table
    {
      const rows = rowsets.map((rowset) => rowset.administratorLoginCredential).filter(isNotNull)
      if (rows.length > 0) {
        await tx.insertInto('administratorLoginCredential').values(rows).execute()
      }
    }
  }

  protected override async update(
    tx: Transaction<DB>,
    current: Administrator,
    next: Update<Administrator>,
  ): Promise<void> {
    const currentRowset = this.#marshal(current)
    const nextRowset = this.#marshal(next)
    // administrator table
    {
      const changedColumns = getChangedColumns(
        currentRowset.administrator,
        nextRowset.administrator,
        columns.administrator,
      )
      if (Object.keys(changedColumns).length > 0) {
        await tx
          .updateTable('administrator')
          .set(changedColumns)
          .where('id', '=', nextRowset.administrator.id)
          .execute()
      }
    }
    // administratorInvitation table
    {
      if (currentRowset.administratorInvitation != null && nextRowset.administratorInvitation != null) {
        const changedColumns = getChangedColumns(
          currentRowset.administratorInvitation,
          nextRowset.administratorInvitation,
          columns.administratorInvitation,
        )
        if (Object.keys(changedColumns).length > 0) {
          await tx
            .updateTable('administratorInvitation')
            .set(changedColumns)
            .where('administratorId', '=', nextRowset.administratorInvitation.administratorId)
            .execute()
        }
      } else if (currentRowset.administratorInvitation == null && nextRowset.administratorInvitation != null) {
        await tx.insertInto('administratorInvitation').values(nextRowset.administratorInvitation).execute()
      } else if (currentRowset.administratorInvitation != null && nextRowset.administratorInvitation == null) {
        await tx
          .deleteFrom('administratorInvitation')
          .where('administratorId', '=', currentRowset.administratorInvitation.administratorId)
          .execute()
      }
    }
    // administratorLoginCredential table
    {
      if (currentRowset.administratorLoginCredential != null && nextRowset.administratorLoginCredential != null) {
        const changedColumns = getChangedColumns(
          currentRowset.administratorLoginCredential,
          nextRowset.administratorLoginCredential,
          columns.administratorLoginCredential,
        )
        if (Object.keys(changedColumns).length > 0) {
          await tx
            .updateTable('administratorLoginCredential')
            .set(changedColumns)
            .where('administratorId', '=', nextRowset.administratorLoginCredential.administratorId)
            .execute()
        }
      } else if (
        currentRowset.administratorLoginCredential == null &&
        nextRowset.administratorLoginCredential != null
      ) {
        await tx.insertInto('administratorLoginCredential').values(nextRowset.administratorLoginCredential).execute()
      } else if (
        currentRowset.administratorLoginCredential != null &&
        nextRowset.administratorLoginCredential == null
      ) {
        await tx
          .deleteFrom('administratorLoginCredential')
          .where('administratorId', '=', currentRowset.administratorLoginCredential.administratorId)
          .execute()
      }
    }
  }

  protected override async delete(tx: Transaction<DB>, entities: NonEmptyArray<Delete<Administrator>>): Promise<void> {
    const ids = entities.map((entity) => entity.id)
    await tx.deleteFrom('administratorLoginCredential').where('administratorId', 'in', ids).execute()
    await tx.deleteFrom('administratorInvitation').where('administratorId', 'in', ids).execute()
    await tx.deleteFrom('administrator').where('id', 'in', ids).execute()
  }

  #unmarshal(rowset: {
    administrator: UnmarshalInput<AdministratorTable>
    administratorInvitation?: UnmarshalInput<AdministratorInvitationTable>
    administratorLoginCredential?: UnmarshalInput<AdministratorLoginCredentialTable>
  }): Administrator {
    return {
      id: AdministratorId(rowset.administrator.id),
      email: rowset.administrator.email,
      deactivatedAt: rowset.administrator.deactivatedAt ?? undefined,
      invitation:
        rowset.administratorInvitation == null
          ? undefined
          : {
              hashedToken: rowset.administratorInvitation.hashedToken,
              expirationDate: rowset.administratorInvitation.expirationDate,
              invitedAt: rowset.administratorInvitation.invitedAt,
              acceptedAt: rowset.administratorInvitation.acceptedAt ?? undefined,
            },
      loginCredential:
        rowset.administratorLoginCredential == null
          ? undefined
          : {
              hashedPassword: rowset.administratorLoginCredential.hashedPassword,
              initializedAt: rowset.administratorLoginCredential.initializedAt,
              changedAt: rowset.administratorLoginCredential.changedAt ?? undefined,
            },
    }
  }

  #marshal(entity: Administrator): {
    administrator: MarshalOutput<AdministratorTable>
    administratorInvitation?: MarshalOutput<AdministratorInvitationTable>
    administratorLoginCredential?: MarshalOutput<AdministratorLoginCredentialTable>
  } {
    return {
      administrator: {
        id: entity.id,
        email: entity.email,
        deactivatedAt: entity.deactivatedAt ?? null,
      },
      administratorInvitation:
        entity.invitation == null
          ? undefined
          : {
              administratorId: entity.id,
              hashedToken: entity.invitation.hashedToken,
              expirationDate: entity.invitation.expirationDate,
              invitedAt: entity.invitation.invitedAt,
              acceptedAt: entity.invitation.acceptedAt ?? null,
            },
      administratorLoginCredential:
        entity.loginCredential == null
          ? undefined
          : {
              administratorId: entity.id,
              hashedPassword: entity.loginCredential.hashedPassword,
              initializedAt: entity.loginCredential.initializedAt,
              changedAt: entity.loginCredential.changedAt ?? null,
            },
    }
  }
}
