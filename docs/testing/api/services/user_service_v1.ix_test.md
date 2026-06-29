# UserServiceV1

## signInOrUpByLineOpenId

- 不正な LINE OpenID トークンは認証エラー（Unauthenticated）
- 未登録 LINE ユーザーはサインアップして新規ユーザーを作成する
- 未登録 LINE ユーザーでサインアップ情報がないときは拒否される（FailedPrecondition）
- 登録済み LINE ユーザーはサインインして同じユーザー ID を返す

## getMyUserSession

- 有効なアクセストークンでユーザー ID とトークンを返す
- 不正なアクセストークンは認証エラー（Unauthenticated）

## getMyUser

- ユーザーセッションなしは認証エラー（Unauthenticated）
- ログイン中の自分のユーザー情報を返す
- ログイン中のユーザーが存在しないときは見つからない（NotFound）

## listUsers

- 管理者セッションなしは認証エラー（Unauthenticated）
- 全ユーザーを総件数付きで返す
- 会員番号の前方一致で絞り込んで返す
- 年月(signedUpAt)で絞り込んで返す

## exportUsersCSV

- メタデータ・ヘッダー・データの順で返す
- 年月・会員番号で絞り込んで出力する

## deleteMyUser

- 自分のアカウント削除後は自分の情報取得が見つからない（NotFound）
- 本番環境では実行不可（Unimplemented）

## deleteUserById

- 管理者による削除後はユーザー ID 取得で見つからない（NotFound）
- 本番環境では実行不可（Unimplemented）

## setMyProfile

- プロフィールを設定して返す

## agreeToService

- 利用規約への同意を記録する

## completeTutorial

- チュートリアル完了を記録する
- 同じバージョンの再登録は冪等に成功する（重複しない）
