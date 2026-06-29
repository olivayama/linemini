# ルール

このファイルは `docs/rules/` 配下にあるルールのインデックスである。
各項目の「参照条件」に該当する作業を行う際、対応するリンク先のドキュメントを読み込み、その内容に従う。

## バックエンド (apps/api/, proto/, migrations/)

### サービス層 (apps/api/services/)

- 参照条件: RPC ハンドラ・サービスクラスを追加・編集する際
- リンク: [refs/apps/api/services.md](./refs/apps/api/services.md)

### ドメイン層 (apps/api/domain/)

- 参照条件: 集約・ドメイン関数を追加・編集する際
- リンク: [refs/apps/api/domain.md](./refs/apps/api/domain.md)

### リポジトリ層 (apps/api/repositories/)

- 参照条件: repository やそのインターフェースを追加・編集する際
- リンク: [refs/apps/api/repositories.md](./refs/apps/api/repositories.md)

### proto 契約 (proto/)

- 参照条件: proto 定義を追加・編集する際
- リンク: [refs/proto.md](./refs/proto.md)

### マイグレーション / DB スキーマ (migrations/)

- 参照条件: マイグレーションや DB スキーマを追加・編集する際
- リンク: [refs/migrations.md](./refs/migrations.md)

### テスト方針

- 参照条件: `apps/api/` の `services/` / `domain/` / `repositories/` / `stdutils/` のコードを追加・修正する際（テスト追加・更新の判断を含む）
- リンク: [refs/apps/api/testing.md](./refs/apps/api/testing.md)

## フロントエンド (apps/web/)

### コード配置

- 参照条件: `apps/web` で関数・モジュール・hook を `stdutils/` / `utils/` / `hooks/` / `app/` のどこに置くか判断する際
- リンク: [refs/apps/web/code-placement.md](./refs/apps/web/code-placement.md)

### スタイリング

#### スタイリング概要

- 参照条件: スタイリング全体の方針を確認する際
- リンク: [refs/apps/web/styling/overview.md](./refs/apps/web/styling/overview.md)

#### 色

- 参照条件: 色を定義・使用する際
- リンク: [refs/apps/web/styling/color.md](./refs/apps/web/styling/color.md)

#### フォント

- 参照条件: フォントを定義・使用する際
- リンク: [refs/apps/web/styling/font.md](./refs/apps/web/styling/font.md)

### コンポーネント

#### 配置

- 参照条件: コンポーネントを新規作成する際(`components/ui/` に置くか、その外の `components/` 配下に置くか判断する際)
- リンク: [refs/apps/web/components/placement.md](./refs/apps/web/components/placement.md)

#### Button

- 参照条件: Button を使用する際
- リンク: [refs/apps/web/components/button.md](./refs/apps/web/components/button.md)

#### Icon

- 参照条件: Icon を使用する際
- リンク: [refs/apps/web/components/icon.md](./refs/apps/web/components/icon.md)

#### Image

- 参照条件: Image を使用する際
- リンク: [refs/apps/web/components/image.md](./refs/apps/web/components/image.md)

#### DataTable(列定義)

- 参照条件: DataTable の列(`ColumnDef`)を定義する際
- リンク: [refs/apps/web/components/data-table.md](./refs/apps/web/components/data-table.md)

### LIFF

#### LIFF API の利用

- 参照条件: LIFF SDK の API を使う際
- リンク: [refs/apps/web/liff.md](./refs/apps/web/liff.md)

### サービス呼び出しの import

#### 生成 connectquery の import 元

- 参照条件: apps/web から API サービスの RPC を import する際
- リンク: [refs/apps/web/service-import.md](./refs/apps/web/service-import.md)

### エラー表示

#### ユーザー向けエラー表示

- 参照条件: エラーをエンドユーザーに表示する際
- リンク: [refs/apps/web/error-display.md](./refs/apps/web/error-display.md)

### 管理画面 (apps/web/app/admin/)

#### 画面実装(一覧・詳細・フォーム)

- 参照条件: 管理画面フロントの画面(一覧・詳細・フォーム等)を追加・編集する際
- リンク: [refs/apps/web/admin.md](./refs/apps/web/admin.md)

#### Cookie ベースアクティベーション

- 参照条件: 保護方針を確認・変更する際
- リンク: [refs/apps/web/admin-protection.md](./refs/apps/web/admin-protection.md)

### テスト方針

- 参照条件: `apps/web/` の `stdutils/` / `utils/` / `hooks/` / `components/` のコード、または `app/` に colocation した業務ロジック（behavior contract を持つもの）を追加・修正する際（テスト追加・更新の判断を含む）
- リンク: [refs/apps/web/testing.md](./refs/apps/web/testing.md)

## 開発・運用

### Git 操作

#### push 前の整形

- 参照条件: `git push` を実行する際
- リンク: [refs/workflow/git-push.md](./refs/workflow/git-push.md)

#### PR 本文・タイトルの整合

- 参照条件: PR に紐づくブランチへ `git push` する際
- リンク: [refs/workflow/pr-body-sync.md](./refs/workflow/pr-body-sync.md)

### テンプレート追従

#### follow ラベルと tsync

- 参照条件: テンプレリポジトリ本体で PR を作成する際(follow ラベルを自動付与する)、またはテンプレの更新を取り込む際
- リンク: [refs/workflow/template-follow.md](./refs/workflow/template-follow.md)

### ルール・ドキュメント作成

#### ルールの書き方

- 参照条件: `docs/rules/` 配下のルールを追加・編集する際
- リンク: [refs/workflow/rule.md](./refs/workflow/rule.md)

#### スキル (SKILL.md) の書き方

- 参照条件: `.claude/skills/` 配下の SKILL.md を追加・編集する際
- リンク: [refs/workflow/skill-writing.md](./refs/workflow/skill-writing.md)

### エージェント運用

#### 作業領域とナレッジ運用

- 参照条件: agent がローカルに作業ファイルを保存する際、横断ナレッジを残す/参照する際、または過去の知見・解決策を引きたい際
- リンク: [refs/workflow/agent-storage.md](./refs/workflow/agent-storage.md)
