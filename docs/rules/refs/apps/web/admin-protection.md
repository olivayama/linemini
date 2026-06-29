# 管理画面の Cookie ベースアクティベーション

## 目的

セキュリティ監査の "Administrative Login Exposure" 指摘回避を目的とした obscurity 対策。アクティベーションキーを知らない第三者からは `/admin/*` が全て 404 に見える状態を作る。

- 本質的な保護ではない。認証側で担保する
- リポジトリが private であることが前提。public 案件は IP allowlist 等別手段を採る

## 仕組み

1. `https://example.com/admin?__admin-key={key}` でアクティベーション → Cookie 発行 + クエリ除去リダイレクト
2. 以降 `/admin/*` への全リクエストは `middleware` で Cookie を検証
3. 正しい Cookie が無ければ `/not-found` に rewrite

## キー定義

`apps/web/app/config.server.ts` の `adminUrlKeyByEnv` map に直書きする

```ts
// apps/web/app/config.server.ts
import 'server-only'

import { type AppEnv, appConfig } from '@/app/config'

const adminUrlKeyByEnv: Partial<Record<AppEnv, string>> = {
  // stg: 'xxxxxxxxxxxxxxxx',
  // prd: 'xxxxxxxxxxxxxxxx',
}

export const appConfigServer = {
  adminUrlKey: adminUrlKeyByEnv[appConfig.appEnv],
} as const
```

- **未設定 = 保護なし**（デフォルト。`/admin/*` がそのまま動作）
- 監査対応案件のみ対象 env のキーを設定する
- 通常 `localhost` / `dev` / `snd` は未設定のまま。`stg` / `prd` のみ設定する運用を推奨
- キーを設定した env はリポジトリ直下の `README.md` の Admin セクションのアクティベーション URL (`?__admin-key={key}` 付き) を更新する

### `config.server.ts` (server-only) に置く理由

`apps/web/app/config.ts` はクライアントコンポーネントから import されるため、リテラル直書きの値はクライアントバンドルに含まれ、ブラウザ DevTools から参照可能になる。`adminUrlKeyByEnv` を `'use client'` 配下から到達可能な場所に置くと obscurity 効果が破綻するため、`import 'server-only'` 付きの別モジュール (`config.server.ts`) に分離する。`server-only` パッケージはクライアントコンポーネントからの import をビルドエラーで構造的に防ぐ。

## キーの形式

- 正規表現: `^[a-z0-9]{16}$`
- 生成: `openssl rand -hex 8`
- `'admin'` 文字列を含めない（監査再指摘リスク回避。NG: `admin-xxx`）

## 環境変数化しない理由

git 管理外の手動セットアップ（`.env.local` への書き込み等）を増やさない方針。本対応は cosmetic 対策なので、ローカル開発体験を損なってまで隔離する必要がない。`.env.example` / `.env.local` への記載も不要。

ここでいう「隔離」は env var 化 + 手動セットアップフローを指す。値そのものを `'use client'` 配下から見えなくするための分離は `config.server.ts` (server-only モジュール) で構造的に実現しており、ローカルセットアップは増えない。

## Cookie 仕様

- 名前: `__admin_key`
- 値: キーそのもの（ローテーション時に旧 Cookie が値不一致で自動的に拒否される）
- 属性: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/admin`
- 有効期限: 1 年 (`maxAge: 60 * 60 * 24 * 365`)。obscurity 用途で本質認証ではないため、ログインセッション同等の長期化で運用負荷を下げる方針

## Referer 漏洩対策

`next.config.mjs` の `headers()` で `/admin/:path*` に `Referrer-Policy: same-origin` を設定する。初回アクティベーション URL から外部リンクへ遷移してもキーが Referer に乗らないようにする。

## 実装ファイル

- `apps/web/app/config.server.ts` — キー定義（server-only モジュール）
- `apps/web/middleware.ts` — アクティベーション + 検証
- `apps/web/next.config.mjs` — Referrer-Policy 設定
- `README.md` — キーを設定した env のアクティベーション URL を Admin セクションに追記

## ローテーション

- 案件期間中は固定
- 漏洩疑いがあれば即時変更（`config.server.ts` を編集 → コミット → 再デプロイ）
- 旧 Cookie は値不一致で自動的に拒否される

## やってはいけないこと

- キーの環境変数化（運用負荷増で見合わない）
- `'admin'` を含むキー（監査再指摘リスク）
- `/admin` ハードコードのリファクタ（middleware で吸収する設計なのでリファクタ不要）
- 監査対応案件以外でキーを設定（開発体験を損なう）
