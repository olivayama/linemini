# テスト方針・規約（apps/api）

## tl;dr

- テストは **実装** ではなく、**観測可能な振る舞い（仕様・不変条件・状態遷移）** を固定するために書く（詳細: 「テストの目的」）
- **結合テスト** (`*.ix_test.ts`): `services/` 配下のサービス。リポジトリやドメイン関数の挙動はここで end-to-end に検証する
- **単体テスト** (`*.test.ts`): `stdutils/` の pure 関数

迷ったら「`stdutils/` の pure utility だけ単体、それ以外は結合（または書かない）」で判断する。

## 自動追加・更新の判断フロー（コード追加・修正時に毎回実施）

エンジニアの明示指示が無くても、以下のフローでテスト追加・更新を判断する。

> NOTE: 本フローは新規・既存とも対象とし、Claude が自発的にテスト追加・更新を判断する。
> 一方、slash command `/gen-api-test <service>` を明示的に叩くと、テスト項目リスト承認 → 一括コード生成 + `make test/ix` + 派生 doc 再生成までをワンストップで実行できる（`.claude/commands/gen-api-test.md`）。
> **設計レビュー段階を分離したい新規サービスや、QC 連携で項目リストを共有したい場合は `/gen-api-test` を推奨**（本フローの上位互換）。使わない場合は本フローで自動追加され、doc 生成は別途 `make gen/doc/testing/api` を実行する。

1. 変更対象が後述のレイヤー表でどこに属するか確認する
2. 「書く」レイヤー（pure utility / クエリサービス / RPC サービス）なら、**同一 PR でテスト追加または既存テスト更新**まで行う
3. 「書かない」レイヤー（ドメイン関数 / リポジトリ）なら、明示理由なくスキップしてよい
4. 判断に迷う場合は「書かない」を選び、PR コメント等で人間に確認を仰ぐ
5. 既存テストを更新するときは「テストを実装に合わせて辻褄を合わせる」のではなく、「仕様が変わったか」を考えて diff を作る。
   仕様が変わっていないのに既存テストが落ちた場合は、コード側のバグを疑う

## 方針

### テストの目的

テストは **実装** ではなく、**観測可能な振る舞い（仕様・不変条件・状態遷移）** を固定するために書く。

- 観測可能 = RPC のレスポンス / 副作用としての永続化状態 / Connect Code / 外部依存への呼び出し
- 内部実装の中間変数・private メソッド呼び出し順・SQL の文面 等は固定しない
- 永続化は repository 経由の結果として観測する（SQL を実 DB で実行することと、SQL の文面を assert することは別）
- この目的に貢献しない網羅は省略可（後述の「例外条件」はこの帰結）

### レイヤー別の戦略

| レイヤー                        | 例                                                           | テスト戦略                                                     |
| ------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------- |
| pure utility (`stdutils/` 配下) | `stdutils/url.ts` の `isHttpUrl`                             | 単体テスト (`*.test.ts`) で分岐網羅                            |
| ドメイン関数 (`domain/` 配下)   | `domain/xxx.ts` の `validateXxx` / `createXxx` / `updateXxx` | 原則テストを書かない。サービス結合テストで挙動を検証           |
| リポジトリ                      | `repositories/xxx/*`                                         | テストを書かない。サービス結合テストで間接カバー               |
| クエリサービス                  | `services/xxx_query_service.ts`                              | 結合テスト (`*.ix_test.ts`)。サービスを直接 new して検証       |
| RPC サービス                    | `services/xxx_service_v1.ts`                                 | 結合テスト (`*.ix_test.ts`)。connectrpc クライアント経由で検証 |

### Why（リポジトリ・ドメイン関数の単体テストを書かない理由）

Vladimir Khorikov『単体テストの考え方/使い方』に準拠した方針。

- リポジトリ単体テストは DB 込みで重い割に検出力が低く、サービス結合テストが実物の repo / DB を通るため冗長になる（永続化漏れも結合の方が捕まる）
- ドメイン関数の不変条件・合成挙動はサービス結合テストでカバーされる。内部の pure utility は `stdutils/` 側で単体化済みなので、ドメイン側に重ねても冗長
- DB は「管理下の依存」なのでモックせず、実 DB 経由で永続化経路を通す
- フィールド追加など実装変更時、domain / repository / それぞれのテストが連鎖修正になるコスト負担を避ける

