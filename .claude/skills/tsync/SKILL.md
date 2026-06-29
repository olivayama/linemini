---
name: tsync
description: テンプレリポジトリ(line-miniapp-template)との差分をチェックし、未取り込みの更新を候補として提示・選択取り込みする(template sync)
disable-model-invocation: true
---

# tsync (template sync)

派生案件リポジトリで、テンプレリポジトリ `entermotion-jp/line-miniapp-template` の更新を追従するためのスキル。
「どこまで取り込んだか」を `.template-sync.json` で管理し、未取り込みの更新だけを候補として提示する。

派生リポジトリはテンプレを **Use this template / コピー** で作成しており **git 履歴が分断されている**前提。
そのため `cherry-pick` / `merge` は使わず、**PR 単位の差分(patch)を作業ツリーに当て、衝突したら手で移植する**方式を取る。

## トリガー

- `/tsync` … 未取り込みの更新を全件チェックして候補を提示
- `/tsync <PR番号 or URL>` … 特定のテンプレ PR だけを取り込み(従来の「PR URL を渡して取り込む」運用の置き換え)
- `/tsync init` … `.template-sync.json` を初期化

## 前提条件

- **作業リポジトリ(派生案件リポジトリ)のルートで実行する**(テンプレ本体では実行しない)
- 作業ツリーがクリーンであること(未コミットの変更があると patch と混ざる)。
- **必ず `main`(派生案件のデフォルトブランチ)を起点に専用ブランチを切ってから取り込む**。作業中の任意のブランチにそのままコミットを積み上げてはならない(無関係な作業ブランチを汚す/取り込みが他作業と混ざる)。手順5で `main` へ切り替え→最新化→専用ブランチ作成を必ず行う。

## 状態管理ファイル `.template-sync.json`

リポジトリのルートに置く。例:

```jsonc
{
  "templateRepo": "entermotion-jp/line-miniapp-template",
  "templateUrl": "https://github.com/entermotion-jp/line-miniapp-template.git",
  "defaultBranch": "main",       // 追従するテンプレのブランチ。派生元が variant ブランチ(例: for-vca)ならそのブランチ名にする(後述「variant ブランチ由来の案件」)
  "lastSyncedSha": "48baeac602abbc8caf4c851e7b3916fa56ded3f1", // ★ここまでは全PRを判断済み(取込・既存 / 見送り / 保留)というウォーターマーク
  "softExcludePaths": [          // 【標準固定】init が自動投入(質問しない)。案件固有度が高い領域=ハード除外でなく既定で選択オフにするだけ。案件特有の事情があれば手編集で上書き可
    ".env.example",               // 案件ごとの環境変数
    "apps/web/app/**",            // 案件ごとの画面実装
    "migrations/**",              // 案件ごとのスキーマ
    "infrastructures/**"          // 案件ごとのインフラ定義
  ],
  "appliedPrs": [{ "n": 172, "sha": "48baeac" }, { "n": 165, "sha": "9a3f0d1", "note": "案件に既存(独自実装/別経路)" }], // 内容が案件に入っている PR(tsync 取込 or 独自実装/別経路で既存。手段は問わない。既存は note 併記)
  "skippedPrs": [{ "n": 170, "reason": "デモ画面のレイアウト調整・案件不要" }], // 内容を案件に入れない PR(非該当・案件不要・撤回など)
  "deferredPrs": [{ "n": 200, "sha": "67fd7db", "reason": "前提PR(#169)未取込のため保留。時が来たら取り込む" }], // 保留 = 判断済みだが「今は入れない/前提待ち」。watermark は通過してよいが、★全件 /tsync で毎回 候補へ再掲する(取りこぼし防止)
  "snapshotSyncs": [{ "sha": "ccf6a72", "trees": ["docs/rules", "docs/testing", ".claude"] }] // テンプレ所有ツリーを一括スナップショット同期した記録(個別PRに紐つかない。手順5/6 参照)
}
```

**3つの状態(applied / skipped / deferred)**: PR は最終的にこの3つのいずれかで管理する。

- `appliedPrs` … **内容が案件に入っている**。tsync で取り込んだものに加え、**独自実装・別経路で既に存在しているもの(=既存)も含む**(手段は問わない。skipped に入れると「取り込まないことにした」に見えて実態と食い違うため)。既存の場合は `note`/`reason` に「案件に既存(独自実装/別経路)」と経緯を残す。
- `skippedPrs` … **内容を案件に入れない**(非該当=対象の機能/ファイルが案件に無い・案件不要・撤回・テンプレ版が案件に不適など、もう蒸し返さない)。「案件に既存」は skipped ではなく applied 側。
- `deferredPrs` … **保留**。判断は済んだが「今は入れない・前提 PR 待ち・案件タイミング待ち」。**ウォーターマークは通過してよい**が、忘れないよう**全件モード `/tsync` で毎回 候補に再掲**し、時が来たら `appliedPrs`(取込)か `skippedPrs`(やめる)へ移す。

