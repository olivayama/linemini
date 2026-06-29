import { HandlerDomainContext } from '@/context'
import { DomainError } from '@/domain/errors'
import { UserId } from '@/domain/ids'
import { UserRepository } from '@/domain/repositories'
import {
  signInOrUpByLineOpenId,
  verifyUserAccessToken,
  deleteUserById,
  User,
  setUserProfile,
  setUserServiceAgreements,
  setUserTutorialCompletions,
  UserProfile,
  UserServiceAgreement,
  UserTutorialCompletion,
} from '@/domain/user'
import * as userPb from '@/gen/services/user/v1/user_pb'
import { UserService } from '@/gen/services/user/v1/user_service_connect'
import * as pb from '@/gen/services/user/v1/user_service_pb'
import { exportCSV } from '@/stdutils/csv-export'
import { formatToJSTISOString } from '@/stdutils/date'
import { formatDateOnly } from '@/stdutils/date-only'
import { mapOption } from '@/stdutils/option'
import { Timestamp } from '@bufbuild/protobuf'
import { HandlerContext, ServiceImpl } from '@connectrpc/connect'
import invariant from 'tiny-invariant'

// UserServiceV1Gen は UserService の型情報を持つ。
export const UserServiceV1Gen = UserService

// UserServiceV1 は UserService の実装を提供する。
export class UserServiceV1<Tx> implements ServiceImpl<typeof UserService> {
  constructor(private readonly userRepository: UserRepository<Tx>) {}

  // サインインまたはサインアップする。
  async signInOrUpByLineOpenId(req: pb.SignInOrUpByLineOpenIdRequest, context: HandlerContext) {
    // ドメインコンテキストを生成する
    const ctx = new HandlerDomainContext(context)

    // LINEのOpenIDトークンを使ってサインインまたはサインアップする
    const { accessToken, result } = await signInOrUpByLineOpenId(
      ctx,
      this.userRepository,
      req.lineOpenIdToken,
      req.signUpParams,
    )
    // サインアップの場合は、ユーザーを作成する
    if (result.type === 'signUp') {
      await this.userRepository.persistCreate(ctx, result.user)
    }

    return new pb.SignInOrUpByLineOpenIdResponse({
      userId: result.user.id,
      userLineAccountUid: result.user.lineAccount.uid,
      accessToken,
    })
  }

  // 自分のユーザーセッションを取得する。
  async getMyUserSession(req: pb.GetMyUserSessionRequest, context: HandlerContext) {
    // アクセストークンを検証する
    const session = await verifyUserAccessToken(req.accessToken)
    if (session == null) {
      throw new DomainError('Unauthenticated')
    }

    return new pb.GetMyUserSessionResponse({
      userId: session.userId,
      accessToken: req.accessToken,
    })
  }

  // 自分のユーザー情報を取得する。
  async getMyUser(req: pb.GetMyUserRequest, context: HandlerContext) {
    // ドメインコンテキストを生成する
    const ctx = new HandlerDomainContext(context)
    // ユーザー認証を確認する
    ctx.ensureUserAuthenticated()
    // ユーザーIDを取得する
    const userId = ctx.requireUserId()

    // ユーザーを取得する
    const user = await this.userRepository.get(ctx, { type: 'id', id: userId })
    if (user == null) {
      throw new DomainError('EntityNotFound')
    }

    return new pb.GetMyUserResponse({
      user: this.#makeProtoUser(user),
    })
  }

  async getUserById(req: pb.GetUserByIdRequest, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    ctx.ensureAdminAuthenticated()

    const user = await this.userRepository.get(ctx, { type: 'id', id: UserId(req.userId) }, { weakConsistency: true })
    if (user == null) {
      throw new DomainError('EntityNotFound')
    }

    return new pb.GetUserByIdResponse({
      user: this.#makeProtoUser(user),
    })
  }

  async getUserByCustomerNumber(req: pb.GetUserByCustomerNumberRequest, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    ctx.ensureAdminAuthenticated()

    const user = await this.userRepository.get(
      ctx,
      { type: 'customerNumber', customerNumber: req.customerNumber },
      { weakConsistency: true },
    )
    if (user == null) {
      throw new DomainError('EntityNotFound')
    }

    return new pb.GetUserByCustomerNumberResponse({
      user: this.#makeProtoUser(user),
    })
  }

