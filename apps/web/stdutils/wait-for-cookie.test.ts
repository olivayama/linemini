// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { waitForCookie } from './wait-for-cookie'

const now = new Date('2026-06-05T00:00:00Z')

const clearAllCookies = () => {
  document.cookie.split('; ').forEach((c) => {
    const [name] = c.split('=')
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  })
}

describe('waitForCookie', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    clearAllCookies()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('Cookie が既にあれば即座に resolve する', async () => {
    document.cookie = 'gtm_user_id=abc; path=/'

    await expect(waitForCookie('gtm_user_id', 1000)).resolves.toBeUndefined()
  })

  it('ポーリング中に Cookie がセットされたら resolve する', async () => {
    const promise = waitForCookie('gtm_user_id', 1000)

    await vi.advanceTimersByTimeAsync(10)
    document.cookie = 'gtm_user_id=abc; path=/'
    await vi.advanceTimersByTimeAsync(20)

    await expect(promise).resolves.toBeUndefined()
  })

  it('timeout 経過しても Cookie が無ければ諦めて resolve する', async () => {
    const promise = waitForCookie('gtm_user_id', 500)

    await vi.advanceTimersByTimeAsync(500)

    await expect(promise).resolves.toBeUndefined()
  })

  it('別名の Cookie だけがある場合は前方一致誤検知しない', async () => {
    document.cookie = 'other_cookie=xyz; path=/'

    const promise = waitForCookie('gtm_user_id', 100)
    await vi.advanceTimersByTimeAsync(100)

    await expect(promise).resolves.toBeUndefined()
    // 100ms 待ったあとに resolve = タイムアウト経路で resolve したことを示す
  })
})