`snapshotSyncs`(上の3状態とは別の記録)… テンプレ所有ツリーを**一括スナップショット同期**したときに `{sha, trees}` で「どのツリーをどの時点へ同期したか」を残す(手順5)。個別 PR には紐つかないため3状態には含めない。

## ツールの役割分担(fetch と GitHub MCP は併用)

- **patch の取得と適用は git fetch が core**。理由: `git apply --3way` は差分ヘッダが指す**基底 blob**を使って3-way マージする。
  テンプレを `git fetch` しておけばその blob がローカルに存在し、案件側の独自変更があっても賢く統合できる。
  MCP 経由の unified diff だけだと基底 blob がローカルに無く、--3way が効かず素当て(衝突増)に劣化する。
- **GitHub MCP はメタ情報の補強**に使う: PR タイトル・ラベル(優先度)・PR 説明文・どの PR が何を変えたか。
  あれば手順3の優先度判定と候補説明が正確になる。無くても core は git だけで完結する。
- GitHub 操作(PR メタ取得・ラベル取得等)は **GitHub MCP を使う**(`gh` は試みない)。git(fetch/diff/apply)はローカルでそのまま使う。
- git fetch がそもそもできない環境(ネットワーク制限等)でのみ、MCP を patch 取得のフォールバックにする(--3way 劣化を許容)。

## 実行手順

### 1. マーカー読み込み / ブートストラップ(`init` または未作成時)

`.template-sync.json` が無ければ作成する。

1. `templateRepo` / `templateUrl` / `defaultBranch` を確認(デフォルトは上記)。
   - **派生元ブランチの特定**: `Use this template` / コピー元がテンプレの **main とは限らない**。特定プロダクト系統向けの **variant ブランチ**(例: `for-vca`)から切り出されていることがある。その場合 `defaultBranch` を **その variant ブランチ**にする(main を追うと variant 固有の更新を恒久的に取りこぼす)。判別は手順2の「フォーク起点の特定」を **main と variant の両方**で試し、ツリーが一致(または最小差分)する方を採る。詳細は「variant ブランチ由来の案件」を参照。
2. `lastSyncedSha`(ウォーターマーク)を決める。ユーザーに確認:
   - **(a) 既に乖離している既存案件** → まず現在のテンプレ HEAD を基準にして「これ以降を追従」。過去分が必要なら別途まとめて取り込む。
   - **(b) 厳密に追う** → 案件作成時点のテンプレ commit(フォーク起点)を基準にする。SHA が不明でも手順2の「フォーク起点の特定」で求められる。
3. `softExcludePaths` は**固定の既定値を自動投入**する(ユーザーには問わない)。既定値は上記「状態管理ファイル」例の `softExcludePaths` に挙げたパス配列を使う(例中の解説コメントは転記せず、パス値のみ)。案件固有度が高い領域はどの案件もほぼ共通のため初期化時に相談せず、案件特有の事情があれば後から `.template-sync.json` を直接編集する。
4. `.template-sync.json` を作成してコミット。**続けて取り込みに進むなら、先に手順5の専用ブランチを切ってからコミットする**(デフォルトブランチ上での bootstrap コミットを避ける。`init` 単独実行時のみ現ブランチで可)。

### 2. テンプレを取得(fetch)

履歴が分断されていても objects は取得できる。

```sh
# template remote は「追従ブランチだけ」取得する設定で用意する。
# 既定の `git remote add <name> <url>` は fetch refspec が +refs/heads/*:refs/remotes/template/*
# (全ブランチ取得)になり、template/main・template/feat/* 等が手元に並んだまま溜まる。
# remove → add -t で refspec を絞り、過去に溜まった template/* も一掃する(冪等)。
git remote remove template 2>/dev/null || true
# defaultBranch に応じて該当する方を1つ実行する:
git remote add -t main template <templateUrl>                  # 通常案件(defaultBranch=main)
# git remote add -t main -t <variant> template <templateUrl>   # variant 案件(例: for-vca ベース)。main も必ず一緒に追跡
git fetch --prune template
git rev-parse template/<defaultBranch>   # 取得した最新 SHA = 今回の同期先候補
```

> **variant 案件が main も追跡する理由**: 手順3.1で `template/main` と比較して「main 由来 PR」を列挙するため。`-t <variant>` だけにすると `template/main` が手元に無く、main 由来 PR を恒久的に取りこぼす。

