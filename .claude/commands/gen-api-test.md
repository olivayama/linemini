---
description: apps/api の connectrpc サービスに対する結合テスト (*.ix_test.ts) を規約準拠で生成する
argument-hint: <service-name または services/<file>.ts>
---

# 結合テスト生成 (apps/api)

`apps/api/services/` 配下の connectrpc サービスに対する結合テスト (`*.ix_test.ts`) を、`docs/rules/refs/apps/api/testing.md` の規約に従って生成するタスク。

## ワークフロー

```
/gen-api-test <service>
  ↓
  1. 必須参照を読む
  2. テスト項目リストをチャットだけに出力
  3. ユーザーの承認・編集を待つ ← レビューポイント
  4. 承認済み項目に沿ってコード生成
  5. make test/ix で実行確認
  6. make gen/doc/testing/api で派生 doc を再生成
  7. 結果報告
```

設計レビュー（項目リスト）と実装レビュー（コード diff）を分離するための「会話内 plan ファースト」方式。plan は永続化しない（テストコード自体を single source of truth とする方針）。

## 対象サービス

$ARGUMENTS

### 引数の解決

`$ARGUMENTS` を以下の順で評価し、**Bash `ls` で実在確認**して最初にヒットしたファイルを target とする:

1. `services/` を含むパス、または `.ts` 拡張子を持つ → そのままパスとして扱う（必要に応じて `apps/api/` プレフィックスを補う）
2. それ以外（例: `administrator`）→ 以下を順に試す:
   - `apps/api/services/<arg>_service_v1.ts`
   - `apps/api/services/<arg>_query_service.ts`
   - `apps/api/services/<arg>.ts`

どれも存在しない場合、`ls apps/api/services/*.ts | grep <arg>` で候補を提示してユーザーに選択を促す。

既に対象の `*.ix_test.ts` が存在する場合は上書きせず、ユーザーに確認する。

## 手順

### 1. 必須参照の読み込み

以下を **Read** で全て読み込む:

- `docs/rules/refs/apps/api/testing.md` — テスト方針・規約
- `apps/api/services/testing/helpers.ts` — テスト基盤（generic helper）
- `apps/api/services/testing/fixtures.ts` — aggregate 別 fixture factory + clean（既存セクションを再利用、無ければ新規セクション追加）
- `apps/api/services/testing/externals.ts` — 外部サービス helper（既存 section を再利用、追加判断は規約「testing/externals.ts」参照）
- `apps/api/services/interceptors.ts` の `domainErrorToConnectErrorCode`(および外部 API エラー → Connect Code 変換が定義されていればそれも) — DomainError / 外部 API エラー → Connect Code マッピング
- **既存テストを exemplar として読む**: 対象サービスのパターンに近い既存 `apps/api/services/*.ix_test.ts` を 1〜2 本選んで読み、idiom・構造・命名を合わせる。どのテストがどのパターンかは `docs/testing/api/` の項目 doc（`make gen/doc/testing/api` 出力）で見当を付ける（具体ファイル名はここに固定しない）

その上で対象固有のコンテキストを読む:

- 対象サービスファイル（全体）
- 対象が import している `@/domain/<entity>.ts`（不変条件・状態遷移ルールの把握）
- 対象が使う `@/repositories/<entity>/*-repository.ts` の constructor 引数（テスト側で同じ依存を組むため）

### 2. テスト項目リストの提示

**観測可能な振る舞いを固定する**ことを目的に、サービスの各 RPC メソッドについて以下の観点でテスト項目を洗い出し、**チャットだけに提示する**:

- **[正常系]** 成功パスの代表ケース
- **[エラー]** ドメイン関数で throw している `DomainError` の各 code
- **[不変条件]** 状態遷移ルール（許可される向き / 拒否される向きの双方）
- **[境界]** 時間窓・空配列・null・上限値などの境界値
- **[副作用]** 永続化状態 (DB) / 外部依存への呼び出し内容 (templateParams / token rotation 等) — メタルール「テストの目的」の観測軸

**省略 / サンプリング** の判断（規約「省略可なテストの扱い」も併せて参照）:

- **省略候補のメソッド**（pass-through 等）は理由付きで明示する（規約「例外条件」参照）
- **認証ゲートのみのテスト**はサンプリングする（規約「認証ゲートのテスト」参照）

判断に迷った点は **不確実事項** として人間レビューに投げる。

提示フォーマット例:

```markdown
## <ServiceName> テスト項目（草案）

### <RPCMethodName>

- [正常系] <項目>
- [エラー] <項目>
- [不変条件] <項目>
- [境界] <項目>
- [副作用] <項目>

### 省略候補

- <メソッド名>: <項目> — 規約「例外条件」<該当条件>のため

### 不確実事項

- <判断に迷った点>

---

承認 / 編集してください（追加・削除・書き換え可）。
```

### 3. 承認待ち

ユーザーから以下のいずれかの応答があるまで停止する:

- 承認（"OK" / "進めて" 等）
- 編集指示（"項目 X を追加" / "Y を削除" / "Z を書き換え" 等）

編集指示があれば反映してから再提示し、再度承認を待つ。**承認を経ずにコード生成へ進まない**。

### 4. コード生成

承認済みの項目リストに沿ってテストコードを生成する:

- **testing.md の規約に従う**（配置・構造・スタイル・命名・fixture 利用・assert matcher 等は testing.md を single source として参照し、ここで重複説明しない）
- 各項目を `it()` ブロック 1 件に対応付ける（タイトルは項目の文言を反映した日本語。**生成される仕様 doc（`docs/testing/api/services/`）の項目としてそのまま読める品質に保つ** — `testing.md` の `it` タイトル規約に従う）
- 既存 fixture を最優先で再利用。**対象 aggregate の fixture が無い場合は、まず `testing/fixtures.ts` に section を追加して `make<X>Fixtures` + `clean<X>` を export してから ix_test を生成する**（gen 固有のワークフロー順序）
- 外部サービス helper は `testing/externals.ts` を最優先で再利用。新規追加判断（in-file vs externals.ts）は規約「testing/externals.ts」参照
- コード生成後に `make fix` を実行して prettier / eslint 整形を確実に通す

### 5. 実行確認

```sh
make test/ix
```

を実行し、対象テストファイルの結果を grep で抽出して確認する:

```sh
make test/ix 2>&1 | grep -E "(<ServiceName>|^\s*ok|^\s*not ok|pass [0-9]|fail [0-9])"
```

失敗があれば原因を特定して修正。テストが通るまでループする。

### 6. 派生 doc の再生成

テスト追加・変更を `docs/testing/api/services/<service>.md` に反映する:

```sh
make gen/doc/testing/api
```

これで `it()` タイトルが派生 doc に同期される。コミットには再生成された `.md` も含める。

### 7. 報告

完了時に以下を報告:

- パス/失敗の件数
- カバーした RPC メソッド一覧と各 `it()` タイトル
- **規約に追記すべき発見**（canonical / 規約に無いパターンに遭遇した場合 → `docs/rules/refs/apps/api/testing.md` への追記候補として提示）
- **production refactor が必要な分岐の発見**（test fake / override が組めない分岐に遭遇した場合 → 規約「テスト不能な分岐の扱い」に沿って refactor 内容 + issue 起票候補として提示）
