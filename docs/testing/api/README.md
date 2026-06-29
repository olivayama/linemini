# apps/api テスト項目

このディレクトリは `apps/api` 配下のテストファイル(`*.test.ts(x)` / `*.ix_test.ts(x)`)から `make gen/doc/testing/api` で自動生成される。手動編集しない。テスト方針は [testing.md](../../rules/refs/apps/api/testing.md) 参照。

## 読み方

- `#` 見出しが describe(テスト対象の単位)、`##` 以降がネストした describe、箇条書き 1 行が 1 テスト項目(`it`)に対応する
- 1 行の日本語は、その項目の再現手順と期待する結果
- 末尾に `(Unauthenticated)` など括弧付き英字がある項目は、**そのエラーを返すこと**を期待している。括弧内の対応は [testing.md](../../rules/refs/apps/api/testing.md#it-タイトルでのエラー表記) を参照

## ファイル一覧

- [services/administrator_service_v1.ix_test.ts](./services/administrator_service_v1.ix_test.md)
- [services/image_service_v1.ix_test.ts](./services/image_service_v1.ix_test.md)
- [services/user_service_v1.ix_test.ts](./services/user_service_v1.ix_test.md)
