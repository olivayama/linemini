import { expect, test } from '@playwright/test'

/**
 * 雛形テスト(案件非依存)。保存済み storageState を使い、**再ログインなしで**認証済み
 * アクセスできることだけを確認する。各案件はこれを参考に、自分の画面に合わせたテスト
 * (遷移・入力制限・ボタン状態 等)を `e2e/*.spec.ts` に追加する。
 *
 * 実行前提: 先に `pnpm --filter @apps/web e2e:auth` を1回実行し、e2e/.auth/user.json を作成。
 *           実行時に E2E_BASE_URL(案件の dev URL)を渡す。
 */
test('保存セッションを使い回して認証済みでアクセスできる(再ログインしない)', async ({ page }) => {
  const res = await page.goto('/mini/home')
  expect(res, '/mini/home に到達できること').not.toBeNull()
  expect(res?.status() ?? 0, 'HTTP ステータス < 400').toBeLessThan(400)

  // サーバ側セッション(Cookie)が有効
  const status = await page.evaluate(
    async () => (await fetch('/api/session?sessionType=user', { credentials: 'include' })).status,
  )
  expect(status, '/api/session が 200(= Cookie 再利用で認証維持)').toBe(200)

  // LINE ログイン画面にバウンスしていない
  expect(page.url(), 'LINE ログインに飛ばされていない').not.toMatch(/access\.line\.me|liff\.line\.me/)
})