  async listUsers(req: pb.ListUsersRequest, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    ctx.ensureAdminAuthenticated()

    const users = await this.userRepository.cursorPagingList(
      ctx,
      {
        customerNumberPrefix: req.customerNumberPrefix,
        yearMonth: req.yearMonth,
        orderBy: { desc: true },
        paging: {
          limit: Math.min(req.paging?.limit ?? 20, 100),
          exclusiveStartId: req.paging?.exclusiveStartId,
        },
      },
      { weakConsistency: true },
    )

    return new pb.ListUsersResponse({
      users: this.#makeProtoUsers(users.items),
      paging: users.paging,
    })
  }

  // ユーザー情報をCSVにエクスポートする。
  async *exportUsersCSV(req: pb.ExportUsersCSVRequest, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    ctx.ensureAdminAuthenticated()

    const config = {
      repository: this.userRepository,
      headers: [
        'id',
        'customerNumber',
        'signedUpAt',
        'referrer',
        'firstAccessPath',
        'lineAccountUid',
        'birthday',
        'sexCode',
        'prefectureCode',
        'initialQuestionnaireAnswers',
        'serviceAgreements',
        'tutorialCompletions',
      ],
      mapToRow: (user: User) => [
        user.id,
        user.customerNumber,
        formatToJSTISOString(user.signedUpAt),
        user.referrer,
        user.firstAccessPath,
        user.lineAccount.uid,
        mapOption(user.profile?.birthday, formatDateOnly),
        user.profile?.sexCode,
        user.profile?.prefectureCode,
        mapOption(user.profile?.initialQuestionnaireAnswers, JSON.stringify),
        JSON.stringify(user.serviceAgreements),
        JSON.stringify(user.tutorialCompletions),
      ],
      input: {
        yearMonth: req.yearMonth,
        customerNumberPrefix: req.customerNumberPrefix,
      },
    }

    for await (const csv of exportCSV(ctx, config)) {
      yield new pb.ExportUsersCSVResponse({ csv })
    }
  }

  // ユーザー自身がユーザー情報を削除する。
  async deleteMyUser(req: pb.DeleteMyUserRequest, context: HandlerContext) {
    // ドメインコンテキストを生成する
    const ctx = new HandlerDomainContext(context)
    // 本番環境では実行できない
    if (['prd'].includes(ctx.appEnv)) {
      throw new DomainError('OperationNotImplemented')
    }
    // ユーザー認証を確認する
    ctx.ensureUserAuthenticated()
    // ユーザーIDを取得する
    const userId = ctx.requireUserId()
    // ユーザーを削除する
    const user = await deleteUserById(ctx, this.userRepository, userId)
    await this.userRepository.persistDelete(ctx, user)

    return new pb.DeleteMyUserResponse({})
  }

  // Idを指定してユーザー情報を削除する。
  async deleteUserById(req: pb.DeleteUserByIdRequest, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    if (['prd'].includes(ctx.appEnv)) {
      throw new DomainError('OperationNotImplemented')
    }
    ctx.ensureAdminAuthenticated()

    const user = await deleteUserById(ctx, this.userRepository, UserId(req.userId))
    await this.userRepository.persistDelete(ctx, user)

    return new pb.DeleteUserByIdResponse({})
  }

  // ユーザー自身がプロフィールを設定する。
  async setMyProfile(req: pb.SetMyProfileRequest, context: HandlerContext) {
    // ドメインコンテキストを生成する
    const ctx = new HandlerDomainContext(context)
    // ユーザー認証を確認する
    ctx.ensureUserAuthenticated()
    // ユーザーIDを取得する
    const userId = ctx.requireUserId()

    // ユーザーを取得する
    const user = await this.userRepository.get(ctx, { type: 'id', id: userId })
    if (user == null) {
      throw new DomainError('EntityNotFound')
    }
    // プロフィールを更新する
    const updatedUser = setUserProfile(user, {
      birthday: req.profile?.birthday,
      sexCode: req.profile?.sexCode,
      prefectureCode: req.profile?.prefectureCode,
      initialQuestionnaireAnswers:
        req.profile?.initialQuestionnaireAnswers != null
          ? {
              answers: req.profile.initialQuestionnaireAnswers.answers.map((e) => {
                return { question: e.question, answer: e.answer }
              }),
            }
          : undefined,
    })

    // ユーザーを更新する
    const persistUpdatedUser = await this.userRepository.persistUpdate(ctx, user, updatedUser)

    return new pb.SetMyProfileResponse({
      profile: this.#makeProtoUserProfile(persistUpdatedUser.profile),
    })
  }