**フォーク起点の特定(厳密追従 (b) で SHA が不明のとき)**: 履歴は分断されているが、`Use this template` はファイルをコピーするだけなので、案件の**初期コミット(placeholder 置換前)のツリー**はどこかのテンプレコミットと一致する。

```sh
init=$(git log --reverse --format=%H | head -1)             # 案件の初期コミット
for c in $(git log --first-parent --format=%H template/<defaultBranch>); do
  [ -z "$(git diff --name-only $init $c)" ] && echo "fork起点 = $c" && break
done
```

`git diff --name-only <init> <テンプレcommit>` が**空(0ファイル)= ツリー一致 = 起点**。完全一致が無ければ `--name-only` 差分が最小のコミットを起点とみなす(初期コミットの日時付近に絞ると速い)。

**variant ブランチ由来の案件(`defaultBranch` が main 以外)**: テンプレに特定プロダクト系統向けの **variant ブランチ**(例: `for-vca`)があり、案件がそこから切り出されていることがある。この場合:

- フォーク起点の探索は `template/<variant>` の first-parent に対して行う(main では一致しない)。
- variant は main を定期的に取り込む(`Merge branch 'main' into <variant>`)ので **main を内包**する。候補列挙の分け方(main 由来 PR + variant 固有 PR の和)は手順3.1「variant ブランチを追う場合の注意」を参照。
- variant 固有 PR(例: その系統だけのペンテスト対応・機能追加)は **main を追うだけでは永久に出てこない**。`defaultBranch` を variant に設定して追従基準を合わせる。
- variant の初期実装コミット(フォーク母体そのもの)は案件に既存なので候補化しない(中身は入っているので `appliedPrs` に「variant 母体・案件に既存」等で記録するか、ウォーターマーク起点に含める)。

### 3. 未取り込み候補のリストアップ

> **★ 最初に「テンプレ所有ツリー(一括同期)」と「案件所有ツリー(個別 PR)」を分ける**(per-PR 判定の前に行う): `docs/rules/**`・`docs/testing/**`・`.claude/**`・`.cursor/**`・`CLAUDE.md`・`AGENTS.md` など**案件がほぼ分岐しないテンプレ所有のツリー**は、PR を1件ずつ当てると**連鎖衝突**するため個別再生せず**一括スナップショット同期**する(実行と注意は手順5)。`git diff HEAD template/<defaultBranch> -- <tree>` の規模で「テンプレ所有(分岐小)」か「案件所有(分岐大)」かを見極め、テンプレ所有ツリーは**個別 PR 候補から外す**(下の presence-ratio 等の per-PR 判定をそのツリーに走らせない=無駄を省く)。**混在 PR(doc + code)** は doc 部分を一括同期側に寄せ、**code 部分だけ**を per-PR 候補にする。

1. **first-parent で範囲のコミット列**を取得(古い→新しい):

   ```sh
   git log --first-parent --reverse --format='%H%x09%s' \
     <lastSyncedSha>..template/<defaultBranch>
   ```

   `--first-parent` なら「main が1歩進む = PR 1件」になり、merge / squash / rebase の差を吸収できる。

   > **variant ブランチ(`defaultBranch` が main 以外)を追う場合の注意**: variant は定期的に main を取り込む(`Merge branch 'main' into <variant>`)ため、variant の first-parent には main 由来の個別 PR が **merge コミットに束ねられて**現れ「1ステップ=1PR」が崩れる。個別 PR 粒度で拾うには分けて列挙する:
   > 1. **main 由来 PR**: `<lastSyncedSha>..template/main` の first-parent(従来どおり)。
   > 2. **variant 固有 PR**: `template/main..template/<variant>` の first-parent から `Merge branch 'main' into ...` を除いたもの(= variant だけにある PR・直 push)。
   >
   > variant は main を内包する(`template/<variant>..template/main` が空)ので、両者の和が候補の母集団。variant 固有 PR は main を追うだけでは**出てこない**ので必ず加える。

   **★ `deferredPrs`(保留 PR)の再掲(全件モードで必須)**: 全件 `/tsync` では、上記 first-parent 範囲に加えて `.template-sync.json` の `deferredPrs` を**ウォーターマークより下にあっても必ず候補へ再掲する**。保留 PR は「判断済みだが今は入れない/前提待ち」であり、ウォーターマークは通過してよいが、取りこぼし防止のため毎回 候補に出す。範囲内の PR と重複する場合は1件にまとめる。一覧では `保留` と明示し、`deferredPrs` の reason を併記する。各保留 PR の正味差分は `git diff <sha>^ <sha>` で再取得できる(範囲外でも sha があれば patch 化可能)。

