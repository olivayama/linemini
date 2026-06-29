# UserService

## SignInOrUpByLineOpenId

LINE OpenID でユーザー登録もしくはログインする

- **@throws** Unauthenticated 認証に失敗した場合
  @throws FailedPrecondition サービス同意バージョンの指定なしでユーザーを作成しようとした場合

### Request

| Name               | Type                                                                        | Label    | Description                            |
| ------------------ | --------------------------------------------------------------------------- | -------- | -------------------------------------- |
| line_open_id_token | string                                                                      |          | LINE OpenID トークン                   |
| sign_up_params     | [SignUpParams](#servicesuser.v1.signinorupbylineopenidrequest.signupparams) | optional | サインアップ時にのみ指定するパラメータ |

### Response

| Name                  | Type   | Label | Description         |
| --------------------- | ------ | ----- | ------------------- |
| user_id               | string |       | ユーザー ID         |
| user_line_account_uid | string |       | LINE アカウント UID |
| access_token          | string |       | アクセストークン    |

## GetMyUserSession

アクセストークンに紐付くユーザーのセッションを取得する

- **@throws** Unauthenticated 認証に失敗した場合

### Request

| Name         | Type   | Label | Description      |
| ------------ | ------ | ----- | ---------------- |
| access_token | string |       | アクセストークン |

### Response

| Name         | Type   | Label | Description      |
| ------------ | ------ | ----- | ---------------- |
| user_id      | string |       | ユーザー ID      |
| access_token | string |       | アクセストークン |

## GetMyUser

アクセストークンに紐付くユーザーの情報を取得する

- **@throws** Unauthenticated 認証に失敗した場合

### Request

| Name | Type | Label | Description |
| ---- | ---- | ----- | ----------- |

### Response

| Name | Type                          | Label | Description  |
| ---- | ----------------------------- | ----- | ------------ |
| user | [User](#servicesuser.v1.user) |       | ユーザー情報 |

## GetUserById

id でユーザーの情報を取得する

- **@throws** Unauthenticated 認証に失敗した場合

### Request

| Name    | Type   | Label | Description |
| ------- | ------ | ----- | ----------- |
| user_id | string |       |             |

### Response

| Name | Type                          | Label | Description |
| ---- | ----------------------------- | ----- | ----------- |
| user | [User](#servicesuser.v1.user) |       |             |

## GetUserByCustomerNumber

customer_number でユーザーの情報を取得する

- **@throws** Unauthenticated 認証に失敗した場合

### Request

| Name            | Type   | Label | Description |
| --------------- | ------ | ----- | ----------- |
| customer_number | string |       |             |

### Response

| Name | Type                          | Label | Description |
| ---- | ----------------------------- | ----- | ----------- |
| user | [User](#servicesuser.v1.user) |       |             |

## ListUsers

ユーザーの一覧を取得する

- **@throws** Unauthenticated 認証に失敗した場合

### Request

| Name                   | Type                                                | Label    | Description |
| ---------------------- | --------------------------------------------------- | -------- | ----------- |
| paging                 | [PagingCursorRequest](#stdutilspagingcursorrequest) |          |             |
| customer_number_prefix | string                                              | optional |             |
| year_month             | [YearMonth](#stdutilsyearmonth)                     | optional |             |

### Response

| Name   | Type                                                  | Label    | Description |
| ------ | ----------------------------------------------------- | -------- | ----------- |
| users  | [User](#servicesuser.v1.user)                         | repeated |             |
| paging | [PagingCursorResponse](#stdutilspagingcursorresponse) |          |             |

## ExportUsersCSV

ユーザーの一覧を CSV で出力する

- **@throws** Unauthenticated 認証に失敗した場合

### Request

| Name                   | Type                            | Label    | Description |
| ---------------------- | ------------------------------- | -------- | ----------- |
| year_month             | [YearMonth](#stdutilsyearmonth) | optional |             |
| customer_number_prefix | string                          | optional |             |

### Response

| Name | Type                                            | Label | Description |
| ---- | ----------------------------------------------- | ----- | ----------- |
| csv  | [ExportCSVResponse](#stdutilsexportcsvresponse) |       |             |

## DeleteMyUser

ユーザーを削除する

- **@throws** NotFound ユーザーが見つからなかった場合
  @throws Unimplemented 無効な操作だった場合
  @throws Unauthenticated 認証に失敗した場合

### Request

| Name | Type | Label | Description |
| ---- | ---- | ----- | ----------- |

### Response

| Name | Type | Label | Description |
| ---- | ---- | ----- | ----------- |

## DeleteUserById

id でユーザーを削除する

- **@throws** NotFound ユーザーが見つからなかった場合
  @throws Unimplemented 無効な操作だった場合
  @throws Unauthenticated 認証に失敗した場合

### Request

| Name               | Type   | Label | Description                                                             |
| ------------------ | ------ | ----- | ----------------------------------------------------------------------- |
| admin_secret_token | string |       | 管理シークレットトークン。指定すべき値は AWS Secrets Manager を確認する |
| user_id            | string |       | ユーザー ID                                                             |

### Response

| Name | Type | Label | Description |
| ---- | ---- | ----- | ----------- |

## SetMyProfile

プロフィールをセットする

- **@throws** NotFound ユーザーが見つからなかった場合
  @throws Unauthenticated ログインしていないユーザーが呼び出した場合

### Request

| Name    | Type                                        | Label | Description  |
| ------- | ------------------------------------------- | ----- | ------------ |
| profile | [UserProfile](#servicesuser.v1.userprofile) |       | プロフィール |

### Response

| Name    | Type                                        | Label | Description  |
| ------- | ------------------------------------------- | ----- | ------------ |
| profile | [UserProfile](#servicesuser.v1.userprofile) |       | プロフィール |

## AgreeToService

規約に同意する

- **@throws** Unauthenticated ログインしていないユーザーが呼び出した場合

### Request

| Name    | Type   | Label | Description                  |
| ------- | ------ | ----- | ---------------------------- |
| version | string |       | 同意する利用規約のバージョン |

### Response

| Name               | Type                                                          | Label    | Description          |
| ------------------ | ------------------------------------------------------------- | -------- | -------------------- |
| service_agreements | [UserServiceAgreement](#servicesuser.v1.userserviceagreement) | repeated | サービス同意のリスト |

## CompleteTutorial

チュートリアルを完了する

- **@throws** Unauthenticated ログインしていないユーザーが呼び出した場合

### Request

| Name    | Type   | Label | Description                        |
| ------- | ------ | ----- | ---------------------------------- |
| version | string |       | 完了したチュートリアルのバージョン |

### Response

| Name                 | Type                                                              | Label    | Description                      |
| -------------------- | ----------------------------------------------------------------- | -------- | -------------------------------- |
| tutorial_completions | [UserTutorialCompletion](#servicesuser.v1.usertutorialcompletion) | repeated | チュートリアルの完了履歴のリスト |

# Messages

## services.user.v1.SignInOrUpByLineOpenIdRequest.SignUpParams

| Name                      | Type   | Label    | Description                  |
| ------------------------- | ------ | -------- | ---------------------------- |
| referrer                  | string | optional | referrerクエリの値           |
| first_access_path         | string |          | 初回アクセスパス             |
| service_agreement_version | string |          | 同意する利用規約のバージョン |

## services.user.v1.User

| Name                 | Type                                                              | Label    | Description                    |
| -------------------- | ----------------------------------------------------------------- | -------- | ------------------------------ |
| id                   | string                                                            |          | ユーザー ID                    |
| customer_number      | string                                                            |          | お客様番号                     |
| signed_up_at         | Timestamp                                                         |          | ユーザーがサインアップした日時 |
| referrer             | string                                                            | optional | リファラー                     |
| first_access_path    | string                                                            |          | 初回アクセスパス               |
| line_account         | [UserLineAccount](#servicesuser.v1.userlineaccount)               |          | LINE アカウント                |
| profile              | [UserProfile](#servicesuser.v1.userprofile)                       | optional | ユーザープロフィール           |
| service_agreements   | [UserServiceAgreement](#servicesuser.v1.userserviceagreement)     | repeated | 利用規約同意履歴のリスト       |
| tutorial_completions | [UserTutorialCompletion](#servicesuser.v1.usertutorialcompletion) | repeated | チュートリアル完了履歴のリスト |

## services.user.v1.UserLineAccount

| Name | Type   | Label | Description         |
| ---- | ------ | ----- | ------------------- |
| uid  | string |       | LINE アカウント UID |

## services.user.v1.UserProfile

| Name                          | Type                                                                                    | Label    | Description                             |
| ----------------------------- | --------------------------------------------------------------------------------------- | -------- | --------------------------------------- |
| birthday                      | [DateOnly](#stdutilsdateonly)                                                           | optional | 誕生日                                  |
| sex_code                      | int32                                                                                   | optional | 性別コード。0: その他, 1: 男性, 2: 女性 |
| prefecture_code               | int32                                                                                   | optional | 都道府県コード。                        |
| initial_questionnaire_answers | [InitialQuestionnaireAnswers](#servicesuser.v1.userprofile.initialquestionnaireanswers) | optional | 初回アクセス時のアンケート回答          |

## services.user.v1.UserProfile.InitialQuestionnaireAnswers

| Name    | Type                                          | Label    | Description |
| ------- | --------------------------------------------- | -------- | ----------- |
| answers | [Answer](#servicesuser.v1.userprofile.answer) | repeated |             |

## services.user.v1.UserServiceAgreement

| Name      | Type      | Label | Description                  |
| --------- | --------- | ----- | ---------------------------- |
| version   | string    |       | 同意した利用規約のバージョン |
| agreed_at | Timestamp |       | 同意した日時                 |

## services.user.v1.UserTutorialCompletion

| Name         | Type      | Label | Description                        |
| ------------ | --------- | ----- | ---------------------------------- |
| version      | string    |       | 同意したチュートリアルのバージョン |
| completed_at | Timestamp |       | 同意完了日時                       |

## stdutils.ExportCSVResponse

| Name     | Type                                            | Label | Description |
| -------- | ----------------------------------------------- | ----- | ----------- |
| metadata | [Metadata](#stdutilsexportcsvresponse.metadata) |       |             |
| chunk    | bytes                                           |       |             |

## stdutils.ExportCSVResponse.Metadata

| Name                  | Type  | Label | Description |
| --------------------- | ----- | ----- | ----------- |
| estimated_chunk_count | int32 |       |             |

## stdutils.DateOnly

| Name         | Type  | Label | Description |
| ------------ | ----- | ----- | ----------- |
| year         | int32 |       |             |
| month        | int32 |       |             |
| day_of_month | int32 |       |             |

## stdutils.PagingCursorRequest

| Name               | Type   | Label    | Description |
| ------------------ | ------ | -------- | ----------- |
| exclusive_start_id | string | optional |             |
| limit              | int32  |          |             |

## stdutils.PagingCursorResponse

| Name              | Type   | Label    | Description |
| ----------------- | ------ | -------- | ----------- |
| last_evaluated_id | string | optional |             |
| total_count       | int64  |          |             |

## stdutils.YearMonth

| Name  | Type  | Label | Description |
| ----- | ----- | ----- | ----------- |
| year  | int32 |       |             |
| month | int32 |       |             |

## services.user.v1.UserProfile.Answer

| Name     | Type   | Label    | Description |
| -------- | ------ | -------- | ----------- |
| question | string |          |             |
| answer   | string | repeated |             |
