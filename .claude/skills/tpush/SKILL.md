---
name: tpush
description: 派生案件の汎用的な変更を、案件固有混入をチェックした上でテンプレリポジトリへ PR として還元する(案件→テンプレ / upstream)
disable-model-invocation: true
---

# tpush (案件 → テンプレ 還元)

派生案件 repo で「これはテンプレにも入れた方がいい」という汎用的な変更を、**テンプレリポジトリ
`entermotion-jp/line-miniapp-template` へ PR として還元(upstream)** するスキル。`tsync`(テンプレ→案件)の逆方向。

還元前に **汎用性ゲート**(テンプレに入れる価値があるか)と **案件固有混入チェック**(案件依存の値・文言・ロジックが紛れていないか)をかける。
最終的な品質ゲートは**テンプレ側の PR レビュー**(OSS の upstream PR と同じ形)。

## トリガー

- `/tpush` … 現ブランチの変更(vs ベース)を source に、テンプレ還元の候補としてチェック
- `/tpush <PR番号 or URL>` … 案件側の特定 PR を source に
- `/tpush <commitish>..<commitish>` … 指定コミット範囲を source に

## 前提条件

- **派生案件 repo のルートで実行する**。
- テンプレへの push 権がある(無ければ fork → PR 運用に切り替え)。
- 作業ツリーがクリーン(worktree を使うため)。

## 汎用性 / 案件固有 の基準

判定は [docs/rules/refs/workflow/template-follow.md](../../../docs/rules/refs/workflow/template-follow.md) のルーブリックを**そのまま流用**する(唯一の基準)。

- **テンプレ向き(汎用)** = follow ルーブリックの `must` / `recommended` に当たる性質
  (バグ/セキュリティ修正、共通基盤・共有コンポーネント・`config`/CI/`docker`/`Makefile`・`docs/rules` の改善、型/リファクタ、汎用ユーティリティ等)
- **テンプレ不向き(案件固有)** = `optional` に当たる性質
  (案件ごとの画面・文言・レイアウト・ビジネスロジック、デモ/サンプル、DB等インフラ結合のbump、特定案件向け実験)

## 実行手順

### 1. source 差分の特定

- 引数があればそれ(PR / commit範囲)、無ければ現ブランチ vs ベースの差分。
- ファイル一覧と各ファイルの差分を把握する(`git diff <base>..<head>`)。

### 2. 汎用性ゲート(ファイル/ハンク単位で振り分け)

各変更を **汎用 / 案件固有 / 要判断** に分類する:

- 共通領域(`apps/api` 共通処理、共有コンポーネント、`config`系、`tsconfig`、lint、`docker`、`Makefile`、CI、`docs/rules`)→ 汎用
- 案件固有領域(下記 `softExcludePaths` 相当)→ 案件固有
- 案件固有領域でも**内部リファクタ・型強化・共通化**は汎用になりうる(中身を見る)

案件固有領域の目安(tsync の `softExcludePaths` と対応):

- `apps/web/app/**`(案件ごとの画面実装)
- `.env.example` / `.env*`、env 固有の `config.*.ts` 値
- `migrations/**`(案件ごとのスキーマ・seed)

### 3. 案件固有混入チェック(サニタイズ)

差分テキストとメタ情報を走査し、**テンプレに出してはいけない案件固有シグナル**を `file:line` で列挙する。

検出対象:

- **識別子・シークレット**: LIFF ID、LINE Login channel ID / secret、Messaging API トークン、GTM/GA 計測ID、
  OAuth client、API キー、DB 認証情報、admin URL キー(`config.server.ts` の `adminUrlKey` 等)、JWT secret
- **ドメイン・URL**: 案件固有のホスト名・本番/STG ドメイン・リダイレクト URL
- **名称・ブランド**: クライアント名・会社名・サービス名・プロダクト名、画面コピー(文言)、ロゴ/画像アセット
- **env 実値**: `.env*` の値、`config.*.ts` に直書きされた実値
- **案件固有ロジック/データ**: 特定案件のビジネスロジック、`migrations` の案件データ

各検出について **除去 / 一般化(プレースホルダ・config 化・コメントの例値化)/ そのまま** を提案する。
**PR タイトル・本文**は、導入経緯の把握のため **出自(案件 repo 名・source PR リンク 例: `entermotion-jp/<case>#<PR>`)は記載してよい**。ただし **シークレット・各種ID(LIFF/LINE channel/GTM 等)・トークン・本番/管理画面の固有 URL・ドメイン・クライアント/ブランド名** は本文・タイトルにも出さない(差分と同じ基準でサニタイズ)。

### 4. レポート + 確認(★ここで一旦停止)

ユーザーに提示する:

- **汎用性判定**: 全体がテンプレ向き / 一部のみ / 不向き
- **還元対象(案)**: 汎用と判定したファイル・ハンクのみ(案件固有は除外、要一般化は一般化案つき)
- **案件固有混入の検出結果**: `file:line` のリストと対応(除去/一般化/そのまま)
- 不向きと判定したら、その理由を述べて**ここで終了**(無理に PR 化しない)

ユーザーが対象と一般化方針を確定してから次へ。

