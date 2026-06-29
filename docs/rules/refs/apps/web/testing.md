# テスト方針・規約（apps/web）

## tl;dr

- **単体テスト** (`*.test.ts(x)`): behavior contract を持つ pure 関数 / 業務ロジック（場所は `stdutils/` / `utils/` / `app/` コロケを問わない）
- **結合テスト** (`*.ix_test.ts(x)`): state/effect を持つカスタムフック（`renderHook` + MSW）
- **コンポーネント** は原則テストを書かない。**テストしたい**ロジックは別ファイルに切り出して（単一画面ならコロケ可）単体で検証する
- **E2E** は QC 側の責務。エンジニア側では書かない

迷ったら「**behavior contract を持つ pure 関数 / 業務ロジックだけ単体（置き場は問わない）**、それ以外は書かない（または結合・E2E に逃がす）」で判断する。

## 自動追加・更新の判断フロー（コード追加・修正時に毎回実施）

エンジニアの明示指示が無くても、以下のフローでテスト追加・更新を判断する。

> NOTE: 本フローは新規・既存とも対象とし、Claude が自発的にテスト追加・更新を判断する。
> API 側にある `/gen-api-test`（[refs/apps/api/testing.md](../api/testing.md) 参照）に相当する FE 用 slash command は未整備。設計レビュー段階の分離や QC 連携での項目リスト共有が必要になったら、API 側をモデルに FE 版を別途検討する。

1. 変更対象が後述のレイヤー表でどこに属するか確認する
2. 「書く」レイヤー（pure utility / 業務ロジック / state 持ちフック）なら、**同一 PR でテスト追加または既存テスト更新**まで行う
3. 「書かない」レイヤー（薄い wrapper フック / UI primitive / 機能コンポーネント / 生成物・ページ）なら、明示理由なくスキップしてよい
4. 判断に迷う場合は「書かない」を選び、PR コメント等で人間に確認を仰ぐ
5. 既存テストを更新するときは「テストを実装に合わせて辻褄を合わせる」のではなく、「仕様が変わったか」を考えて diff を作る。
   仕様が変わっていないのに既存テストが落ちた場合は、コード側のバグを疑う

## 方針

### レイヤー別の戦略

| レイヤー                                    | 例                                                | テスト戦略                                                                   |
| ------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| pure utility (`stdutils/`)                  | `stdutils/date.ts` の `parseJstDateTimeStringYmd` | 単体 (`*.test.ts`) で分岐網羅                                                |
| 業務ロジック (`utils/`・画面コロケ)         | `validateXxx`（`utils/` or `app/.../`）           | 単体 (`*.test.ts`) で分岐網羅。**FE 検証の中心**                             |
| カスタムフック (薄い wrapper)               | `hooks/xxx/use-xxx.ts` 等の connectquery 薄ラップ | 書かない                                                                     |
| カスタムフック (state/effect 持ち)          | 自前 state 遷移・タイマー等                       | 結合 (`*.ix_test.tsx`)。`renderHook` + MSW でサーバ応答スタブ                |
| UI primitive (`components/ui/`)             | shadcn 系                                         | 書かない（外部由来）                                                         |
| 機能コンポーネント (`components/`)          | `xxx-selector.tsx`                                | 原則書かない。表示分岐ロジックは別ファイルに切り出して（コロケ可）単体で検証 |
| サービス (`services/`) / `gen/`             | connectquery re-export, 生成物                    | 書かない                                                                     |
| ページ / レイアウト / 動線そのもの (`app/`) | 主要動線（通し）                                  | エンジニア側では書かない（E2E は QC 側、後述）                               |

### Why

API 側と同じく Vladimir Khorikov 準拠の方針。FE 固有の補足:

- コンポーネント単体テストは DOM 構造や Radix 等の挙動に依存し、リファクタで壊れやすい割に検出力が低い
- 業務ロジックを別ファイルに切り出せば（コロケでも `utils/` でも）pure な単体テストで分岐網羅でき、検出力 / 安定性 / コスパが揃う。「テストを書きたい」という動機がロジック切り出しのリファクタを促す副作用も狙う
- **唯一の禁則はインライン放置**。behavior contract を持つ業務ロジックは画面コンポーネントに直書きせず**別ファイルに切り出す**（単一画面ならコロケ `app/.../xxx.ts` + `.test.ts`、複数画面共有・全体インフラなら `utils/`）。切り出してあれば置き場は問わず**一級のテスト対象**——テスト機構（doc-gen / トリガー）が「ディレクトリ」ではなく「ファイル / 内容」で拾うため。これで roco 期の「画面に埋めて未テスト化」への逆戻りを防ぐ。**切り出してもテストは任意**（behavior contract が薄ければ不要＝[code-placement.md](./code-placement.md) ルール4）。効くのは重い FE 業務ロジックがある案件で、軽い trivial な画面ロジックはインラインでよい（配置は [code-placement.md](./code-placement.md)）
- 生成物（`gen/`）と connectquery re-export（`services/`）は外部仕様の単純な再公開なのでテスト不要
- AI 静的読解は pure logic には強いが、ブラウザの非同期タイミング・connectquery キャッシュ整合・DOM 副作用は弱い。結合 / E2E はこの「読みが届かない範囲」の保険として最小限残す
- テストコード自体が「AI 判断とは独立した、リポジトリに残る仕様の固定」として価値を持つ

### 例外条件

- コンポーネント: 表示分岐が多段（状態 × ロール × フラグ）で結合 / E2E では網羅コストが高すぎる場合のみ、Testing Library + render で観点を絞って書く
- フック (薄い wrapper): 独自のエラーハンドリングや retry を含む場合は結合で検証
- snapshot テストは原則禁止。差分判定が雑になり、AI が「合わせて直す」運用と最も相性が悪い

