# aitest セットアップ(gws / Google Workspace CLI)

`aitest` スキルは **Google Workspace CLI(`gws`)** 経由でテスト項目スプレッドシートを読み書きする。
本書はその認証セットアップ手順。**実行モデルは「各QA/開発者が自分のPCで実行」**を前提とし、認証は **OAuth(方式A)** を標準とする。

> 使い方・初期設定の全体像(テスター向け)は Notion トリセツ参照: [aitest / e2e — テスト項目の自動チェック](https://app.notion.com/p/optincubate/aitest-e2e-3745fe8d887e81c087d4d8be5bd2e919)。本書は gws 認証の詳細手順。

> gws は「認証」と「コマンド」が分離している。スキル本体は `gws sheets ...` を叩くだけで**認証方式に依存しない**。
> 本書のとおり認証を済ませておけば、スキルはそのまま動く。

## 役割分担(標準化)

| 区分 | 誰が | 何を | 頻度 |
| --- | --- | --- | --- |
| 管理者セットアップ | 1人 | GCP プロジェクト・Sheets API 有効化・OAuth 同意画面(**Internal**)・**OAuth クライアント 1 個**作成 → `client_secret.json` を配布 | 一度だけ |
| 操作者セットアップ | 各人 | `gws` 導入 → 配布された `client_secret.json` 配置 → `gws auth login` → 対象シートの**編集権** | 各人 1 回 |

操作者は GCP コンソールを触らない(クライアント作成は管理者が 1 回だけ)。

---

## A. 管理者セットアップ(一度だけ)

1. [GCP コンソール](https://console.cloud.google.com/) でプロジェクトを作成 / 選択。
2. **APIとサービス → ライブラリ** で **Google Sheets API** を有効化(必要なら Drive API も)。
3. **OAuth 同意画面** を作成:
   - **User Type = Internal** を選ぶ(組織 `@opt.ne.jp` 等の Google Workspace 前提)。
     - Internal だと **テストユーザー登録が不要**、かつ **リフレッシュトークンの 7 日失効が無い**(運用が安定する)。
     - Workspace でない / Internal を選べない場合は External で作成し、**テストユーザー**に各操作者を追加(この場合 7 日でトークン失効 → 再 `gws auth login` が必要)。
4. **認証情報 → 認証情報を作成 → OAuth クライアント ID**:
   - アプリの種類 = **デスクトップアプリ** → 作成 → **JSON をダウンロード**。
5. ダウンロードした JSON を **`client_secret.json`** として操作者に配布する。

### client_secret.json の配布について

- これは「**デスクトップアプリ**用」OAuth クライアントで、Google 自身が「インストール型アプリのシークレットは秘密として扱えない」としている。**実際のアクセス制御は各人の OAuth ログイン + 同意 + 本人のシート編集権**で担保されるため、SA 鍵(無期限・高権限)に比べ機微度は低い。
- 置き場所は `~/.config/gws/`(ホーム配下)で**リポジトリ外**。git コミット事故のリスクは基本ない(repo にコピーしない限り)。ただし公開はしない。
- 配布手段(おすすめ順):
  1. **パスワード/シークレットマネージャ**(1Password・Bitwarden 等)にセキュアノートとして JSON を保存 → 各自取り出す。**推奨**。
  2. **アクセス制限付き社内ストレージ**(チーム限定 Drive・プライベート Slack・社内 Wiki)。機微度が低いので実務上これで十分。 ← **本チームの標準**
  3. **ファイルを配らず環境変数で渡す**(B-2 の代替参照): `GOOGLE_WORKSPACE_CLI_CLIENT_ID` / `GOOGLE_WORKSPACE_CLI_CLIENT_SECRET` の 2 値だけ配る。
  4. **配らない**: 各操作者が自分で OAuth クライアントを作る(配布ゼロだが各人が GCP コンソールを触る)。
- **やってはいけない**: repo にコミット / 公開チャンネル・社外メールで共有。

---

## B. 操作者セットアップ(各人 1 回)

1. **gws を導入**(Node.js/npm が必要):

   ```sh
   npm install -g @googleworkspace/cli
   gws --version
   ```

2. **`client_secret.json` を取得**して配置する。

   - 取得元(本チームの標準保管場所): **Google Drive の `QC / ツール / aitest_認証情報 / client_secret.json`**([ツールフォルダ](https://drive.google.com/drive/folders/1psS2oMG78C_BXqt__tdb7O-ft5plBZ8N) 配下に `aitest_認証情報` を作成)。アクセスは QC/開発チームに限定する。
   - 配置:

   ```sh
   mkdir -p ~/.config/gws
   cp /path/to/client_secret.json ~/.config/gws/client_secret.json
   ```

   **代替(ファイルを置かず環境変数で渡す場合)**: `client_secret.json` の代わりに以下を設定してもよい(shell rc 等に):

   ```sh
   export GOOGLE_WORKSPACE_CLI_CLIENT_ID=xxxx.apps.googleusercontent.com
   export GOOGLE_WORKSPACE_CLI_CLIENT_SECRET=yyyy
   ```

3. **ログイン**(ブラウザが開く → 自分の Google アカウントで許可):

   ```sh
   gws auth login -s sheets
   ```

   - `-s sheets` で Sheets スコープに限定(Testing モードのスコープ上限回避にも有効)。

4. **確認**:

   ```sh
   gws auth status      # auth_method が none 以外になっていれば OK
   ```

5. **対象スプレッドシートの編集権**: OAuth は「ログインした本人」として動くため、
   **自分の Google アカウントが対象シートの編集者**である必要がある(QA 担当なら通常は既に編集可)。

---

## トラブルシュート

- `auth_method: none` のまま → `client_secret.json` の配置場所(`~/.config/gws/`)と `gws auth login` の完了を確認。
- 毎週ログインを求められる → 同意画面が **External + Testing** になっている(7 日失効)。**Internal** で作り直すか本番公開する。
- 書き込みが 403 → 自分のアカウントに**対象シートの編集権が無い**。共有設定を確認。
- `gws` が見つからない(asdf 等) → `asdf reshim nodejs` 後に再確認。
- リポジトリ外で `No version is set for command gws` と出る → asdf のグローバル既定 node が無い。`asdf global nodejs <ver>`(例 `20.17.0`)を設定するとどのディレクトリでも `gws` が動く(リポジトリ内は `.tool-versions` で解決されるため動く)。

---

## 将来: 中央/CI 実行にする場合(サービスアカウント プロファイル)

「各自ローカル」ではなく **1 か所(CI / 共有サーバー / bot)で一括実行**したくなった場合は、
OAuth ではなく **サービスアカウント(SA)** が向く(ログイン不要・headless・7 日失効なし)。

```sh
export GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE=/path/to/service-account.json
```

注意点:

- 対象シートを **SA のメール(`...@....iam.gserviceaccount.com`)に編集者で共有**する必要がある(新規シートごとに必要)。
- SA 鍵は**失効期限の無い高権限の秘密**。配布せず、実行ホスト 1 台に限定する。
- 組織ポリシーで **SA 鍵作成が禁止**されている場合がある(`iam.disableServiceAccountKeyCreation`)。

スキル本体はコマンドが認証非依存なので、**この環境変数を設定するだけ**で SA 実行に切り替わる(スキルの書き換え不要)。
