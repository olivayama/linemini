---
name: aitest
description: テスト項目スプレッドシートの各項目をソースコード(+可能なら実行)と突き合わせ、「aitest」列に pass/fail(fail は理由・該当箇所も)を記入する
disable-model-invocation: true
---

# aitest (テスト項目シート × ソースコード突き合わせ)

テスト項目スプレッドシートの URL を受け取り、各項目の**期待結果**を**ソースコード(+可能なら実行)**と突き合わせて検証し、シートの **「aitest」列** に `pass` / `fail` / `要手動` を記入する。シートの読み書きは **Google Workspace CLI(`gws`)** を Bash 経由で使う(認証とコマンドが分離しており**認証方式に依存しない**。認証は [setup.md](./setup.md))。

**鉄則:**

- 静的なコード読解を基本に、自動テスト/コマンドで裏取りできるものは実行。**確証できないものは推測で pass/fail にせず `要手動`**。
- 書き込みは **aitest 列のみ**・他セルは触らない。**書き込み前に必ず一覧提示して承認を取る(★停止)**。
- `fail` には理由 + 期待と実際の差 + 該当 `file:line` を必ず添える。**直す向き(実装を直すのか / テスト項目=期待結果が古いのか)も明記**(テスト項目側が誤りのこともある)。
- 検証で破壊的コマンドや本番への書き込みはしない。シークレット(トークン/鍵)をログに残さない。

## トリガー

- `/aitest <URL>` … gid のタブを対象に、空欄の aitest 列を埋める(既定)。
- `/aitest <URL> <絞り込み(自然言語)>` … 例:
  - タブ: `devシートだけ` / `全シート`
  - 大項目: `大項目がゲーム画面のものだけ`
  - ステータス: `空欄のみ`(既定) / `fail のものだけ再判定` / `全件上書き`
  - 行範囲: `10-25 行目`(複合可)
- `/aitest <URL> e2e` … 静的の後に **e2e 動的裏取り**も実施(手順7)。`e2eのみ` なら静的判定(手順4)を飛ばし e2e だけ(後から e2e だけ頼む用)。

URL から spreadsheetId(`/d/<ID>/`)と gid(`#gid=<n>`)を取り出す。

## 前提条件

- 検証対象のソースが現在の作業ディレクトリにある。
- `gws` 導入済み・認証済み([setup.md](./setup.md))。実行者の Google アカウントが対象シートの編集者であること。

## 手順

### 0. プリフライト

`gws auth status` の `auth_method` が `none`(または `gws` 未導入)なら [setup.md](./setup.md) を案内して停止(勝手に install/login しない)。

### 1. シート構造の取得

```sh
gws sheets spreadsheets get --params '{"spreadsheetId":"<ID>","fields":"sheets.properties(sheetId,title,index,gridProperties)"}'
```

- gid と一致する `sheetId` のタイトルが対象タブ(以降 `<TAB>`)。
- `frozenRowCount` / `frozenColumnCount` はヘッダ範囲と仕様列の手がかり(例: frozenRowCount=3 → 見出しは行3・データは行4〜、frozenColumnCount=7 → 左7列が仕様列)。
- まず**ヘッダ行だけは使用範囲の全列を読む**(`'<TAB>'!A<ヘッダ行>:<最終列><ヘッダ行>`)。手順2 の列検出・aitest 列の挿入位置判定(`iOS/Android/確認日` の最後尾=`備考` 等の手前)には**期待値列より右のヘッダ名も要る**ため。
- **データ本体**は判定に要る列に絞ってよい(context 節約: **仕様列=大項目〜期待値 と既存 aitest 列**。テスター結果列は読まない)。**タブ名は単一引用符で囲む(日本語でも必要)**:

  ```sh
  gws sheets +read --spreadsheet <ID> --range "'<TAB>'!A<ヘッダ行>:<期待値の列><最終行>" --format json   # aitest 列が別位置なら別途読む
  ```

  - `+read` の JSON は行番号を持たない → **読み取り開始行 + 配列 index** で行を対応付ける。
  - gws は `Using keyring backend: keyring` を出力する → 解析時は無視。

### 2. 列検出と aitest 列の用意

案件ごとにフォーマットが違う前提で、**固定の列位置を仮定せずヘッダから検出**する。

