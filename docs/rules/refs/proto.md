# proto 契約

`proto/` 配下を追加・編集する際の規約。

## 規範実装(暫定 / shake の mission を参照)

このレイヤーの規範実装は **entermotion-jp/shake**(GitHub MCP で参照)の mission proto とする。新規・改修時は次を読み、RPC 定義と `@throws` の網羅・集約 optional との 1:1・表示用 state enum・`xxx_id` 命名などのパターンに倣う。

- `proto/services/mission/v1/mission_service.proto`(RPC・`@throws`)
- `proto/services/mission/v1/mission.proto`(メッセージ・enum)

注意:

- **既存ルール優先**: 本 doc の各規約と shake 実装が食い違う場合は本 doc を優先する。shake は本 doc が触れていないパターンの実例・補完として参照する。
- **legacy は除く**: deprecated なフィールド/RPC など規範としない旧定義が混在し得る。パターンに倣い、これらは複製しない。
- **暫定措置**: 別リポジトリへの外部参照は本来望ましくないが、現状の事実上の規範であるため暫定として記載する。
- **参照できない場合はユーザーに確認**: アクセス権等で shake を参照できないときは、推測で進めずユーザーに確認する。

## `@throws` は実装の throw を網羅する

ハンドラ / domain が投げるエラーを proto の `@throws` に漏れなく記載し、実装と契約を常に一致させる。

`@throws Unauthenticated` は一律の文言にせず、ハンドラが要求する認証種別([services.md](./apps/api/services.md)「ハンドラの認証」)に合わせて区別する。

- `ensureAdminAuthenticated`(admin 限定): `管理画面にログイン中ではない場合`
- `ensureUserAuthenticated`(user 限定): `アプリにログイン中ではない場合`
- `ensureAuthenticated`(いずれか): `アプリまたは管理画面にログイン中ではない場合`

## 集約 optional ⟺ proto `optional`

集約のフィールドが optional なら proto も `optional`、必須なら proto も必須にし、optional 性を常に 1:1 で一致させる。表示制御都合でレスポンスだけ optional 化しない。

- 非 admin に出したくない値は `maskAdminValue` で隠す(optional 性は変えず、同型の sentinel か `undefined` を返す。[services.md](./apps/api/services.md) 参照)
- admin 含め誰にも返さない値は proto からフィールドごと削除する

## 表示用 state enum は全状態を列挙しサーバで確定させる

OUTPUT_ONLY の表示用ステータス enum(`XxxState` 等)は、取り得る全状態を enum 自体に持たせ、サーバ側で一度だけ確定させる。無効状態を別状態の値(例: 無効を `ENDED`)で代用する placeholder を返し、クライアント側で別フラグを優先判定して上書きする2層構造にしない。enum を表示用ステータスの完全な列挙にすることで、クライアントは `state` 単一の switch でラベル化できる。

## リクエストの対象 ID は `id` 単独でなく `xxx_id`

リクエストメッセージで対象エンティティの ID を受けるフィールドは、`id` 単独でなく対象を表す `xxx_id`(`maintenance_mode_id` / `user_id` など)にする。

## proto 変更後は再生成する

`proto/` 配下を変更したら `make gen/proto && make gen/doc/proto` を実行する。生成ドキュメントの追従漏れに注意する。