2. 各ステップ(直前の first-parent commit → 当該 commit)が **その PR の正味の差分**(= `git diff <sha>^ <sha>` でも同じ)。PR 番号・タイトルは commit subject から抽出(`Merge pull request #N` 形式)。**PR を介さない main 直 push** の commit は PR 番号が無いので、SHA + subject で識別する。
3. 各 PR の変更規模を確認: `git diff <prev> <sha> --stat`。
4. **既取り込み判定(★重要)**: 長く乖離した案件は、テンプレの変更を**独自に取り込み済み**のことが多い。各 PR の正味差分が案件に既にあるかを判定する:

   ```sh
   git diff <prev> <sha> -- <paths> | git apply --reverse --check   # ★ --3way は付けない
   ```

   - **成功 = 既に存在** → 候補一覧で `既存` と明示し既定オフ。記録は **`appliedPrs`(取り込み済み扱い)** に `note="案件に既存(独自実装/別経路)"` で残す(skipped ではない。中身は入っているため)。
   - ⚠️ `git apply --check --3way`(順方向)は**適用済みパッチでも 3way の no-op マージで成功**するため、「未取り込み」判定には**使えない**。既存判定は必ず **plain な `--reverse --check`(--3way なし)** で行う。
   - **reverse も forward もクリーンに当たらない場合(=案件が当該領域を独自改変済み)** は二値では決められない。**presence ratio** で判断する:
     PR の追加行(`+`行・`+++`除外、空白trim、短い行は除外)のうち、**touch したファイルの案件現行版に既に存在する行の割合**を数える(`git show HEAD:<file>` に対し各追加行を `grep -F`)。
     - **80%以上 = 既存濃厚**(命名変更・分割等でリファクタされていても大半の行が一致 → 実質取り込み済み)→ applied(取り込み済み扱い)
     - **30%未満 = 未取込濃厚** → 取り込み候補
     - **中間(30〜80%)= 要目視**(一部だけ取り込み済み。残差を手移植するか判断)
     - touch ファイルが案件に**存在しない**(新規/別構成)= 未取込 or 非該当の手がかり
   - ⚠️ **移動/分割/リネームを伴うリファクタは presence-ratio が誤る**: 「`a/x.ts` → `b/x.ts` へ移設」型の PR は touch ファイルの和集合に**旧パスも含まれ**、旧パスに行が残っているため比率が**高く出るのに移設は未実施**ということが起きる(実例: pool を別ディレクトリへ移す PR が ~48% と出たが、旧パスにコードが残っていただけで未取込)。移動/分割/リネーム系は presence-ratio を鵜呑みにせず、**構造確認**を併用する: 新パス/新シンボルが案件に在るか(`git cat-file -e HEAD:<新パス>` / `grep -rl '<新シンボル>'`)、**旧パスが消えているか**。新が在り旧が無ければ取り込み済み、旧が在り新が無ければ未取込。
   - ratio が高くても、最終はコミット前に実差分を**目視確認**する(機能的に既存なら applied=取り込み済み扱い)。
   - **★ テンプレ HEAD 残存チェック(別観点・古い PR で特に重要)**: first-parent の正味差分は「**その時点での追加**」であり「**今もテンプレにあるか**」とは別。古い PR は後続 PR で**削除/移設/取り消し**されていることがある(例: skill 追加 PR が後でルール doc へ移設され skill 自体は消える)。取り込み前に、その PR が追加したファイル・内容が**現テンプレ HEAD に残っているか**を確認する:

     ```sh
     git cat-file -e template/<defaultBranch>:<追加されたpath>      # 追加ファイルが今も在るか
     git show template/<defaultBranch>:<path> | grep -F '<追加内容>'  # 追加内容が今も在るか
     ```

     HEAD から消えている = その後のリファクタで不要化/移設 → **取り込まない(非該当)**。`skippedPrs` に「後続 PR で削除/移設(現テンプレに無し)」と記録する。
   - ⚠️ **案件がテンプレの参照元(逆輸入元)の場合、コード PR の大半は既に案件に存在する**。テンプレがその案件から機能を吸い上げている系統では、reverse-check が「未取込」でも実体は移設/リネームで存在することが多い。**構造確認(新パス/新シンボルの存在・旧パスの消滅)を一次情報**とし、binary な apply-check を鵜呑みにしない。最初に `git diff HEAD template/<defaultBranch> -- apps/api apps/web` 等で残差規模を見て「ほぼ既存の案件か」を把握しておくと判定が速い。
   - ⚠️ **「既存か」の意味判定をサブエージェント任せにしない**。「機能的に既存」のような semantic な判断は誤りやすい(実例: component/web 系のサブエージェント判定が複数件で誤り、ユーザー指摘で発覚)。必ず**構造事実(`git cat-file -e HEAD:<path>` / `grep -rl '<symbol>'` の有無)で裏取り**し、重要な見送りは実差分を目視するか複数観点で敵対的に再検証する。