### 認証ゲートのテスト

認証ゲートの動作は RPC ごとの差異ではなく共有 interceptor / DomainContext の責務である。そのため、同一 auth policy の重複検証は避け、policy ごとにサンプリングする:

- 認証ゲート (`ctx.ensureAdminAuthenticated()` / `ctx.requireUserId()` 等) のみを検証するテストは、同一 auth policy を共有する RPC 群についてサービス当たり 1 件のサンプリングで足りる
- 追加の認可条件・状態条件・業務ルールを持つ RPC は別途その振る舞いを検証する
- 異なる auth 種別 (admin / user / 外部連携 auth 等) が混在するサービスは種別ごとに 1 件ずつ検証する

### 例外条件

- サービス: 全メソッド・全分岐を網羅する必要はない。固定する価値のある観測可能な振る舞い（非自明な分岐・境界値・複合処理・状態遷移・副作用）を優先する。**サービス層独自の振る舞いがない、または他で固定されている** もの（pass-through list / 完全一致 lookup・generic な NotFound 分岐 等）は省略可
  - **pass-through list / 完全一致 lookup**: フィルタ・並び・状態遷移などの非自明分岐が無い list、admin 認証 + `repository.get` + NotFound だけの完全一致 lookup は省略可。
    例: `listImages` はタグ ID フィルタという非自明分岐があるため残す。`listImageTags` は現在フィルタが無いため省略可（後から検索条件・並び・状態フィルタ等が増えたら残す対象に切り替え）。`getImageTagByAdminName` 等の admin 認証 + 完全一致 lookup も同様に省略可
  - **generic NotFound**: `repository.get` が null → `EntityNotFound` を throw するだけの「存在しない ID → NotFound」は省略可（RPC ごとに重複させない）
  - **残す NotFound**: entity の有無ではなく、業務状態や caller identity に紐づく分岐。
    例: 業務状態に紐づく分岐（未設定の対象を解除しようとした 等）、
    `getMyUser` の caller user 不在
- ドメイン関数（原則は結合テストで検証）
  - **例外として**、次の条件を満たすときに限りドメイン層の単体テストを追加してよい
    - 分岐・状態遷移が多く、結合テストだけではケース網羅のコストが高い
    - 複雑な計算ロジックで、結合テスト経由だと検証ケースが冗長になる
  - まずはドメイン非依存ロジックの `stdutils/` への切り出しを検討する
  - ドメイン固有ロジックを単体テストのためだけに `stdutils/` へ押し出さない

### 省略可なテストの扱い

「例外条件」の省略可を、網羅不足・非対称を理由に差し戻さない。

- **対称性・網羅性を根拠に追加要求しない**: 「他 RPC は網羅されているから」「仕様 doc 見出しで対称にしたいから」は追加根拠にならない
- **参考実装を「全 RPC で揃えるテンプレ」として読まない**: 参考にするパターン実装は「そのパターンが必要なケースでの参考」。それが固定している観測対象（streaming chunk 構造・S3 副作用 等）を、他サービスでも同レベルで揃える要求はしない
- **chain で観測できる効果に repository 観測を重ねない**: 後続 RPC（`signIn` / `getXById` 等）で end-to-end の挙動として効果が観測できているなら、`repository.get` で実装中間状態（`deactivatedAt` 等のタイムスタンプ・内部フラグ）まで直接観測する it を追加しない。
  例: `deactivateAdministrator` → `signInAsAdministrator` 失敗で振る舞いは固定済み。`deactivatedAt === ctx.now` を repo 観測する it は追加不要

### テスト不能な分岐の扱い

「テストの目的」に照らして固定する価値があるが、現在のプロダクトコード構造で test fake / override が組めない分岐は、次の順で対処する:

1. **プロダクトコード変更なしで HTTP layer を intercept できる** → MSW で対応する。
   - 鍵生成・JWKS handler・署名 helper 等の intercept 用 utility は `testing/externals.ts` に外部サービス別 section で置く
