# マイグレーション / DB スキーマ

`migrations/` 配下や DB スキーマを追加・編集する際の規約。

## 規範実装(暫定 / shake の mission を参照)

このレイヤーの規範実装は **entermotion-jp/shake**(GitHub MCP で参照)の mission 系スキーマ / マイグレーションとする。新規・改修時は次を読み、goose アノテーション・`CREATE TABLE` の書式・non-null DEFAULT を付けない方針・追加変更(ALTER)の作法などのパターンに倣う。

- `migrations/00001_init_schema.sql` の mission 系テーブル(`mission_group` / `mission` / `mission_reward` / `mission_participation`)
- `migrations/00004_mission_step.sql`(`mission_step` テーブルの新規作成)
- 追加変更の例: `migrations/00002_rename_mission_participation_unique_key.sql` / `migrations/00005_add_mission_step_unique_constraint.sql`

注意:

- **既存ルール優先**: 本 doc の各規約と shake 実装が食い違う場合は本 doc を優先する。shake は本 doc が触れていないパターンの実例・補完として参照する。
- **legacy は除く**: 規範としない旧スキーマ / 書式が混在し得る。パターンに倣い、これらは複製しない。
- **暫定措置**: 別リポジトリへの外部参照は本来望ましくないが、現状の事実上の規範であるため暫定として記載する。
- **参照できない場合はユーザーに確認**: アクセス権等で shake を参照できないときは、推測で進めずユーザーに確認する。

## スキーマ変更は新規ファイルで追加する

スキーマ変更は原則、既存のマイグレーションファイルを書き換えず、新しい連番ファイル(例 `00002_xxx.sql`)として追加する。goose はバージョン単位で適用管理するため、適用済みファイルへの追記は既存環境で再実行されず反映されない。特にテンプレ追従先で既にデプロイ済みのプロジェクトが壊れる。

- 例外: 追加したばかりで、まだどの環境にも適用(デプロイ)していないファイルは、同じファイルを編集してよい。

## DB `DEFAULT` を付けない(non-null DEFAULT)

値の指定し忘れを型で防ぐため、non-null な DB `DEFAULT` を付けず、アプリ層で必ず明示指定する(NOT NULL かつ DEFAULT なしなら、strict モードで INSERT 漏れがエラーになる)。ただし optional なドメインフィールドを表す nullable カラムは本ルールの対象外(MySQL は nullable カラムに必ず `DEFAULT NULL` を付与するため、`DEFAULT` 句なしの nullable カラムは作れない。`DEFAULT NULL` を明示しても省略しても等価で、禁止対象の non-null DEFAULT には当たらない)。

## `VARCHAR` は保管上限、文字列長の検証はフロント責務

`VARCHAR(n)` は保管上限であって入力検証ではない。backend(service / domain)で文字列長チェックを書かない。

- 文字列長の検証はフロント側で行い、上限は実際に必要な文字数にする(DB の保管上限に合わせる必要はない)
- 開始日時 >= 終了日時のような DB 由来でない業務不変条件は domain に残す(本ルールの対象外)

## マイグレーション追加後の再生成

`migrations/` にファイルを追加したら `make db/mig/up && make gen/db && make gen/doc/db` を実行する。