5. **`softExcludePaths` はハード除外しない**。該当 PR も**必ず一覧に出す**。やることは「既定の選択を外す」だけ。
   さらに、該当 PR の中身を見て **変更の性質**を一言で分類・提示する:
   - **構造/内部リファクタ系**(命名・分割・共通化・型・lint対応 等) → 案件固有画面でも**取り込み推奨**としてフラグ
   - **コンテンツ/画面仕様系**(案件ごとに異なる文言・レイアウト・ビジネスロジック) → **見送り推奨**
   → 「固有画面だけど方針は揃えたいリファクタ」を取りこぼさないため。最終判断はユーザー。
6. **優先度の判定**: 各 PR に `follow:must / recommended / optional` を割り当てる。
   - `follow:*` ラベルが付いている PR → GitHub MCP でラベルを取得し、それを使う(`ラベル` と明示)。
   - **ラベルが無い PR → Claude が差分を見て [docs/rules/refs/workflow/template-follow.md](../../../docs/rules/refs/workflow/template-follow.md) のルーブリックで判定し、レベルを割り当てる(`推定` と明示)。**
   - **`follow:coordinate`(重要度と直交する修飾)が付いた未取込 PR → 状態の既定を deferred(保留) にする**。重要度は並び順に使うが「単独取り込みは危険・要調整」なので一覧に `要調整` と明示し、PR 本文の調整メモ(なぜ危険か/何を待つか/誰と調整か)を併記する。取り込むのは調整が済んでから(未了なら deferred 据置 / 非該当なら skip)。詳細は [template-follow.md](../../../docs/rules/refs/workflow/template-follow.md) の `follow:coordinate`。
   判定基準は同ドキュメントを唯一の基準とする。`must > recommended > optional` でソートして提示する。
7. 一覧を提示する(手順4で『既存』のものは既定オフにして明示)。例:

   ```
   未取り込みのテンプレ更新 (5件) — 基準 48baeac → 最新 ccf6a72
     #173  must         (推定)   GTM session_ready の不具合修正            3 files
     #91   must         (ラベル)  RDS storageEncrypted 化  ⚠要調整 follow:coordinate(既存RDS再作成リスク)→既定 deferred
     #170  optional     (推定)   デモ画面のレイアウト調整  ▽既定オフ(画面固有)
     #168  recommended  (推定)   app配下のディレクトリ構成リファクタ ▽softExclude該当だが内部リファクタ→推奨
     #165  recommended  (推定)   inline-api-routes  ▽既存=案件が独自取り込み済み→applied記録・既定オフ

   保留中(deferredPrs・watermark より下でも毎回再掲)
     #169  recommended  (推定)   MySQLRepository 抽象化  ▽保留: 案件の永続層が乖離・時が来たら
     #200  recommended  (推定)   DomainEventEmitter      ▽保留: 前提 #169 待ち
   ```

### 4. 取り込む PR を選択してもらう

- 番号で複数選択 / `all`(softExclude を除く)/ 個別指定。
- softExclude 該当はデフォルト対象外だが、★取り込み推奨フラグ付きや、ユーザー判断で個別に選択可能。

### 5. 取り込み(PR 単位)

> **★ `infrastructures/**` の取り込みは別ブランチ・別 PR に分ける**: `infrastructures/**` 配下を取り込む場合、通常の `chore/tsync-YYYYMMDD` に混ぜず **`main` 起点の別ブランチ `chore/tsync-YYYYMMDD-infra` → 別 PR** にする(README 等 `infrastructures/` 配下のみの変更も一律こちら)。理由: インフラは「削除→追加」等の順序・状態を伴いデプロイが独立した手動操作なので、非インフラ変更に混ぜると「デプロイ前に main へマージしてしまう」「インフラだけ独立して反映/保留できない」事故になる。
>
> - **混在テンプレ PR(infra + その他)はパスで分割**する。実務上は **2 パス**が簡単: ①通常ブランチで `infrastructures/` を除いて取り込み(各 patch を `... -- . ':(exclude)infrastructures'`)→ ②`main` 起点で `chore/tsync-YYYYMMDD-infra` を切り、選択 PR の `infrastructures/**` 分だけを `... -- infrastructures` で当てて別 PR。
> - infra PR は単独でレビュー・デプロイし、**デプロイ後にマージ**する。`infrastructures/` を含む PR には CI(`.github/workflows/label_infra.yaml`)が自動で `infra（全envデプロイ後マージ）` ラベルを付ける。