2. **それ以外** → プロダクトコード設計の refactor で解決する（テスト規約整備とは **別 PR**）。
   - 例: `services/externals.ts` の interface 抽出 + ix_test 側での fake 注入
   - 「テストのための refactor」ではなくプロダクトコード設計の改善として扱う
   - 優先度が低い場合は issue に記録し、当面は未テストとしてよい

## 規約

### ファイル配置・命名

- テストファイルは対象 source の隣に置く
  - 結合テスト（DB に触る）: `*.ix_test.ts`
    例: `services/xxx_service_v1.ts` → `services/xxx_service_v1.ix_test.ts`
  - 純粋ロジックの単体テスト: `*.test.ts`
    例: `stdutils/url.ts` → `stdutils/url.test.ts`

### テストの構成（AAA）

- テスト本体は Arrange → Act → Assert の順に構成し、1テスト1ビジネスゴールに保つ
- 3セクションは**空行で区切る**。`// Arrange` 等のコメントは付けない（セクションが大きく、それ以上短くできない場合のみ可）
- Arrange の初期化は helper に抽出する（例: `makeTestDomainContext` / `makeTestServiceClient` / `userFixtures.createPersisted` 等、テスト固有のリクエスト入力ビルダーも含む）。生のセットアップを書かず、無関係なフィールドを隠して意味のある入力だけを露出することで、検証対象が一目で分かる
- 複雑なセットアップやパフォーマンス上の理由がある場合はこの限りではない。原則の詳細は参考文献を参照

### Domain Context のセットアップ

- module-scope（`describe` の外）に置く。`now` を一度だけ確定させ全テストで同一の基準時刻を共有でき、時間境界テストが安定する

```ts
const now = new Date();
const ctx = makeTestDomainContext({ now });
```

- `makeTestDomainContext` は `services/testing/helpers.ts` 提供。`now` のみ必須、`userId?` / `adminId?` はデフォルトあり（override したい場合のみ渡す）
- この非対称は意図的。`now` は時間依存挙動の入力なので毎回明示させる（暗黙の非決定時刻で事故るのを防ぐ）。identity は付随的なのでデフォルトでよい
- `TEST_USER_ID` / `TEST_ADMIN_ID` は module-private（非 export）。テストから直接参照しない。identity は `ctx` 経由で取得する

### サービス結合テストの構造（describe / it）

- テスト構造は **外側 `describe`=サービス名 / 内側 `describe`=RPC メソッド名 / `it`=テスト項目** の 2 階層 describe に揃える。派生 doc 生成（`make gen/doc/testing/api`）はネスト階層に依存しないが、生成される仕様 doc の見出し構造を一定に保つための規約
- 内側 `describe` 名は原則 RPC メソッド名そのもの。例外として、同一サービスに unary RPC と server-streaming RPC が混在する場合に限り `xxx (streaming)` のような最小注釈を後置してよい（仕様 doc 上で見出しが区別できるようにするため）
- **`it` タイトルは、生成される仕様 doc（`docs/testing/api/services/`）の項目としてそのまま読める品質に保つ**（`make gen/doc/testing/api` が転記し、仕様として読まれる）。次を守る:
  - **形式**: 「[前提・操作] → [期待結果]」または「[前提] のとき [期待結果]」。例外系の括弧内表記は下記「it タイトルでのエラー表記」を参照（`docs/testing/api/` の README も同節へリンクする）
  - **describe が RPC 名**なので `it` に RPC 名は繰り返さない（統合シナリオで検証手段として別 RPC に触れる場合は「〜のあと〜できる」等で明示してよい）
  - **主語・対象を省略しない**（× `存在する id を返す` → ○ `存在するユーザー ID のユーザーを返す`）
  - **実装詳細を避ける**（`ctx.now` / DB カラム名 / `replaceImage=true` 等）。仕様・UI に近い語彙を使う（○ `画像差し替えあり` / `有効状態で作成`）
  - **1 `it` = 1 検証ゴール**。複数ケースを `/` ・ `、` ・ `・` で 1 行にまとめない（同種 setup を `・` で列挙して 1 アクション・1 assert にまとめる書き方も同様。落ちたケースを切り分けられるよう case ごとに `it` を分ける）。なお複合語の `・`（`メタデータ・ヘッダー・データ` 等、単一ケースを記述するための連結語）は対象外
  - **英語識別子は必要最小限**（Connect Code・外部連携の固定値 `cooked` ・フォーマット名 `PNG` / `JSON` / `CSV` 等）。ドメインフィールド・状態は **管理画面・`apps/web/enum.ts` の表示ラベル** に揃える（○ `優先度` / `表示中`、× `priority` / `ACTIVE`）。Webhook・LINE など連携名はそのまま可