- 期待結果・大項目・手順 などの列を同義語で照合(`期待値`/`期待結果`、`大項目`/`テスト対象機能`、`確認手順`/`手順` 等)。
- **記入先(aitest)は表記ゆれを正規化して察する**: 正規化(小文字化・全角半角統一・空白/記号除去)後に **`aitest` / `aiテスト` を連続トークンとして含む**(`ai` の直後が `test`/`テスト`)もの(`AIテスト`/`AI テスト`/`AI test`/`aitest` 等)。`ai` を含む別語＋`test`(例「fail テスト」「main test」)に誤マッチさせない。
- 無ければ**列を追加**。**置き場所**: aitest も結果列の一種なので、**人間テスター結果記入列(iOS/Android/確認日 等)の最後尾**に挿入すると結果列が並んで見やすい(`備考`/`確認者` 等のメタ・フリーテキスト列の手前。`insertDimension`)。該当列が無ければ**末尾に追加**(`appendDimension`、他列をずらさない)。ヘッダ名の既定は `aitest`(見出しは**検出したラベル行**に書く。行1とは限らない=複数行ヘッダなら下の行)。空き列が足りなければ拡張(`<gid>` は手順1の `sheetId`):

  ```sh
  gws sheets spreadsheets batchUpdate --params "{\"spreadsheetId\":\"$ID\"}" \
    --json '{"requests":[{"appendDimension":{"sheetId":<gid>,"dimension":"COLUMNS","length":1}}]}'
  ```

  特定位置に差し込む場合(上記の `備考` 手前など)は `insertDimension`(他列が右にずれる旨を一言添えて ★確認。`<i>` は 0-based):

  ```sh
  ... --json '{"requests":[{"insertDimension":{"range":{"sheetId":<gid>,"dimension":"COLUMNS","startIndex":<i>,"endIndex":<i+1>},"inheritFromBefore":false}}]}'   # false=右(挿入位置の元列=備考側)を継ぐ→左の日付列(確認日)の数値フォーマット継承を避ける
  ```

- **列を追加したら継承背景をクリアする**(`insertDimension`/`appendDimension` は隣列=`備考` 等の塗りを継ぐ)。本文の既定色(通常 白)にデータ行範囲を揃える(ヘッダ行は他列と揃うので触らない):

  ```sh
  # <r1>/<rN>=データ先頭/末尾行(0-based index・end は排他), <c>=aitest列(0-based)
  ... --json '{"requests":[{"repeatCell":{"range":{"sheetId":<gid>,"startRowIndex":<r1>,"endRowIndex":<rN>,"startColumnIndex":<c>,"endColumnIndex":<c+1>},"cell":{"userEnteredFormat":{"backgroundColor":{"red":1,"green":1,"blue":1}}},"fields":"userEnteredFormat.backgroundColor"}}]}'
  ```

- 列検出が曖昧、または列を追加する場合は、位置・ヘッダ名を提示して確認(★停止)。

### 3. スコープの絞り込み

トリガーの自然言語を解釈して対象データ行を絞る:

- タブ: 既定は gid のタブ。`全シート`等なら各タブを順に処理。
- 大項目: 値が一致(部分一致可)する行のみ。
- ステータス(既存 aitest 列で判定): `空欄のみ`(**既定**) / `fail のものだけ再判定`(値が `fail` で始まる行) / `全件上書き`。
  **既定(空欄のみ)を含めステータスで絞るときは、既存 aitest 列の値読みが必須**(空/非空の判定に要る)。手順1 のデータ本体は仕様列までなので、**aitest 列も併せて読む**。
- 行範囲指定があればその範囲。見出し・空行・メタ行は常に対象外。
- 確定した対象(タブ / 件数 / 条件)を一言提示してから進む。

### 4. 検証 → 記入値

**4a. トリアージ**: 期待値の文言で各行を「静的判定可能」か「要手動確定」に粗振り分けする。

- **要手動確定**(深掘りせず一括で `要手動: 理由`): Figma/デザイン照合・実機操作・タップ/スワイプ感・アニメーション・BGM 再生/停止・GA/計測・管理画面 CSV・目視 など。
- **静的判定可能**(深掘り対象): 画面遷移/ルーティング・分岐・アンロック/カウント等のロジック・入力制限値・固定文言/テンプレート など。
- 要手動が大半の大項目は件数だけ報告し、ロジック系に労力を集中する。

**4b. 深掘り検証**: 静的判定可能な行について、期待結果とソースを突き合わせ(`画面番号`(U01 等)/パス列を該当画面・ルート特定の手がかりに)、鉄則どおり `pass` / `fail: <理由+差分+file:line>` / `要手動: <理由>` を決める。

**4c. 大量で context が尽きる場合はサブエージェントに分配**(小規模ならインラインのまま):

