import { appConfig } from '../config'
import { generateCustomerNumber } from '../stdutils/customer-number'
import { Create, Delete, Update } from '../stdutils/domain/effect'
import { DomainContext } from './context'
import { DomainError } from './errors'
import { NewUserId, UserId } from './ids'
import { UserRepository } from './repositories'
import { DateOnly } from '@/stdutils/date-only'
import { produce } from 'immer'
import jwt, { GetPublicKeyOrSecret } from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'

// ユーザーを表すオブジェクト。
export type User = {
  id: UserId
  // お客様番号
  customerNumber: string
  // サインアップ日時
  signedUpAt: Date
  // ユーザーが招待されたリファラ
  referrer?: string
  // ユーザーが最初にアクセスしたURLパス
  firstAccessPath: string
  lineAccount: {
    uid: string
  }
  // ユーザーのプロフィール
  profile?: UserProfile
  // サービス利用規約の同意履歴のリスト
  serviceAgreements: UserServiceAgreement[]
  // チュートリアルの完了履歴のリスト
  tutorialCompletions: UserTutorialCompletion[]
}

// ユーザーのプロフィールを表すオブジェクト。
export type UserProfile = {
  // 誕生日
  birthday?: DateOnly
  // 性別コード
  sexCode?: number
  // 都道府県コード
  prefectureCode?: number
  // 初回アンケートの回答
  initialQuestionnaireAnswers?: {
    // 質問と回答のリスト
    answers: {
      question: string
      // 回答のリスト
      answer: string[]
    }[]
  }
}

// サービス利用規約の同意履歴を表すオブジェクト。
export type UserServiceAgreement = {
  version: string
  agreedAt: Date
}

// チュートリアルの完了履歴を表すオブジェクト。
export type UserTutorialCompletion = {
  version: string
  completedAt: Date
}

// サインインまたはサインアップを行う。
// LINEオープンIDトークンを受け取り、ユーザーが存在しない場合は新規作成、存在する場合はサインインを行う。
export const signInOrUpByLineOpenId = async (
  ctx: DomainContext,
  userRepository: UserRepository<unknown>,
  lineOpenIdToken: string,
  signUpParams?: {
    // ユーザーが招待されたリファラ
    referrer?: string
    // ユーザーが最初にアクセスしたURLパス
    firstAccessPath: string
    // サービス利用規約のバージョン
    serviceAgreementVersion: string
  },
): Promise<{
  accessToken: string
  result: { type: 'signUp'; user: Create<User> } | { type: 'signIn'; user: User }
}> => {
  // LINEオープンIDトークンを検証
  const result = await verifyLineOpenIdToken(lineOpenIdToken)
  // 検証に失敗した場合はエラーを返す
  if (result == null) {
    throw new DomainError('Unauthenticated')
  }

  // LINEユーザーIDを元にユーザーを取得
  const user = await userRepository.get(ctx, { type: 'lineUid', lineUid: result.lineUid })
  // ユーザーが存在しない場合は新規作成
  if (user == null) {
    // サインアップパラメータが指定されていない場合はエラーを返す
    if (signUpParams == null) {
      throw new DomainError('FailedPrecondition')
    }
    // 新規ユーザーを作成
    const createUser = Create({
      id: NewUserId(),
      customerNumber: generateCustomerNumber(),
      signedUpAt: ctx.now,
      referrer: signUpParams.referrer,
      firstAccessPath: signUpParams.firstAccessPath,
      lineAccount: {
        uid: result.lineUid,
      },
      serviceAgreements: [
        // サインアップと同時に初回同意を追加する
        {
          version: signUpParams.serviceAgreementVersion,
          agreedAt: ctx.now,
        },
      ],
      // 未完了なので初期値として空配列を設定
      tutorialCompletions: [],
    })
    // サインアップとしてアクセストークンと[User]を返す
    return {
      accessToken: generateAccessToken(createUser, result.exp),
      result: {
        type: 'signUp',
        user: createUser,
      },
    }
  }

  // サインインとしてアクセストークンと[User]を返す
  return {
    accessToken: generateAccessToken(user, result.exp),
    result: {
      type: 'signIn',
      user,
    },
  }
}