### サービス結合テストのクライアント構築・認証分岐

- `makeTestServiceClient(service, impl, ctx)` を使う。`createPromiseClient` / `createRouterTransport` を手で書かない
- サービス実装は `let serviceImpl` で `describe` スコープに保持し、`before` で 1 度だけ構築する。認証分岐テスト等で派生 ctx 用に同じ `serviceImpl` を使い回し、別 client を組む形が canonical（inline `new ServiceV1(...)` を `makeTestServiceClient` 引数に直接渡すと使い回せない）

```ts
serviceImpl = new XxxServiceV1(...deps);
client = makeTestServiceClient(XxxServiceV1Gen, serviceImpl, ctx);
```

- 外部依存のある RPC で派生 client を複数組む場合は、`const makeClient = (clientCtx: DomainContext, options?) => makeTestServiceClient(Gen, serviceImpl, clientCtx, options)` の closure を `describe` 直下に置くと call site が簡潔になる
- interceptor は helper 内で `ctx.now` / `ctx.userSession` / `ctx.adminSession` から自動配線される
- 認証分岐（user セッションなし / admin セッションなしの Unauthenticated 等）をテストする際は、`testing/helpers` の `withoutUserSession(ctx)` / `withoutAdminSession(ctx)` で派生 ctx を作り、別 client に渡す。例: `makeTestServiceClient(..., withoutUserSession(ctx), options)`
- server-streaming RPC は `PromiseClient` のメソッドが直接 `AsyncIterable<Response>` を返す。`for await (const chunk of client.exportXxx({})) { chunks.push(chunk) }` で全チャンクを集めてから、chunks 数・`payload.case`（oneof の判別）・payload のバイト列内容を assert する

### フィクスチャヘルパー

fixture は **`services/testing/fixtures.ts` の単一ファイルに集約**して factory パターンで切り出す。集約 (aggregate) ごとにセクションコメントで区切り、`make<X>Fixtures` / `clean<X>` のペアを並べる。テスト本体は describe スコープで 1 度だけ bind して使い、closure 経由でクリーンな call site を保つ。

```ts
// services/testing/fixtures.ts
// ───────── user ─────────
export const makeUserFixtures = (ctx: DomainContext, userRepository: UserRepository) => ({
  createPersisted: async (input?: { id?: UserId; lineUid?: string; ... }) => { ... },
})
export const cleanUser = async (db: Kysely<DB>) => { ... }

// ───────── order ─────────
export const makeOrderFixtures = (...) => ({ ... })
export const cleanOrder = async (db: Kysely<DB>) => { ... }
```

```ts
// <service>_v1.ix_test.ts の before スコープ
userFixtures = makeUserFixtures(ctx, userRepository);
// テスト内
await userFixtures.createPersisted({ lineUid: "x" });
```