  // サービス利用規約に同意する。
  async agreeToService(req: pb.AgreeToServiceRequest, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    ctx.ensureUserAuthenticated()
    const userId = ctx.requireUserId()

    const user = await this.userRepository.get(ctx, { type: 'id', id: userId })
    if (user == null) {
      throw new DomainError('EntityNotFound')
    }
    const updatedUser = setUserServiceAgreements(user, [
      ...user.serviceAgreements,
      {
        version: req.version,
        agreedAt: ctx.now,
      },
    ])

    const persistUpdatedUser = await this.userRepository.persistUpdate(ctx, user, updatedUser)

    return new pb.AgreeToServiceResponse({
      serviceAgreements: this.#makeProtoUserServiceAgreements(persistUpdatedUser.serviceAgreements),
    })
  }

  // チュートリアルを完了する。
  async completeTutorial(req: pb.CompleteTutorialRequest, context: HandlerContext) {
    const ctx = new HandlerDomainContext(context)
    ctx.ensureUserAuthenticated()
    const userId = ctx.requireUserId()

    const user = await this.userRepository.get(ctx, { type: 'id', id: userId })
    if (user == null) {
      throw new DomainError('EntityNotFound')
    }

    // req.versionがすでに完了済みの場合は、更新しない。
    if (user.tutorialCompletions.some((e) => e.version === req.version)) {
      return new pb.CompleteTutorialResponse({
        tutorialCompletions: this.#makeProtoUserTutorialCompletions(user.tutorialCompletions),
      })
    }

    const updatedUser = setUserTutorialCompletions(user, [
      ...user.tutorialCompletions,
      {
        version: req.version,
        completedAt: ctx.now,
      },
    ])

    const persistUpdatedUser = await this.userRepository.persistUpdate(ctx, user, updatedUser)

    return new pb.CompleteTutorialResponse({
      tutorialCompletions: this.#makeProtoUserTutorialCompletions(persistUpdatedUser.tutorialCompletions),
    })
  }

  // ユーザー情報を User から UserPb に変換する。複数版を本体とし、単数版は委譲する。
  #makeProtoUser(user: User) {
    const [result] = this.#makeProtoUsers([user])
    invariant(result != null)
    return result
  }

  #makeProtoUsers(users: User[]) {
    return users.map(
      (user) =>
        new userPb.User({
          id: user.id,
          customerNumber: user.customerNumber,
          signedUpAt: Timestamp.fromDate(user.signedUpAt),
          referrer: user.referrer ?? undefined,
          firstAccessPath: user.firstAccessPath,
          lineAccount: new userPb.UserLineAccount({
            uid: user.lineAccount.uid,
          }),
          profile: this.#makeProtoUserProfile(user.profile),
          serviceAgreements: this.#makeProtoUserServiceAgreements(user.serviceAgreements),
          tutorialCompletions: this.#makeProtoUserTutorialCompletions(user.tutorialCompletions),
        }),
    )
  }

  #makeProtoUserProfile(profile?: UserProfile) {
    return profile != null
      ? new userPb.UserProfile({
          birthday: profile.birthday != null ? profile.birthday : undefined,
          sexCode: profile.sexCode != null ? profile.sexCode : undefined,
          prefectureCode: profile.prefectureCode != null ? profile.prefectureCode : undefined,
          initialQuestionnaireAnswers:
            profile.initialQuestionnaireAnswers != null
              ? {
                  answers: profile.initialQuestionnaireAnswers.answers,
                }
              : undefined,
        })
      : undefined
  }

  #makeProtoUserServiceAgreements(agreements: UserServiceAgreement[]) {
    return agreements.map(
      (agreement) =>
        new userPb.UserServiceAgreement({
          agreedAt: Timestamp.fromDate(agreement.agreedAt),
          version: agreement.version,
        }),
    )
  }

  #makeProtoUserTutorialCompletions(completions: UserTutorialCompletion[]) {
    return completions.map(
      (completion) =>
        new userPb.UserTutorialCompletion({
          completedAt: Timestamp.fromDate(completion.completedAt),
          version: completion.version,
        }),
    )
  }
}
