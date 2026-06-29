import { describe, expect, it } from 'vitest'

import { type Engine, type OS, type UserAgentHints, parseUserAgent } from './parse'

type Case = {
  name: string
  ua: string
  hints?: UserAgentHints
  os: OS
  engine: Engine
  isMobile: boolean
}

// 代表的な UA。長いので一部のみ。判定に効くトークン（iPhone/Android/Macintosh 等）を含めてある。
const cases: Case[] = [
  {
    name: 'iPhone Safari',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    os: 'ios',
    engine: 'webkit',
    isMobile: true,
  },
  {
    name: 'iPhone Chrome (CriOS) も WebKit',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1',
    os: 'ios',
    engine: 'webkit',
    isMobile: true,
  },
  {
    name: 'iPad (旧 UA)',
    ua: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    os: 'ios',
    engine: 'webkit',
    isMobile: true,
  },
  {
    name: 'iPadOS 13+ デスクトップ表示（Macintosh UA + タッチ）は iOS 扱い',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    hints: { maxTouchPoints: 5 },
    os: 'ios',
    engine: 'webkit',
    isMobile: true,
  },
  {
    name: 'Mac Safari（タッチなし）は macOS',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    hints: { maxTouchPoints: 0 },
    os: 'macos',
    engine: 'webkit',
    isMobile: false,
  },
  {
    name: 'Android Chrome',
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    os: 'android',
    engine: 'blink',
    isMobile: true,
  },
  {
    name: 'macOS Chrome',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    os: 'macos',
    engine: 'blink',
    isMobile: false,
  },
  {
    name: 'Windows Chrome',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    os: 'windows',
    engine: 'blink',
    isMobile: false,
  },
  {
    name: 'Windows Firefox',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    os: 'windows',
    engine: 'gecko',
    isMobile: false,
  },
  {
    name: '空文字は other',
    ua: '',
    os: 'other',
    engine: 'other',
    isMobile: false,
  },
]

describe('parseUserAgent', () => {
  it.each(cases)('$name', ({ ua, hints, os, engine, isMobile }) => {
    const platform = parseUserAgent(ua, hints)
    expect(platform.os).toBe(os)
    expect(platform.engine).toBe(engine)
    expect(platform.isMobile).toBe(isMobile)
    expect(platform.isIOS).toBe(os === 'ios')
    expect(platform.isAndroid).toBe(os === 'android')
  })

  it('hints 省略時もタッチ補足なしで判定できる', () => {
    expect(parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)').os).toBe('macos')
  })
})