- **`make<X>Fixtures(ctx, repository)`** が factory、戻り値オブジェクトに `createPersisted` 等の persist 系メソッドを持つ（例: `makeUserFixtures` / `makeOrderFixtures`）
- **`clean<X>(db)`** を同居エクスポート（例: `cleanUser` / `cleanXxx`）。複数テーブル集約の場合は FK 順で削除する
- **`testing/fixtures.ts` は aggregate fixture 専用**。外部サービス連携の helper（webhook body 生成・署名・API response shape builder 等）は **混ぜない**。違和感の原因になるため別ファイルに切り出す（→ 下の「外部サービス helper のファイル分離」）
- 「複数集約をまとめて persist する」shortcut が複数テストで必要なら、aggregate fixture 内に composite メソッドとして同居させる
- session 経由で「自分自身」を引く RPC（`getMyX` / `updateMyX` 等）のテストでは、persist する entity の id を `ctx.requireAdministratorId()` / `ctx.requireUserId()` に揃える必要がある。fixture の `createPersisted` に `id?: <EntityId>` の override を持たせるのが定石
- accessToken を引数で受ける RPC（`getMy*Session` 等）のテストには 2 流儀がある:
  - **① 別 RPC でチェーン取得**: 先に `signInAs*` 等のログイン RPC を呼んで accessToken を得て、そのまま検証側に渡す
  - **② JWT を inline 生成**: `jwt.sign({ iss, sub: id, aud, exp }, appConfig.session.jwtSecret)` で test 内 helper を作って直接署名する
  - **使い分け**: 同サービス内にログイン RPC があれば ①（チェーンする方が end-to-end カバレッジが厚い）、無ければ ②

### 外部依存の fake

DB 以外の外部依存（メール送信・LINE API・外部 API・S3 等）はサービスごとの interface (`services/externals.ts`) を実装した **inline fake** を test file 内で組み立てて差し込む。実物には繋がない。

- 副作用を確認したいなら captured な配列（`sentMails: SentMail[]` 等）を `describe` スコープで持ち、`beforeEach` で空にする
- fake の観測は **外部から見える契約**（送信したか・送信内容 等）に限る。呼び出し回数・順序・引数は、仕様として意味がある場合のみ検証する（over-specification は偽陽性源）
- テストごとに fake の返却データを差し替えたい場合は `let` 変数（`let fakeRecords: SomeRecord[] = []` 等）を `describe` スコープで持ち、`beforeEach` で空にして各 `it` 内で代入する。fake の `fetch` 実装はクロージャ越しにこの変数を参照する
- 戻り値は呼び出し元が使う最小限を返せばよい（`as unknown as ResponseType` 等で型を満たす）
- 命名: 外部依存 fake は `fake<InterfaceName>` プレフィックスを付けて test 用意図を明示する（例: `fakeMailer` / `fakeLineApiClient` / `fakeObjectStorage`）

### `testing/externals.ts` — 外部サービス helper の置き場

外部サービス API 由来の **純粋な builder / signing utility / 定数** は `testing/externals.ts` に集約する。`testing/fixtures.ts`（aggregate fixture 専用）にも、各 ix_test ファイル本体にも混ぜない。

- ファイル: `testing/externals.ts` 1 本に集約。production `externals.ts`（`Mailer` / `LineApiClient` / `ObjectStorage` 等を 1 ファイルに並べる）と同じく、外部サービスごとの section に並べる構造とする（必要になった section だけ追加する）
- 構造: 外部サービスごとに `// ───────── <service> ─────────` のような section コメントで区切る（`testing/fixtures.ts` の aggregate section と同じスタイル）
- 配置するもの: webhook body 生成・署名 / signature 解決・API response shape builder・テスト用認証定数 等
- 配置しないもの: fake 本体（`fakeXxxApiClient` 等）→ クロージャで capture array を参照するため in-file
- 集約する閾値: 同一 service の helper が複数 ix_test ファイルから使われ始めたとき。**単一 ix_test 内 single-use のうちは in-file** で良い（過剰装飾を避ける）

### DB クリーンアップ

- テスト間の独立性のため、`beforeEach` で事前にデータをクリーンする
- 触る集約ごとに `testing/fixtures.ts` で export されている `clean<X>(dbPool.writer)` を呼ぶ。例: `await cleanUser(dbPool.writer)` / `await cleanOrder(dbPool.writer)`
- `connectIxTestDbPool()` / `disconnectIxTestDbPool(dbPool)` は `testing/helpers` の薄いラッパー。before / after で使う

### 時間・期間境界のテスト

- 時間窓ロジック（例: バナーの `displayableAfter` / `displayableBefore`）では「ちょうど現在時刻」「直前」「直後」の境界を必ずカバー
- 基準時刻は module-scope の `now`、相対オフセット（`new Date(now.getTime() ± X)`）で構築

