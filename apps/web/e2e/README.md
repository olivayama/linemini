# E2E (Playwright)

LIFF ミニアプリの**動的検証**(画面遷移・ボタン状態・入力制限 等)を Playwright で行うためのテスト基盤。
`aitest` スキル(静的検証, [.claude/skills/aitest](../../../.claude/skills/aitest/SKILL.md))の**動的レイヤー**に相当し、両者でクロスレビューできる。

## なぜ「ログイン1回 → 使い回し」なのか(重要)

LINE ログインを**毎回**行うと**異常ログイン判定**され、CAPTCHA が出て自動ログインが止まる。
そのため **人が稀に1回だけ手動ログインし、認証状態(storageState)を保存 → 以降のテストは
それを使い回して再ログインしない**設計にしている。`auth.setup.ts` はテストの依存にしておらず、
`pnpm e2e:auth` で明示実行したときだけ走る。

## 前提

- **dev 環境がある案件**で使う(LIFF ログインは dev ドメインに紐づくため)。
- dev URL / LIFF URL は **各案件リポジトリの README** に記載がある。環境変数で渡す。
- ブラウザ本体は未コミット。初回のみ `npx playwright install chromium`。

## 手順

```sh
# 0) 一度だけ: ブラウザ取得
npx playwright install chromium

# 1) 認証(稀に1回・手動): ブラウザが開くので LINE ログイン
E2E_LIFF_URL="https://liff.line.me/<liffId>/home" pnpm --filter @apps/web e2e:auth
#   → ログイン完了(/api/session=200)で e2e/.auth/user.json が保存される(= 認証情報。コミット禁止)

# 2) テスト実行(再ログインなし)
E2E_BASE_URL="https://www.dev.<project>.lineminiapps.com" pnpm --filter @apps/web e2e
```

storageState の期限が切れたら 1) を再実行する。

## 案件固有テストの置き場所

`example.spec.ts` は雛形(認証再利用の確認のみ)。
**各案件は自分の画面に合わせたテストを `e2e/*.spec.ts` に追加する**(テンプレには案件固有テストを入れない)。
テスト項目書との対応づけ(クロスレビュー)は `aitest` スキル側で扱う。

## 残る「要手動」

LINE ネイティブ(シェア/ターゲットピッカー/権限/友だち)・Figma 目視・BGM 実再生・canvas 演出は
ブラウザ自動化では確認できないため `要手動` のまま。
