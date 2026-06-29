import { columns } from '@/db/columns'
import { DomainContext } from '@/domain/context'
import { UserId } from '@/domain/ids'
import {
  UserRepository,
  UserRepositoryGetInput,
  UserRepositoryListInput,
  UserRepositoryListOrderByKey,
} from '@/domain/repositories'
import { User } from '@/domain/user'
import { groupToListMap, groupToMap, mapNonEmptyArray, NonEmptyArray } from '@/stdutils/array'
import { dateOnlyToDate, dateToDateOnly } from '@/stdutils/date-only'
import { Create, Delete, Update } from '@/stdutils/domain/effect'
import { getChangedColumns } from '@/stdutils/domain/repository'
import {
  beginsWith,
  JsonValueImpl,
  MarshalOutput,
  MySQLRepositoryOffsetPaging,
  UnmarshalInput,
} from '@/stdutils/mysql-repository'
import { isNotNull } from '@/stdutils/null'
import { yearMonthToEndDateTime, yearMonthToStartDateTime } from '@/stdutils/year-month'
import { Expression, Kysely, SelectQueryBuilder, Selectable, Simplify, SqlBool, Transaction } from 'kysely'

export class UserRepositoryImpl
  extends MySQLRepositoryOffsetPaging<
    DB,
    'user',
    DB['user'],
    User,
    UserRepositoryGetInput,
    UserRepositoryListInput,
    UserRepositoryListOrderByKey
  >
  implements UserRepository<Transaction<DB>>
{
  protected override getQuery(
    ctx: DomainContext,
    db: Kysely<DB>,
    input: UserRepositoryGetInput,
  ): SelectQueryBuilder<DB, 'user', Selectable<DB['user']>> {
    return db
      .selectFrom('user')
      .selectAll()
      .where((eb) => {
        switch (input.type) {
          case 'lineUid':
            return eb.exists(
              eb
                .selectFrom('userLineAccount')
                .selectAll()
                .whereRef('userLineAccount.userId', '=', 'user.id')
                .where('userLineAccount.uid', '=', input.lineUid),
            )
          case 'id':
            return eb('id', '=', input.id)
          case 'customerNumber':
            return eb('customerNumber', '=', input.customerNumber)
        }
      })
  }

  protected override listQuery(
    ctx: DomainContext,
    db: Kysely<DB>,
    input: UserRepositoryListInput,
  ): SelectQueryBuilder<DB, 'user', Selectable<DB['user']>> {
    return db
      .selectFrom('user')
      .selectAll()
      .where((eb) => {
        const filters: Expression<SqlBool>[] = []

        if (input.customerNumberPrefix != null) {
          filters.push(eb('customerNumber', 'like', beginsWith(input.customerNumberPrefix)))
        }

        if (input.yearMonth != null) {
          filters.push(eb('signedUpAt', '>=', yearMonthToStartDateTime(input.yearMonth)))
          filters.push(eb('signedUpAt', '<=', yearMonthToEndDateTime(input.yearMonth)))
        }

        return eb.and(filters)
      })
  }

  protected override acquireLockQuery(
    tx: Transaction<DB>,
    id: string,
  ): SelectQueryBuilder<DB, 'user', Selectable<DB['user']>> {
    return tx.selectFrom('user').selectAll().where('id', '=', id).forUpdate().noWait()
  }

  protected override getAllByIdsQuery(
    ctx: DomainContext,
    db: Kysely<DB>,
    ids: NonEmptyArray<string>,
  ): SelectQueryBuilder<DB, 'user', Selectable<DB['user']>> {
    return db.selectFrom('user').selectAll().where('id', 'in', ids)
  }

  protected override async loadAllChildren(
    db: Kysely<DB>,
    primaryRows: NonEmptyArray<Simplify<Selectable<DB['user']>>>,
  ): Promise<NonEmptyArray<User>> {
    const userIds = primaryRows.map((user) => user.id)

    const userLineAccounts = await db.selectFrom('userLineAccount').selectAll().where('userId', 'in', userIds).execute()

    const userProfiles = await db.selectFrom('userProfile').selectAll().where('userId', 'in', userIds).execute()

    const userServiceAgreements = await db
      .selectFrom('userServiceAgreement')
      .selectAll()
      .where('userId', 'in', userIds)
      .orderBy('agreedAt', 'asc')
      .execute()

    const userTutorialCompletions = await db
      .selectFrom('userTutorialCompletion')
      .selectAll()
      .where('userId', 'in', userIds)
      .orderBy('completedAt', 'asc')
      .execute()

    const userLineAccountsMap = groupToMap(userLineAccounts, 'userId')
    const userProfilesMap = groupToMap(userProfiles, 'userId')
    const userServiceAgreementsMap = groupToListMap(userServiceAgreements, 'userId')
    const userTutorialCompletionsMap = groupToListMap(userTutorialCompletions, 'userId')

    return mapNonEmptyArray(primaryRows, (user) => {
      const userLineAccount = userLineAccountsMap.get(user.id)
      const userProfile = userProfilesMap.get(user.id)
      const userServiceAgreements = userServiceAgreementsMap.get(user.id) ?? []
      const userTutorialCompletions = userTutorialCompletionsMap.get(user.id) ?? []

      if (userLineAccount == null) {
        throw new Error(`failed to loadAllChildren. userLineAccount not found: (userId=${user.id})`)
      }

      return this.#unmarshal({ user, userLineAccount, userProfile, userServiceAgreements, userTutorialCompletions })
    })
  }

  protected override async insert(tx: Transaction<DB>, entities: NonEmptyArray<Create<User>>): Promise<void> {
    const rowsets = entities.map(this.#marshal)
    // user table
    {
      const rows = rowsets.map((rowset) => rowset.user)
      await tx.insertInto('user').values(rows).execute()
    }
    // userLineAccount table
    {
      const rows = rowsets.map((rowset) => rowset.userLineAccount)
      await tx.insertInto('userLineAccount').values(rows).execute()
    }
    // userProfile table
    {
      const rows = rowsets.map((rowset) => rowset.userProfile).filter(isNotNull)
      if (rows.length > 0) {
        await tx.insertInto('userProfile').values(rows).execute()
      }
    }
    // userServiceAgreement table
    {
      const rows = rowsets.flatMap((rowset) => rowset.userServiceAgreements)
      if (rows.length > 0) {
        await tx.insertInto('userServiceAgreement').values(rows).execute()
      }
    }
    // userTutorialCompletion table
    {
      const rows = rowsets.flatMap((rowset) => rowset.userTutorialCompletions)
      if (rows.length > 0) {
        await tx.insertInto('userTutorialCompletion').values(rows).execute()
      }
    }
  }

  protected override async update(tx: Transaction<DB>, current: User, next: Update<User>): Promise<void> {
    const currentRowset = this.#marshal(current)
    const nextRowset = this.#marshal(next)
    // user table
    {
      const changedColumns = getChangedColumns(currentRowset.user, nextRowset.user, columns.user)
      if (Object.keys(changedColumns).length > 0) {
        await tx.updateTable('user').set(changedColumns).where('id', '=', nextRowset.user.id).execute()
      }
    }
    // userLineAccount table
    {
      const changedColumns = getChangedColumns(
        currentRowset.userLineAccount,
        nextRowset.userLineAccount,
        columns.userLineAccount,
      )
      if (Object.keys(changedColumns).length > 0) {
        await tx
          .updateTable('userLineAccount')
          .set(changedColumns)
          .where('userId', '=', nextRowset.userLineAccount.userId)
          .execute()
      }
    }
    // userProfile table
    {
      if (currentRowset.userProfile != null && nextRowset.userProfile != null) {
        const changedColumns = getChangedColumns(currentRowset.userProfile, nextRowset.userProfile, columns.userProfile)
        if (Object.keys(changedColumns).length > 0) {
          await tx
            .updateTable('userProfile')
            .set(changedColumns)
            .where('userId', '=', nextRowset.userProfile.userId)
            .execute()
        }
      } else if (currentRowset.userProfile == null && nextRowset.userProfile != null) {
        await tx.insertInto('userProfile').values(nextRowset.userProfile).execute()
      } else if (currentRowset.userProfile != null && nextRowset.userProfile == null) {
        await tx.deleteFrom('userProfile').where('userId', '=', currentRowset.userProfile.userId).execute()
      }
    }
    // userServiceAgreement table
    {
      if (currentRowset.userServiceAgreements.length > 0) {
        await tx.deleteFrom('userServiceAgreement').where('userId', '=', currentRowset.user.id).execute()
      }
      if (nextRowset.userServiceAgreements.length > 0) {
        await tx.insertInto('userServiceAgreement').values(nextRowset.userServiceAgreements).execute()
      }
    }
    // userTutorialCompletion table
    {
      if (currentRowset.userTutorialCompletions.length > 0) {
        await tx.deleteFrom('userTutorialCompletion').where('userId', '=', currentRowset.user.id).execute()
      }
      if (nextRowset.userTutorialCompletions.length > 0) {
        await tx.insertInto('userTutorialCompletion').values(nextRowset.userTutorialCompletions).execute()
      }
    }
  }

  protected override async delete(tx: Transaction<DB>, entities: NonEmptyArray<Delete<User>>): Promise<void> {
    const ids = entities.map((entity) => entity.id)
    await tx.deleteFrom('userTutorialCompletion').where('userId', 'in', ids).execute()
    await tx.deleteFrom('userServiceAgreement').where('userId', 'in', ids).execute()
    await tx.deleteFrom('userProfile').where('userId', 'in', ids).execute()
    await tx.deleteFrom('userLineAccount').where('userId', 'in', ids).execute()
    await tx.deleteFrom('user').where('id', 'in', ids).execute()
  }

  #unmarshal(rowset: {
    user: UnmarshalInput<UserTable>
    userLineAccount: UnmarshalInput<UserLineAccountTable>
    userProfile?: UnmarshalInput<UserProfileTable>
    userServiceAgreements: UnmarshalInput<UserServiceAgreementTable>[]
    userTutorialCompletions: UnmarshalInput<UserTutorialCompletionTable>[]
  }): User {
    return {
      id: UserId(rowset.user.id),
      customerNumber: rowset.user.customerNumber,
      signedUpAt: rowset.user.signedUpAt,
      referrer: rowset.user.referrer ?? undefined,
      firstAccessPath: rowset.user.firstAccessPath ?? undefined,
      lineAccount: {
        uid: rowset.userLineAccount.uid,
      },
      profile:
        rowset.userProfile == null
          ? undefined
          : {
              birthday:
                rowset.userProfile.birthday != null
                  ? dateToDateOnly(rowset.userProfile.birthday, { timeZone: 'UTC' })
                  : undefined,
              initialQuestionnaireAnswers: rowset.userProfile.initialQuestionnaireAnswers,
              sexCode: rowset.userProfile.sexCode ?? undefined,
              prefectureCode: rowset.userProfile.prefectureCode ?? undefined,
            },
      serviceAgreements: rowset.userServiceAgreements.map((userServiceAgreement) => {
        return {
          version: userServiceAgreement.version,
          agreedAt: userServiceAgreement.agreedAt,
        }
      }),
      tutorialCompletions: rowset.userTutorialCompletions.map((userTutorialCompletion) => {
        return {
          version: userTutorialCompletion.version,
          completedAt: userTutorialCompletion.completedAt,
        }
      }),
    }
  }

  #marshal(entity: User): {
    user: MarshalOutput<UserTable>
    userLineAccount: MarshalOutput<UserLineAccountTable>
    userProfile?: MarshalOutput<UserProfileTable>
    userServiceAgreements: MarshalOutput<UserServiceAgreementTable>[]
    userTutorialCompletions: MarshalOutput<UserTutorialCompletionTable>[]
  } {
    const profile = entity.profile
    return {
      user: {
        id: entity.id,
        customerNumber: entity.customerNumber,
        signedUpAt: entity.signedUpAt,
        referrer: entity.referrer ?? null,
        firstAccessPath: entity.firstAccessPath ?? null,
      },
      userLineAccount: {
        userId: entity.id,
        uid: entity.lineAccount.uid,
      },
      userProfile:
        profile == null
          ? undefined
          : {
              userId: entity.id,
              birthday: profile.birthday != null ? dateOnlyToDate(profile.birthday) : null,
              sexCode: profile.sexCode ?? null,
              prefectureCode: profile.prefectureCode ?? null,
              initialQuestionnaireAnswers: new JsonValueImpl(profile.initialQuestionnaireAnswers ?? null),
            },
      userServiceAgreements: entity.serviceAgreements.map((serviceAgreement) => {
        return {
          userId: entity.id,
          agreedAt: serviceAgreement.agreedAt,
          version: serviceAgreement.version,
        }
      }),
      userTutorialCompletions: entity.tutorialCompletions.map((tutorialCompletion) => {
        return {
          userId: entity.id,
          completedAt: tutorialCompletion.completedAt,
          version: tutorialCompletion.version,
        }
      }),
    }
  }
}