### it タイトルでのエラー表記

`make gen/doc/testing/api` が転記する `it` タイトルの例外系は、次の **日本語 + 括弧内 Connect Code** に統一する。DomainError 名（`EntityNotFound` 等）や外部 API エラー名もタイトルに書かない（assert する Connect Code に揃える）。

| 括弧内のコード       | 項目名での言い方  | 意味                                                                 |
| -------------------- | ----------------- | -------------------------------------------------------------------- |
| `Unauthenticated`    | …は認証エラー     | 認証・署名・セッションが不正                                         |
| `NotFound`           | …は見つからない   | 指定 ID の対象が存在しない                                           |
| `InvalidArgument`    | …は入力不正       | リクエストの形式・値が不正                                           |
| `FailedPrecondition` | …は拒否される     | 状態・業務ルール違反（二重有効化、確定済みリソースの再確定不可など） |
| `Unimplemented`      | …は実行不可       | 環境・運用制限により API として無効化されている（例: 本番ブロック） |
| `AlreadyExists`      | …は重複エラー     | 既に存在するため作成・付与できない                                   |
| `Internal`           | …はサーバーエラー | 外部 API・内部処理の予期しない失敗（外部 API 5xx 等）                |

新しい例外系を `it` に足すときは、上表に行を追加してからタイトル命名に使う。

### エラーケースの検証

`DomainError` は interceptor で Connect Code に変換される。テストでは Connect Code 側を assert する。

assert matcher は **`testing/helpers` の `expectConnectError(Code.Xxx)` を使う**。`(err) => err instanceof ConnectError && err.code === Code.Xxx` を直書きしない。

```ts
await assert.rejects(() => client.xxx({...}), expectConnectError(Code.NotFound))
```

代表例:

- `EntityNotFound` → `Code.NotFound`
- `FailedPrecondition` → `Code.FailedPrecondition`
- 外部 API エラー（5xx） → `Code.Internal`

完全な対応は `interceptors.ts` の `domainErrorToConnectErrorCode` を参照（外部 API fake が status 付きエラー（`throw new XxxApiError(status, message)` 等）を返した場合の HTTP status → Connect Code 変換もここに集約）。

サービス・ドメイン関数で throw している `DomainError` の **各 code** をカバーする。特定の引数や状態のみで発火する分岐は、それを誘発するセットアップごとテストを足す。

### 不変条件・状態遷移のテスト

ドメイン側で「特定方向の遷移だけ禁止する」型の不変条件（例: `isActive: false → true` は禁止）がある場合、**許可される向きと拒否される向きの両方**をテストする。

### Assert の経路（fixture / RPC chain / repository）

被依存 RPC の挙動変更で無関係なテストが落ちる結合を避けるため、**Arrange / Assert で別 RPC を「便利な setup / verify」として使い回さない**。

観測方法は一般に 出力（RPC レスポンス）→ 状態（repository）→ 相互作用（fake への呼び出し） の順で実装への結合が強くなり、後者ほど変更の影響を受けやすい。ただしこれは絶対的な優先順位ではなく、まず仕様を十分に検証できる観測経路を選び、その中で最も結合度の低いものを使う。例えば、削除の成否は状態で、外部通知の送信有無は相互作用で観測するのが仕様に近い。

- **Arrange**: `make<X>Fixtures().createPersisted` 等の fixture 経由で組む。`client.createX` で setup しない
- **Assert**: レスポンスで仕様を検証できるならレスポンスで観測し、それでは担保できない場合に repository / fake を使う
- **別 RPC での観測は、その RPC の振る舞い自体がテストの主題である場合のみ許可**
  - delete 系 chain: 削除後に lookup RPC で `NotFound` を assert する
  - 状態遷移 chain: deactivate 後の signIn が認証エラー 等
- **repository を選ぶ典型**:
  - lookup RPC が対象状態を返せない（フィルタ除外・副作用と観測が同一 RPC・単体 fetch RPC 不在）
  - 観測したい状態が RPC レスポンスより狭い（部分フィールドの更新・解除 — entity は残り単一フィールドだけ変化）
  - proto に出ない domain 状態