// LINEオープンIDトークンを検証する。
// 検証に成功した場合は、LINEユーザーIDと有効期限を返す。
// 検証に失敗した場合はnullを返す。
const verifyLineOpenIdToken = async (lineOpenIdToken: string): Promise<{ lineUid: string; exp: number } | null> => {
  return new Promise((resolve) => {
    // LINEの公開鍵を取得してトークンを検証
    jwt.verify(lineOpenIdToken, jwksPublicKeyFetcher, (err, decoded) => {
      if (err != null || typeof decoded !== 'object' || decoded.sub == null || decoded.exp == null) {
        console.log('verifyLineOpenIdToken error', err, decoded)
        resolve(null)
      } else {
        resolve({ lineUid: decoded.sub, exp: decoded.exp })
      }
    })
  })
}

// LINEの公開鍵を取得するクライアント。
const client = jwksClient({
  jwksUri: 'https://api.line.me/oauth2/v2.1/certs',
})

// LINEの公開鍵を取得する関数。
const jwksPublicKeyFetcher: GetPublicKeyOrSecret = async (header, cb): Promise<void> => {
  try {
    const key = await client.getSigningKey(header.kid)
    cb(null, key.getPublicKey())
  } catch (err) {
    cb(err instanceof Error ? err : null)
  }
}

// アクセストークンを生成する。
const generateAccessToken = (user: User, exp: number): string => {
  const payload = {
    // JWTの発行者
    iss: appConfig.session.jwtIssuer,
    // JWTが誰のために発行されたか
    sub: user.id,
    // JWTの受信者
    aud: appConfig.session.jwtAudience,
    // JWTの有効期限
    exp,
  }
  // JWTを生成
  return jwt.sign(payload, appConfig.session.jwtSecret)
}

// アクセストークンを検証する。
export const verifyUserAccessToken = async (accessToken: string): Promise<{ userId: UserId } | undefined> => {
  return new Promise((resolve) => {
    // JWTを検証
    jwt.verify(accessToken, appConfig.session.jwtSecret, (err, decoded) => {
      // 検証に失敗した場合はnullを返す
      if (err != null || typeof decoded !== 'object' || decoded.sub == null) {
        console.log('failed to verifyUserAccessToken', err, decoded)
        resolve(undefined)
      } else {
        // 検証に成功した場合はユーザーIDを返す
        resolve({ userId: UserId(decoded.sub) })
      }
    })
  })
}

// ユーザー削除用のオブジェクトを生成する。
export const deleteUserById = async (
  ctx: DomainContext,
  userRepository: UserRepository<unknown>,
  id: UserId,
): Promise<Delete<User>> => {
  // ユーザーを取得
  // weakConsistency: true で弱整合性(データが最新でない可能性があることを許容)で取得。
  const user = await userRepository.get(ctx, { type: 'id', id }, { weakConsistency: true })
  // ユーザーが存在しない場合はエラーを返す
  if (user == null) {
    throw new DomainError('EntityNotFound')
  }
  return Delete(user)
}

// ユーザーのプロフィールを更新する。
export const setUserProfile = (user: User, profile: UserProfile): Update<User> => {
  return Update(
    produce(user, (draft) => {
      draft.profile = profile
    }),
  )
}

// サービス利用規約の同意履歴を更新する。
export const setUserServiceAgreements = (user: User, serviceAgreements: UserServiceAgreement[]): Update<User> => {
  return Update(
    produce(user, (draft) => {
      draft.serviceAgreements = serviceAgreements
    }),
  )
}

// チュートリアルの完了履歴を更新する。
export const setUserTutorialCompletions = (user: User, tutorialCompletions: UserTutorialCompletion[]): Update<User> => {
  return Update(
    produce(user, (draft) => {
      draft.tutorialCompletions = tutorialCompletions
    }),
  )
}
