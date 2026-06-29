/**
 * 指定した名前の cookie が `document.cookie` に反映されるのを待つ。
 *
 * `/api/session` のレスポンスで Set-Cookie された値の反映が、ブラウザ
 * (LINE 内蔵 / iOS Safari Private 等) によっては fetch resolve 後の同
 * フレーム内で遅延することがある。その状態で即座に GTM 系イベントを
 * 発火すると、ファーストパーティ Cookie 変数が空のまま GA タグが発火し
 * user_properties が (not set) になる。これを防ぐ用途。
 *
 * 反映されないまま timeout した場合は諦めて resolve する。
 *
 * SSR (`typeof document === 'undefined'`) では即時 resolve する。
 */
export const waitForCookie = (name: string, timeoutMs = 500): Promise<void> =>
  new Promise((resolve) => {
    if (typeof document === 'undefined') return resolve()
    const hasCookie = () => document.cookie.split('; ').some((c) => c.startsWith(`${name}=`))
    if (hasCookie()) return resolve()
    const start = Date.now()
    const tick = () => {
      if (hasCookie() || Date.now() - start >= timeoutMs) return resolve()
      setTimeout(tick, 20)
    }
    setTimeout(tick, 20)
  })
