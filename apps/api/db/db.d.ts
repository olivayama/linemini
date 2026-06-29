import { JsonColumns } from './json-columns'
import type { ColumnType } from 'kysely'
import type { Expression } from 'kysely'

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>
export type JsonArray = JsonValue[]

export type JsonObject = {
  [K in string]?: JsonValue
}

export type JsonPrimitive = boolean | number | string | null

export type JsonValue = JsonArray | JsonObject | JsonPrimitive

declare global {
  export interface AdministratorTable {
    deactivatedAt: Date | null
    email: string
    id: string
  }

  export interface AdministratorInvitationTable {
    acceptedAt: Date | null
    administratorId: string
    expirationDate: Date
    hashedToken: string
    invitedAt: Date
  }

  export interface AdministratorLoginCredentialTable {
    administratorId: string
    changedAt: Date | null
    hashedPassword: string
    initializedAt: Date
  }

  export interface FeatureToggleTable {
    settings: ColumnType<JsonColumns['featureToggle__settings'], Expression<JsonValue>, Expression<JsonValue>>
    userId: string
  }

  export interface GooseDbVersionTable {
    id: Generated<number>
    isApplied: number
    tstamp: Generated<Date | null>
    versionId: number
  }

  export interface ImageTable {
    adminName: string
    createdAt: Date
    id: string
    imageUrl: string
    updatedAt: Date | null
  }

  export interface ImageTagTable {
    adminName: string
    createdAt: Date
    id: string
    isLocked: number
    updatedAt: Date | null
  }

  export interface ImageTagRelTable {
    imageId: string
    imageTagId: string
  }

  export interface UserTable {
    customerNumber: string
    firstAccessPath: string
    id: string
    referrer: string | null
    signedUpAt: Date
  }

  export interface UserLineAccountTable {
    uid: string
    userId: string
  }

  export interface UserProfileTable {
    birthday: Date | null
    initialQuestionnaireAnswers: ColumnType<
      JsonColumns['userProfile__initialQuestionnaireAnswers'],
      Expression<JsonValue>,
      Expression<JsonValue>
    >
    prefectureCode: number | null
    sexCode: number | null
    userId: string
  }

  export interface UserServiceAgreementTable {
    agreedAt: Date
    userId: string
    version: string
  }

  export interface UserTutorialCompletionTable {
    completedAt: Date
    userId: string
    version: string
  }

  export interface DB {
    administrator: AdministratorTable
    administratorInvitation: AdministratorInvitationTable
    administratorLoginCredential: AdministratorLoginCredentialTable
    featureToggle: FeatureToggleTable
    gooseDbVersion: GooseDbVersionTable
    image: ImageTable
    imageTag: ImageTagTable
    imageTagRel: ImageTagRelTable
    user: UserTable
    userLineAccount: UserLineAccountTable
    userProfile: UserProfileTable
    userServiceAgreement: UserServiceAgreementTable
    userTutorialCompletion: UserTutorialCompletionTable
  }
}
