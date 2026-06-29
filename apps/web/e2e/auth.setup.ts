import { test as setup } from '@playwright/test'

import { STORAGE_STATE } from './storage-state'

/**
 * 認証セットアップ(手動ログイン)。稀に1回だけ実行する:
 *
 *   E2E_LIFF_URL="https://liff.line.me/<liffId>/home" pnpm --filter @apps/web e2e:auth
 *
 * 開いたブラウザで LINE ログイン → サーバ側セッション(/api/session=200)が確立したら storageState を保存する。
 * 以降のテストはこの storageState を使い回し、再ログインしない(異常ログイン/CAPTCHA 回避)。
 * storageState は認証情報なのでコミットしない(.gitignore 済み)。期限切れ時に再実行する。
 */
setup('authenticate (manual LINE login)', async ({ page }) => {
  const liffUrl = process.env.E2E_LIFF_URL
  if (liffUrl == null || liffUrl === '') {
    throw new Error('E2E_LIFF_URL を指定してください(例: https://liff.line.me/<liffId>/home)')
  }
  setup.setTimeout(600_000) // 手動ログイン待ち(長め)

  await page.goto(liffUrl)
  // ログイン完了の判定: 「/mini に到達」だけでは不十分。LIFF 起動時に一瞬 /mini を通ってから
  // LINE ログインへ飛ぶ実装があり、未ログインで storageState を保存してしまう。そこで
  // 「アプリ origin で /api/session=200(= サーバ側セッション確立)」を主シグナルにして、
  // 手動ログインの時間を見越して長めにポーリングする。
  // ※ ルート接頭辞 /mini/ はテンプレ規約。案件が接頭辞を変えたらこの正規表現も合わせる。
  const deadline = Date.now() + 570_000
  let established = false
  while (Date.now() < deadline) {
    if (/\/mini\//.test(page.url())) {
      const status = await page
        .evaluate(async () => {
          try {
            return (await fetch('/api/session?sessionType=user', { credentials: 'include' })).status
          } catch {
            return 0
          }
        })
        .catch(() => 0)
      if (status === 200) {
        established = true
        break
      }
    }
    await page.waitForTimeout(2000)
  }
  if (!established) {
    throw new Error('セッション確立を検知できませんでした(ログイン未完了 / タイムアウト)')
  }

  await page.context().storageState({ path: STORAGE_STATE })
})