## 規約

### ファイル配置・命名

- テストファイルは対象 source の隣に置く
  - 純粋ロジックの単体テスト: `*.test.ts(x)`
    例: `utils/xxx.ts` → `utils/xxx.test.ts`（単一画面コロケなら `app/.../xxx.ts` → `app/.../xxx.test.ts`）
  - 結合テスト（`renderHook` + MSW など）: `*.ix_test.ts(x)`
    例: `hooks/xxx/use-something.ts` → `hooks/xxx/use-something.ix_test.tsx`

### テスト環境

- デフォルトは Node 環境（vitest デフォルト）。DOM に触れる場合のみファイル先頭で `@vitest-environment jsdom` を指定する
- 時刻に依存するロジックは module-scope で `now` を確定し、`vi.useFakeTimers()` + `vi.setSystemTime(now)` で固定する。全テストで同じ基準時刻を共有することで時間境界テストが安定する

### テストの構成（AAA）

- テスト本体は Arrange → Act → Assert の順に構成し、1テスト1ビジネスゴールに保つ
- 3セクションは**空行で区切る**。`// Arrange` 等のコメントは付けない
- Arrange の初期化は helper に抽出する（`makeTest<Entity>` 命名）。生のセットアップを書かず、無関係なフィールドを隠して意味のある入力だけを露出することで、検証対象が一目で分かる

### フィクスチャヘルパー

- 必須フィールドはデフォルトで埋め、検証対象だけを override させる
- `describe` の中で局所定義してよい。共通化は2ファイル以上で同じ形になってから検討
- 例: `apps/web/utils/xxx.test.ts` の `makeTestXxx`

### 結合テスト（カスタムフック）

- `renderHook`（@testing-library/react）でフックを呼び出す
- connectrpc のサーバ応答は MSW (`msw/node`) でスタブする。`setupServer` を `beforeAll` で起動、`afterEach` で `resetHandlers`、`afterAll` で `close`
- スタブはそのテストが検証する観点に絞る。全 RPC を網羅しない
- 実行は `test-ix` レーン（`pnpm test-ix` / `make test/ix`）。`vitest.ix.config.ts` が `*.ix_test.tsx` を拾うので、新規ファイルを置くだけで動く（`vite.config.ts`〔unit 用〕には追加しない — unit〔`test`〕と結合〔`test-ix`〕を config レベルで分離し、unit に結合テストが混ざらないようにするため）
- 現状 web の `*.ix_test.tsx` は 0 件で `test-ix` は `--passWithNoTests` 付き（暫定）。最初の hooks ix_test を追加したらこのフラグを外し「結合テスト 0 件＝失敗」のシグナルを戻す
- unit (`test`) 側にも `--passWithNoTests` を付けている（**恒久**）。単体テストが 0 件の段階でも `pnpm -r test`（CI）を通すための汎用安全弁で、ix の暫定フラグと違い外さない

## テスト項目ドキュメントの自動生成

QC 連携・仕様トレーサビリティ用に「何をテストしているか」を一覧で確認できる派生 doc を `make gen/doc/testing/web` で自動生成する。テストコード側を SoT として保ち、doc は再生成可能な派生物として drift を構造的に防ぐ。

- **コマンド**: `make gen/doc/testing/web`
- **入力**: `apps/web/{stdutils,utils}/**/*.test.ts`、`apps/web/app/**/*.test.{ts,tsx}`、`apps/web/hooks/**/*.{ix_test.tsx,test.ts}`、`apps/web/components/**/*.test.tsx`（場所を問わず単体テストを拾う。`app/` は単一画面コロケのテスト）
- **出力**: `docs/testing/web/<対象パス>.md`（source 構造を mirror。`describe` を見出し、`it` を箇条書きにした markdown）と一覧 `docs/testing/web/README.md`
- **実装**: `devtools/build-test-doc.mjs`（apps/api と共通の汎用ツール。インデント幅で describe 階層を判定。prettier 整形を前提）。`describe`/`it`/`test` を認識する（`.skip` で無効化したテストや `it.each` 等のパラメタライズドは doc 化されない。項目化したいものは個別 `it` で書く）
- **親 target**: `make gen/doc` 全体に含まれる（proto / db / api と並列）
- **drift 防止**: CI で `make gen/doc/testing/web && git diff --exit-code docs/testing/web/` を回し「テストコードを変更したのに doc を再生成し忘れた」を検出する（api と同じ仕組み）

> **収録範囲**: FE は **場所を問わず** behavior contract を持つ業務ロジック単体を収録する（`utils/` でも `app/` コロケでも）。凝集モジュール内の pure core テスト（例: `hooks/platform/parse.test.ts`）も単体として収録対象。例外的に書いたコンポーネントテスト（`components/`）も収録する。API 側はサービス結合テストが中心で doc も結合のみ（[refs/apps/api/testing.md](../api/testing.md)）。

## E2E と責任分界

- E2E は **QC 側の責務**。エンジニア側では原則書かない
- 開発側で書いた単体・結合テストは、QC 側のテスト項目に AI 経由で PASS/FAIL 反映される判断材料の一つになる
- E2E ツール選定・テスト戦略は QC 側で別途定義

## 実装例

具体的な参考実装は、リポジトリ内の既存 `*.test.ts(x)` / `*.ix_test.tsx` を `make gen/doc/testing/web` の出力（`docs/testing/web/`）で見当を付けて参照する。

## 参考文献

- Vladimir Khorikov『単体テストの考え方/使い方』（マイナビ出版、須田智之 訳）
- API 側のテスト方針: [refs/apps/api/testing.md](../api/testing.md)
