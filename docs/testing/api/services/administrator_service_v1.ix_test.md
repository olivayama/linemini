# AdministratorServiceV1

## createAdministrator

- 管理者セッションなしは認証エラー（Unauthenticated）
- メールアドレスを指定すると管理者を作成して返す
- 作成時に招待メールが送信される

## sendAdministratorInvitation

- 既存管理者を指定すると招待メールが再送される

## deactivateAdministrator

- 無効化した管理者のサインインは認証エラー（Unauthenticated）

## signInAsAdministrator

- 正しいメールとパスワードでサインインすると管理者 ID とトークンを返す
- 未登録メールアドレスは認証エラー（Unauthenticated）
- パスワード不一致は認証エラー（Unauthenticated）
- パスワード未設定（招待のみ）の管理者は認証エラー（Unauthenticated）
- 無効化済み管理者は認証エラー（Unauthenticated）

## getMyAdministratorSession

- 有効なアクセストークンで自分の管理者 ID とトークンを返す
- 不正なアクセストークンは認証エラー（Unauthenticated）

## updateMyAdministratorPassword

- 現在のパスワードが正しければ新パスワードでサインインできる
- パスワード更新後は旧パスワードでのサインインが認証エラー（Unauthenticated）
- 現在のパスワード不一致は認証エラー（Unauthenticated）
- パスワード未設定（招待のみ）の管理者は認証エラー（Unauthenticated）