> **★ テンプレ所有ツリーの一括スナップショット同期**(手順3 で「一括同期対象」と判定したツリーをここで実行): 個別再生せず `git checkout template/<defaultBranch> -- <tree>` で**最新へ一括同期**する。数十 PR を数コミットに圧縮でき、**連鎖衝突**(PR を1件ずつ当てると前の patch がツリーを変え後続が次々衝突する現象)も消える。
>
> - **★ 全件モードでは「条件付き」でなく既定で実施する(混在 PR の doc 半分の取りこぼし防止)**。混在 PR(code + doc)の **doc 半分は per-PR のコード取込では入らない**。コードだけ取り込んで同 PR の doc を放置すると、doc が実コードと矛盾する(実例: ある PR のコードを入れたが同 PR の `docs/rules/refs/apps/api/repositories.md` を落とし、**doc が「削除済みのヘルパーを使え」と言い続ける**矛盾が残った)。**watermark を X へ進める前に、テンプレ所有 doc ツリー(`docs/rules`・`docs/testing` のテンプレ部・`.claude`・`.cursor`・`CLAUDE.md`/`AGENTS.md` のテンプレ部)を X へ snapshot-sync 済みにすること**を、手順6 の watermark 前進の前提とする(案件カスタムのある M ファイルだけ下の手順で除外)。
> - **⚠️ checkout はテンプレ tree に在る全パスを上書きする**。保全されるのは「テンプレ tree に不在=案件にしか無い」ファイルだけで、**テンプレにも在るが案件がカスタムしたファイル(`.claude/settings.json`・hooks・`docs/rules/pj.md`・追記した `CLAUDE.md`/`AGENTS.md` 等)は上書きで消える**。実行前に `git diff --name-status HEAD template/<defaultBranch> -- <tree>` で **M(上書き)ファイルを列挙**し、案件カスタムを持つものが無いか中身を確認、有れば pathspec から除外する。
> - **旧パスの掃除と保全の判別**: 一括 checkout は**テンプレが削除した旧ファイルを消さない**(orphan が残る)。「テンプレ tree に無いファイル」は (a) 案件固有=保全すべき か (b) テンプレが消した旧ゴミ=`git rm` すべき かをテンプレ履歴で判別してから掃除する。
> - **dry-run は連鎖を予測しない**: 各 patch を「適用前の HEAD」単独で `--check` しても、逐次適用では前段の適用でツリーが変わり破綻する(実例: 単独 CLEAN 80件が逐次適用で約半数しか当たらず残りは連鎖衝突)。一括同期できないツリーは、1件当てるごとに次を判定し直す。
> - **状態記録(手順6との接続)**: スナップショット同期は範囲内の **doc-only PR を一括で「判断済み」**にする(= 手順6 の watermark 前進条件のうち doc 分を満たす)。個別に `appliedPrs` へ数十件積まず、`snapshotSyncs` に `{ sha, trees }` を1件だけ残す(どのツリーをどの時点へ同期したか)。watermark の前進可否は手順6 の規則どおり**区間内の全 PR(コード含む)が判断済みか**で判断する。code を含む混在 PR は code 部分を通常どおり個別記録する。

1. **必ず `main` を起点に専用ブランチを切る**(作業中のブランチにそのままコミットを積み上げない):

   ```sh
   # 取り込み専用ブランチが未作成のとき。現在のブランチが何であっても main を起点にする。
   git switch main                                   # 派生案件のデフォルトブランチ(variant 案件でも案件側の main)
   git pull --ff-only                                # main を最新化(リモートがあれば)。失敗しても致命ではない
   git switch -c chore/tsync-YYYYMMDD                 # main を起点に専用ブランチを作成
   ```

   - **作業中のブランチ(feature 等)の上で `git switch -c` してはならない**。そのブランチ起点だと無関係な変更が混ざり、取り込み PR が肥大化する。
   - 既に当回の取り込み用 `chore/tsync-*` ブランチにいる場合のみ、それを継続してよい。それ以外のブランチにいるときは上記で必ず main 起点に切り替える。
   - 作業ツリーがクリーンでない場合は中断し、ユーザーに退避(stash / commit)を促す(`git switch` 前に必ず確認)。
2. 選択された PR を **古い順に** 1件ずつ:
   1. 正味差分の patch を生成。softExclude のうち**見送る**パスだけ除外する(取り込むと決めたパスは含める):

      ```sh
      # 手順3の「既取り込み判定」で『既存』のものはここに来ない(applied 記録済み)
      git diff <prevSha> <prSha> -- <取り込む対象パス...> | git apply --check --3way   # 適用可否の確認(※既存判定には使えない)
      git diff <prevSha> <prSha> -- <取り込む対象パス...> | git apply --3way --whitespace=nowarn
      ```
   2. **クリーンに当たった** → 適用完了。`git apply --3way` は `--index` を含むため**自動でステージ済み**(直後の `git diff` は空に見える。確認は `git diff --cached`)。
   3. **衝突(reject)した** → reject hunk と**案件側の現行コードを読み、手で移植する**。
      案件独自の変更を壊さず、その PR の目的を保ったまま統合する。
   4. PR 単位でコミット。テンプレ PR を必ず残す:

      ```
      chore(tsync): <PR title> を取り込み

      template: entermotion-jp/line-miniapp-template#173
      https://github.com/entermotion-jp/line-miniapp-template/pull/173
      ```