### 5. テンプレへ PR 作成

履歴は分断されているため、テンプレ起点のブランチに**サニタイズ済み差分を patch として当てる**。派生 repo の作業ツリーを汚さないよう worktree を使う。

```sh
# template remote は main だけ追う設定にする(既定の remote add は全ブランチ取得で template/* が溜まる)。
# remove → add -t で refspec を絞り、過去に溜まった template/* も一掃する(冪等)。
# push 先の upstream/<topic> も refspec 外なので tracking ref は作られない。
git remote remove template 2>/dev/null || true
git remote add -t main template https://github.com/entermotion-jp/line-miniapp-template.git
git fetch --prune template

# サニタイズ済み(案件固有を除外・一般化した)差分を patch 化
git diff <base>..<head> -- <汎用と確定した対象パス...> > /tmp/tpush.patch

# テンプレ起点の一時 worktree を作って適用
git worktree add -b upstream/<topic> ../tpush-tmpl template/main
git -C ../tpush-tmpl apply --3way --whitespace=nowarn /tmp/tpush.patch   # 衝突は手で調整
# 一般化(プレースホルダ化等)が必要なら ../tpush-tmpl 内で直接編集
git -C ../tpush-tmpl add -A
git -C ../tpush-tmpl commit -m "<汎用化したタイトル(案件名を含めない)>"
git -C ../tpush-tmpl push template HEAD:upstream/<topic>
```

その後、テンプレに PR を作成する:

- base `main` / head `upstream/<topic>`
- 本文に**出自を記載する**(例: 「派生案件 `entermotion-jp/<case>#<PR>` の <topic> を汎用化して還元」)。導入経緯の把握に有用。ただしシークレット・各種ID・固有 URL・ドメイン・ブランド名は書かない。
- follow ラベルは [template-follow.md](../../../docs/rules/refs/workflow/template-follow.md) のルールに従い自動判定・付与(テンプレ repo の PR なので発火する)。

### 6. 後片付け / レポート

**PR 作成まで成功したら**、手元の使い捨て成果物を消す。コミットと PR は template リモート側(`upstream/<topic>`)に残るので失われない。人の関心はブラウザの PR に移り、そのままマージして終わることが多いため、ローカルには `template` リモート含め何も残さない。

```sh
git worktree remove ../tpush-tmpl
git branch -D upstream/<topic>   # worktree 削除後に実行。ローカル作業ブランチを削除
                                 # base が template/main(派生 repo と無縁系統)で -d は「未マージ」と誤判定するため -D。push 済みなので安全
git remote remove template       # template リモート(と template/* の remote-tracking ref)も削除し、派生 repo に残さない。次回 tpush/tsync が再追加・再 fetch する
rm -f /tmp/tpush.patch
```

- 還元した内容、除外/一般化した案件固有箇所、作成したテンプレ PR の URL、付与した follow ラベルを報告する。
- ローカルの `upstream/<topic>` と `template` リモートを削除したことも一言添える(後述「PR 作成後に修正を追加するとき」で取り戻せるので失われない)。

## PR 作成後に修正を追加するとき

PR と remote ブランチ `upstream/<topic>` はテンプレ側に残っているので、後片付けで手元を撤去しても失われない。追加 push するときは **`template/main` ではなく PR ブランチ `upstream/<topic>` 起点**で作り直す。main 起点だと別履歴の単発コミットになり、既存ブランチに対して non-fast-forward で弾かれる(force push は履歴を壊すので不可)。

```sh
git remote remove template 2>/dev/null || true            # 後片付け済み/未済どちらでも冪等に
git worktree remove ../tpush-tmpl 2>/dev/null || true      # 前回の worktree が残っていれば掃除
git remote add -t upstream/<topic> template https://github.com/entermotion-jp/line-miniapp-template.git
git fetch template upstream/<topic>
git worktree add -B upstream/<topic> ../tpush-tmpl template/upstream/<topic>   # -B で既存ローカルブランチも上書き。PR の現 HEAD 起点
# ../tpush-tmpl 内で修正 → commit
git -C ../tpush-tmpl push template HEAD:upstream/<topic>                       # PR に追従(fast-forward)
```

終わったら手順6と同様に worktree・ローカルブランチ・`template` リモートを撤去する。

## やってはいけないこと

- 案件固有の値・文言・シークレットをそのままテンプレ PR に含める
- 派生 repo の履歴ごとテンプレへ push する(差分が巨大化する。必ず patch をテンプレ起点ブランチに当てる)
- 汎用性が無い変更を無理にテンプレ化する(案件側に留めるべきものは留める)
- PR タイトル/本文に**シークレット・各種ID・トークン・本番/管理画面の固有 URL・ドメイン・クライアント/ブランド名**を残す(出自としての案件 repo 名・source PR リンクは記載可)

## メモ

- このスキルもテンプレの `.claude/skills/` に置かれ、`tsync` 経由で各案件へ配布・更新される。
- 案件固有シグナルの具体的な検出箇所(env/config の実体)はリポジトリに合わせて精緻化できる(`.env.example` と `config.*.ts` を走査してチェックリストを補強)。