- トリアージ後の**静的判定対象だけ**を、**大項目/チャンク単位**でサブエージェントに割り当てる(同一グループは同じソースを参照するので、まとめると読み直し・コールドスタートが減る。`要手動確定` にはエージェントを使わない)。
- 各サブエージェントに渡す: 担当の項目群(行 / 項目 / 期待結果)+ **ソースのヒント**(画面番号/パス → 該当ディレクトリ等。親が 1 回だけ作る地図。**画面↔ルート対応や案件固有の用語(例「LP画面」=実体ルート)も入れると子の誤検出が減る**)+ 判定ルーブリック(鉄則)。
- サブエージェントは **`{行, 判定, 理由, file:line}` を返すだけ**。**シートに書かない・ユーザー確認も取らない**(read/judge 専用)。
- 親が結果を集約し、手順 5(★停止 → 書き込み)を**親が 1 回だけ**実施する(確認・書き込みを親に一本化 = 同時書き込み衝突を回避し ★停止を維持)。集約時、**子の判定(特に `fail`)は文脈不足による誤検出があり得るので親がクロスレビューする**。

### 5. 確認(★停止) → 書き込み

記入予定を一覧(行 / 項目 / 判定 / 根拠)で提示し fail・要手動を強調。承認後に書く。**★レビューで人が判定を上書き/格上げした項目は、理由に「aitest 検知 → 人が判定」と出所を残す**(自動検知と人の判断を混同させない)。
**書き込みは対象セルだけを更新する**(既定 `空欄のみ`/絞り込みは対象行が飛び飛びのため): **`values batchUpdate` の `data[]`(レンジごと)** か `batchUpdate` の `updateCells` で**対象セルのみ**書き、スキップ行(=既記入セル)を空で上書きしない。`data[]` が多い/タブ名に空白がある時は **JSON をファイルに書いて `--json "$(cat payload.json)"`** が安全:

```json
// payload.json — タブ名は range 内で単一引用符
{"valueInputOption":"USER_ENTERED","data":[
  {"range":"'<TAB>'!<COL><r1>","values":[["pass"]]},
  {"range":"'<TAB>'!<COL><r2>","values":[["fail: ..."]]}
]}
```

```sh
gws sheets spreadsheets values batchUpdate --params "{\"spreadsheetId\":\"$ID\"}" --json "$(cat payload.json)"
```

- **新規列で全データ行が連続して対象**(または `全件上書き`)= 連続レンジが飛びなく埋まる時**だけ**、1 回の `values update` でまとめて書ける(`values` は対象行と**同じ順序・同じ件数**の 1 列、対象外行を空で上書きしない。エスケープ確定形: タブ名は単一引用符・`--params` はダブルクオート+`\"`・レンジは変数):

  ```sh
  ID=<ID>
  RANGE="'<TAB>'!<COL><r1>:<COL><rN>"     # COL=aitest列, r1=データ先頭行
  PARAMS="{\"spreadsheetId\":\"$ID\",\"range\":\"$RANGE\",\"valueInputOption\":\"USER_ENTERED\"}"
  gws sheets spreadsheets values update --params "$PARAMS" --json '{"values":[["pass"],["fail: ..."],["要手動: ..."]]}'
  ```

- `--dry-run` で事前検証、読み戻しは `gws sheets +read --spreadsheet "$ID" --range "$RANGE" --format json`。
- **書き込み後、verdict を色分けする(毎回・自動)**: aitest 列に条件付き書式を設定して可読性を上げる。**優先順に4ルール**(緑は青より先=具体的なルールを上に):
  1. `fail` → 薄赤 `{0.96,0.80,0.80}`(`TEXT_STARTS_WITH "fail"`)
  2. **pass だが要手動の残りあり**(e2e でパスしたが手動確認も要る箇所)→ 薄緑 `{0.85,0.92,0.83}`(`CUSTOM_FORMULA`: `pass` で始まり かつ `要手動` を含む)
  3. `pass`/`pass(e2e)`(手動残り無し)→ 薄青 `{0.81,0.89,0.95}`(`TEXT_STARTS_WITH "pass"`)
  4. `要手動` → 薄黄 `{1,0.95,0.80}`(`TEXT_STARTS_WITH "要手動"`)

  **初回のみ**設定し既存の同等ルールがあれば重複追加しない。**シート既存の条件付き書式(Priority 色分け等)は消さない**——自分が追加した aitest 列のルールだけ入れ替える(`get` の `conditionalFormats` で自分の index を特定し、`deleteConditionalFormatRule` は自分の index のみ・高い index から)。緑(`CUSTOM_FORMULA`)の例(`<COL><r1>`=データ先頭セル 例 `M5`):

  ```sh
  ... --json '{"requests":[{"addConditionalFormatRule":{"index":1,"rule":{
    "ranges":[{"sheetId":<gid>,"startRowIndex":<r1>,"endRowIndex":<rN>,"startColumnIndex":<c>,"endColumnIndex":<c+1>}],
    "booleanRule":{"condition":{"type":"CUSTOM_FORMULA","values":[{"userEnteredValue":"=AND(LEFT($<COL><r1>,4)=\"pass\",REGEXMATCH($<COL><r1>,\"要手動\"))"}]},
    "format":{"backgroundColor":{"red":0.85,"green":0.92,"blue":0.83}}}}}}]}'
  # fail=赤{0.96,0.80,0.80} / pass=青{0.81,0.89,0.95} / 要手動=黄{1,0.95,0.80} は TEXT_STARTS_WITH で同形追加
  ```

