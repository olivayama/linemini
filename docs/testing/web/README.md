# apps/web テスト項目

このディレクトリは `apps/web` 配下のテストファイル(`*.test.ts(x)` / `*.ix_test.ts(x)`)から `make gen/doc/testing/web` で自動生成される。手動編集しない。テスト方針は [testing.md](../../rules/refs/apps/web/testing.md) 参照。

## 読み方

- `#` 見出しが describe(テスト対象の単位)、`##` 以降がネストした describe、箇条書き 1 行が 1 テスト項目(`it`)に対応する
- 1 行の日本語は、その項目の再現手順と期待する結果

## ファイル一覧

- [hooks/platform/parse.test.ts](./hooks/platform/parse.test.md)
- [stdutils/array.test.ts](./stdutils/array.test.md)
- [stdutils/grapheme.test.ts](./stdutils/grapheme.test.md)
- [stdutils/query.test.ts](./stdutils/query.test.md)
- [stdutils/string.test.ts](./stdutils/string.test.md)
- [stdutils/wait-for-cookie.test.ts](./stdutils/wait-for-cookie.test.md)