3. **特殊ケース**:
   - `pnpm-lock.yaml` は patch が当たりにくい。`package.json` だけ当てて `pnpm install` で lock 再生成。
   - `migrations/**` は順序依存。原則 softExclude 推奨。取り込む場合は番号衝突に注意。
   - **softExclude が依存先の非除外ファイルを壊すことがある**: 非除外ファイル(例: `apps/web/middleware.ts`)が softExclude のファイル(例: `apps/web/app/config.server.ts`)に **import 依存**している場合、softExclude 側だけ見送る(非除外ファイルだけ取り込む)と**ビルドが壊れる**。機構として一体の機能は、依存ごと取り込む(softExclude を上書きして app 配下も含める)か、**機能ごと見送る**。片側だけ取り込んで放置しない。
   - 見送ったパスの変更は、その旨を必ずユーザーに報告する。

### 6. マーカー更新(ウォーターマーク方式 ★重要)

`lastSyncedSha` は **「ここまでの PR は全て判断済み(取込・既存 / 見送り / 保留)」を表すウォーターマーク**。
個々の判断実績は `appliedPrs` / `skippedPrs` / `deferredPrs` で別管理する。

- 内容が案件に入っている PR(取り込んだ / 既存)→ `appliedPrs` に `{n, sha}`(既存は `note` 併記)。内容を入れない PR(非該当・案件不要)→ `skippedPrs` に追記。**今は入れないが将来検討する PR → `deferredPrs` に `{n, sha, reason}` を追記**(保留)。
- **`lastSyncedSha` を commit X まで進めてよいのは、(現 lastSyncedSha, X] の first-parent PR が全て applied / skipped / deferred のときだけ。**
  まだ判断していない(どの配列にも無い)PR を飛び越えて進めてはならない。deferred は判断済み扱いで通過してよいが、`deferredPrs` に載っている限り**手順3で毎回 候補に再掲される**ので取りこぼさない。
  - （例外）**手順5 の一括スナップショット同期で吸収した doc 系ツリーの PR は「判断済み」とみなす**(個別エントリ不要。同期実績は `snapshotSyncs` に1件残す)。ただし同区間に**コード/混在 PR**が残るなら、それらが applied/skipped/deferred になるまで watermark は進めない。**← 前提: 手順5 ★「全件モードでは doc ツリーを X へ snapshot-sync 済みにする」を済ませてから X へ前進する**(混在 PR の doc 半分の取りこぼし防止)。
- **保留 PR の解消**: 保留していた PR を後で取り込んだら `deferredPrs` から外して `appliedPrs` へ、やめると決めたら `skippedPrs` へ移す(二重計上しない)。
- 全件モード `/tsync` で候補を全部トリアージし終えたら、HEAD まで進める。ウォーターマーク以下になった記録は整理してよい(任意)。
- **個別モード `/tsync <PR>` の規則**:
  - 指定 PR の差分だけ取り込み、`appliedPrs` に記録する。
  - **`lastSyncedSha` は動かさない**(間の PR は未判断のまま残す)。
  - → 「新しめの PR を指定すると、それまでの差分がスキップされる」ことは**起きない**。間の PR は次回 `/tsync` で候補に出る。
- `.template-sync.json` の変更もコミットする。

### 7. 取りこぼし照合(テンプレ全体差分で完成度を検証)★

per-PR 判定(手順3〜5)は「PR 1件ずつの正味差分」を見るため、**部分適用の残差**(skip PR に同梱の汎用変更を落とした/適用 PR の一部を落とした)・**古い版の移植**(後続 PR の改良が未反映)・**どの単一 PR にも現れない帰結**(生成物や config の不整合)を見落とすことがある。これらは**テンプレ現行ツリー全体との差分**を直接見ると確実に拾えるため、取り込み後(または定期監査)に必ず照合する:

```sh
# 共有(両方に在る)で差分があるファイル = 意図しない乖離の候補
git diff template/<defaultBranch> --diff-filter=M --stat -- \
  . ':(exclude)apps/web/app' ':(exclude)migrations' ':(exclude)infrastructures' ':(exclude).env*' ':(exclude)**/gen/**'
# テンプレに在って案件で消えたファイル(怪しい削除)
git diff template/<defaultBranch> --diff-filter=D --stat
```

各差分を **案件固有(意図的)** か **意図しない乖離(取りこぼし/古い版/リグレッション)** に仕分ける:

- **★ 照合の pathspec を code パスへ絞る除外を足さない**(既定の `-- . ':(exclude)…'` は doc を含む)。code だけ見ると混在 PR(code + doc)の doc 半分を丸ごと見逃す(本スキルが実際に踏んだ穴)。
- `softExcludePaths`・ブランド/アイコン/文言・案件機能 は除外。残った**テンプレ所有の共有コードの乖離**が本命(`-` 行 = テンプレが持ち案件が欠く = 取りこぼしの典型)。
- **不審な差分は念入りに**: `git log --oneline -- <file>` でテンプレ側の経緯を辿り、どの PR/コミットを取りこぼしたか特定する。
- 生成 `.d.ts` は `tsc --skipLibCheck false` で**握り潰された型エラー**が無いか確認(skipLibCheck が壊れた生成物を隠すことがある)。
- 見つかった取りこぼしは手順5〜6 と同様に取り込み、`appliedPrs` / `skippedPrs` / `deferredPrs` を更新する。

> **深さで掘る**: 「時間をかけてよい」より「**深く掘り下げ、最低でも N 件は探す**」と自己規定する方が取りこぼしを拾える(浅い『問題なし』で止めない)。`../line-miniapp-template` をチェックアウトしているなら `diff -r <案件dir> ../line-miniapp-template` でも同じ照合ができる。

### 8. push 前の整形(lint/format)

取り込み・手移植は **prettier 未整形のコード**を生みやすい(特に衝突を手移植した案件固有の `apps/web`)。**push / PR 作成の前に**整形する — [git-push.md](../../../docs/rules/refs/workflow/git-push.md)「push 前に `make fix`」がそのまま適用される(tsync は派生案件**自身**のブランチへの push なので対象。別 repo へ push する tpush の「対象外」には当たらない)。

```sh
make fix    # = pnpm run -r fix(各ワークスペースで eslint --fix + prettier --write)
git status  # 差分が出たら直前の取り込みコミットへ含める(--amend or 整形用に1コミット追加)
```

- `make fix` が直すのは**ワークスペース配下**(`apps/web`・`apps/api` 等)。CI の `Check format`(`pnpm run -r format`)も同じワークスペース単位なので、これで format 落ちは防げる。
- **一括同期した `docs/rules`・`.claude` 等は `make fix` の対象外**だが、CI の format も対象外なので CI は落ちない(テンプレ側も整形していない)。root で `prettier --check .` を回す運用の案件だけ、別途 root で `prettier --write .` を当てる。

### 9. 後片付け / レポート

同期作業が終わったら **`template` リモートを削除**し、派生 repo に `template/*` の remote-tracking ブランチを残さない。次回 `/tsync` が手順2で再追加・再 fetch する。ウォーターマーク(`lastSyncedSha`)は `.template-sync.json` 側にあるので、リモートを消しても次回 fetch で `template/<defaultBranch>` の祖先として復元され支障ない。

```sh
git remote remove template 2>/dev/null || true
```

最後に必ずサマリを出す:

- 取り込み N件 / 既存=applied・今回作業なし E件 / 見送り M件 / 保留 P件(deferredPrs・次回も再掲)/ 手移植して統合 K件 / 未判断 L件(=ウォーターマーク未到達分)
- 変更が及んだ領域と次の検証(`pnpm install` の要否、`make` / テスト実行、lock 再生成など)
- PR を作る場合の差分概要(`infrastructures/**` を取り込んだ場合は通常 PR と infra 別 PR の2本。infra PR は単独レビュー・デプロイ後マージ)

## メモ

- このスキル自体もテンプレの `.claude/skills/` に置かれ、`tsync` 経由で各案件へ配布・更新される。
- 本スキルは優先度判定で `docs/rules/refs/workflow/template-follow.md`(`.claude/` の**外**)に依存する。配布・コピー時は**このルーブリック doc も併せて同期**すること。doc が無い環境(例: `.claude/` だけコピーした検証)では同 doc の3段階に準じて判定する: **優先度** must=バグ・セキュリティ・壊れる互換性/共通基盤 / recommended=共通基盤の改善・リファクタ・型強化・docs・非セキュリティ依存・インフラ結合バージョン更新(タイミング/検証調整が要れば `follow:coordinate` 併記) / optional=デモ・案件固有・実験的。**softExclude の取り込み判断**は手順3.5 の分類(構造/内部リファクタ系=取り込み推奨 / コンテンツ・画面仕様系=見送り)に従う。
- 通知の自動化(スケジュール実行でテンプレ更新を検知し Issue/Slack 通知)や、テンプレ PR への優先度ラベル運用は本スキルとは別レイヤー。導入済みなら手順3・5の判断がより正確になる。