### 6. レポート

タブ・フィルタ条件つきで `pass`/`fail`/`要手動` の件数、`fail` と `要手動` の一覧(根拠つき)、書き込んだレンジ。

### 7. (オプション) e2e 動的裏取り

`/aitest <URL>` は静的のみ。**完了後に「e2e で裏取りできる項目が N 件ある。回す?」と尋ねてから**実施する(問答無用で走らせない)。`e2e` 指定なら続けて、`e2eのみ` 指定なら**手順4(静的深掘り)だけ飛ばす**(手順0〜3=準備・手順5=★停止と書き込み・手順6=レポートは実施。aitest 列へ書くには手順1の読み・手順2の列用意・手順5の安全則がここでも要るため)。方針は「**DOM 系を自動で裏取り＋人が最後に確認**」。

- **前提**: 案件に dev 環境(README の dev/LIFF URL)。**e2e 基盤(`apps/web/e2e`)が導入済み**であること(`@playwright/test` + `e2e`/`e2e:auth` スクリプト)。**未導入の案件はまず e2e 基盤を `tsync` で取り込む**(取り込めない/不要なら e2e は skip し静的のみ)。storageState が無ければ `pnpm --filter @apps/web e2e:auth` を案内(人が 1 回ログイン)。dev が無い案件は e2e 不可 → スキップ通知。詳細 [apps/web/e2e/README.md](../../../apps/web/e2e/README.md)。
- **対象**: DOM で裏取りできる項目だけ(画面遷移/URL・ボタン状態・入力制限・表示有無)。ネイティブ(シェア/権限/友だち)・Figma 視覚・GA・canvas は対象外(`要手動` のまま)。
- **駆動(ephemeral)**: 対象行ごとに該当画面のコードを読み**セレクタ/操作/アサーションを特定** → **使い捨て Playwright スクリプト**(案件の node_modules を解決できる場所に置く)を生成し、storageState(`apps/web/e2e/.auth/user.json`)で headless 実行 → `{行, 判定, 理由}` を回収し**スクリプトは削除**(spec.ts は残さない)。**期待結果そのもの**(記載の URL/文言)をアサートし、確信を持って組めない項目は `要手動` に倒す(嘘 pass にしない)。dev のみ・実シェア送信や本番への破壊的操作はしない。
- **記入(aitest 列・★停止後)**: 対象行は e2e 結果で上書きし**出自タグ**を付ける(`pass(e2e)` / `fail(e2e): 理由`)。**DOM は裏取りできたが同じ項目に手動確認の残り(音/視覚/合成の見た目 等)がある場合は、`pass(e2e)` の理由に `…は要手動` と残す**(例 `pass(e2e): アイコン切替を確認 ※音の再生は要手動`)= 手順5 の緑ルールが拾う。静的のみの行はそのまま。**静的と e2e が食い違う行は、★提示で強調するだけでなくセル本文にも明記する**(上書きで静的の判定が消え、後からシートだけ見ると食い違いと分からなくなるため)。例 `fail(e2e): <理由> ※静的=pass と食い違い(コードと実挙動のズレ・要確認)`、逆向きは `pass(e2e): <理由> ※静的=fail と食い違い`。書き込みは手順 5 の安全則どおり親が 1 回。

## メモ

- **テスター向けの使い方・初期設定**は Notion トリセツ参照: [aitest / e2e — テスト項目の自動チェック](https://app.notion.com/p/optincubate/aitest-e2e-3745fe8d887e81c087d4d8be5bd2e919)。
- gws 書き込みが使えない時のフォールバック: 記入値を行番号つき表(TSV/Markdown)で出力し手動貼り付け。
- テンプレの `.claude/skills/` に置かれ `tsync` で各案件へ配布(`setup.md` 同梱)。
- 実項目は実機/Figma 照合/GA/管理画面 CSV など手動前提が多く、静的に断定できるのはロジック/遷移/制限値など一部。残りは `要手動` になる。
- `要手動` のうち実機遷移/入力/ボタン状態などの動的検証は、E2E テスト基盤 [apps/web/e2e](../../../apps/web/e2e/README.md) で実 pass/fail にできる(静的×動的のクロスレビュー)。
- テスト項目シート自体は上流で自動生成され**形式が変わりうる**前提。固定列を仮定せず手順 2 の検出に頼る。
