import { defineConfig, devices } from '@playwright/test'

import { STORAGE_STATE } from './e2e/storage-state'

/**
 * E2E(Playwright)設定。LIFF ミニアプリの動的検証(画面遷移・ボタン状態・入力制限 等)用。
 *
 * LINE ログインを毎回行うと異常ログイン判定 → CAPTCHA で自動ログインが止まる。そのため
 * 「人が稀に1回だけ手動ログイン → storageState を保存 → 以降は使い回す(再ログインしない)」
 * 方式にしている。auth.setup はテストの依存にせず、`pnpm e2e:auth` で明示実行した時だけ走る。
 * 詳細は e2e/README.md。
 *
 * 案件ごとに dev URL が違うため、URL は環境変数で渡す(各案件 README 参照):
 *   E2E_BASE_URL  例: https://www.dev.<project>.lineminiapps.com   (テスト実行で使用)
 *   E2E_LIFF_URL  例: https://liff.line.me/<liffId>/home           (auth.setup でのみ使用)
 */
if (process.env.E2E_BASE_URL == null || process.env.E2E_BASE_URL === '') {
  // テスト実行(pnpm e2e)では必須。auth セットアップ(pnpm e2e:auth)では不要。
  console.warn('[e2e] E2E_BASE_URL 未設定: テスト実行時は相対 goto が失敗します(各案件の dev URL を渡す)')
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    // 手動ログイン用(headed で明示実行: pnpm e2e:auth)。テストの依存にはしない。
    { name: 'setup', testMatch: /.*\.setup\.ts$/ },
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts$/,
      // 保存済み認証状態を使い回す(= 再ログインしない)
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
    },
  ],
})