## テスト基盤ファイルの構成

ix_test を支えるファイルの置き場（各内容の詳細は上の該当規約を参照）:

- 結合テスト本体: `services/<service>.ix_test.ts`（対象 source の隣）
- 汎用 helper: `services/testing/helpers.ts`（aggregate / domain 非依存の generic helper のみ）
- fixture: `services/testing/fixtures.ts`（aggregate 別の factory + clean を section ごとに並べる単一ファイル）
- 外部サービス helper: `services/testing/externals.ts`（webhook body / 署名 / API shape builder を service ごとに section コメント区切り）

> 上記パターンの具体的な参考実装は、リポジトリ内の既存 `*.ix_test.ts` を `make gen/doc/testing/api` の出力（`docs/testing/api/`）で見当を付けて参照する。

## AI 生成パイプライン

`*.ix_test.ts` を AI に生成させる際は slash command `/gen-api-test <service>` を使う。プロンプトテンプレは `.claude/commands/gen-api-test.md` にある。

### ワークフロー

```
/gen-api-test <service>
  → AI が必須参照（規約 + canonical + 対象サービスと関連 domain/repository）を読む
  → AI が「テスト項目リスト」をチャットだけに出力
  → 人間が承認・編集 ← レビューポイント
  → 承認された項目に従ってコード生成 + make test/ix
  → make gen/doc/testing/api で派生 doc を再生成
```

### Why 「会話内 plan ファースト」

- **設計レビューと実装レビューの分離**: コードを書く前に「何をテストすべきか」を10〜20項目のリスト形式で議論する。テストコード200行を読んでから観点ズレに気づくよりレビュー負荷が小さい
- **規約への feedback ループ**: 項目リスト出力時の「不確実事項」セクションで AI が判断に迷った点が顕在化し、規約に追加すべきパターンが見つかる
- **項目リストはファイル化しない**: 設計レビューは会話内で完結。永続化すると plan ⇄ テストコードの drift メンテが必要になるため、テストコード自体を single source of truth とする

### テスト項目ドキュメントの自動生成

QCチーム連携・仕様トレーサビリティ用に「テスト項目リスト」を成果物として欲しい場合は、テストコードから派生 doc を自動生成する。テストコードを SoT として保ち、plan は再生成可能な派生物として扱うことで drift を構造的に防ぐ。

- **コマンド**: `make gen/doc/testing/api`
- **入力**: `apps/api/services/*.ix_test.ts`（**サービス結合テストのみ**。`stdutils/` の pure unit は含めない）
- **出力**: `docs/testing/api/<対象パス>.md`（source 構造を mirror。`describe` を見出し、`it` を箇条書きにした markdown）と一覧 `docs/testing/api/README.md`
- **実装**: `devtools/build-test-doc.mjs`（apps/web と共通の汎用ツール。インデント幅で `describe` 階層を判定。prettier 整形を前提）。`describe`/`it`/`test` を認識する（`.skip` で無効化したテストや `it.each` 等のパラメタライズドは doc 化されない。項目化したいものは個別 `it` で書く）
- **親 target**: `make gen/doc` 全体に含まれる（proto / db / web と並列）
- **drift 防止**: 将来 CI で `make gen/doc/testing/api && git diff --exit-code docs/testing/api/` を回すことで「テストコードを変更したのに doc を再生成し忘れた」を検出可能

> **なぜサービス結合テストのみを doc 化するか**: 派生 doc は QC 連携・仕様トレーサビリティが目的なので、「仕様として意味のある層」だけを収録する。API ではそれがサービス結合テストで、`stdutils/` の pure unit は低レベルで QC の主対象でないため除外する。
> 一方 FE は `utils/` の業務ロジック単体も収録する（FE では業務ロジック単体が検証の中心のため）。**収録する層は app ごとに異なってよい** — [refs/apps/web/testing.md](../web/testing.md) 参照。

## 参考文献

- Vladimir Khorikov『単体テストの考え方/使い方』（マイナビ出版、須田智之 訳）
