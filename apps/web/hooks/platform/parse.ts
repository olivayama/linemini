// プラットフォーム判定の純粋ロジック。
// navigator など実行環境に依存せず UA 文字列（＋必要なヒント）だけで判定するため、
// 副作用なし・テスト容易。実環境からの取得は `./index.ts`（getPlatform）が担う。
//
// 方針: 機能の有無は本来 feature detection（CSS.supports 等）で見るべきだが、
// iOS/WebKit 固有の描画やテキスト計測のクセは capability で検出できない
// 「描画バグの回避」なので、ここでは engine / os を UA から判定して分岐の根拠にする。

export type OS = 'ios' | 'android' | 'macos' | 'windows' | 'other'

/** 描画エンジン。レンダリングのクセはエンジン単位で出ることが多いため OS と別に持つ。 */
export type Engine = 'webkit' | 'blink' | 'gecko' | 'other'

export type Platform = {
  os: OS
  engine: Engine
  /** スマホ/タブレット（iOS もしくは Android）か */
  isMobile: boolean
  isIOS: boolean
  isAndroid: boolean
}

export type UserAgentHints = {
  /**
   * navigator.maxTouchPoints。
   * iPadOS 13+ の Safari は既定で Mac の UA（Macintosh）を返すため、UA だけでは iPad を
   * 取りこぼす。タッチ点数を併用して iPad を補足する。
   */
  maxTouchPoints?: number
}

/**
 * SSR や判定不能時の既定値。サーバー描画とクライアント初回描画を一致させるために共有する。
 * 全箇所で同一参照を共有するため、誤って書き換えてもグローバルに汚染されないよう凍結する。
 */
export const UNKNOWN_PLATFORM: Readonly<Platform> = Object.freeze<Platform>({
  os: 'other',
  engine: 'other',
  isMobile: false,
  isIOS: false,
  isAndroid: false,
})

const detectOS = (ua: string, hints: UserAgentHints): OS => {
  if (/iPhone|iPod|iPad/.test(ua)) return 'ios'
  // iPadOS 13+ の「デスクトップ表示」: UA は Macintosh だが複数タッチ点を持つ
  if (/Macintosh/.test(ua) && (hints.maxTouchPoints ?? 0) > 1) return 'ios'
  if (/Android/.test(ua)) return 'android'
  if (/Macintosh|Mac OS X/.test(ua)) return 'macos'
  if (/Windows/.test(ua)) return 'windows'
  return 'other'
}

const detectEngine = (ua: string, os: OS): Engine => {
  // iOS はブラウザ/WebView を問わず WebKit に固定（Chrome=CriOS, Firefox=FxiOS 等も内部は WebKit）
  if (os === 'ios') return 'webkit'
  // FxiOS（Firefox on iOS）は上の os==='ios' で WebKit 判定済みのためここには来ない
  if (/Firefox\//.test(ua) && !/Seamonkey/.test(ua)) return 'gecko'
  if (/Chrome|Chromium|CriOS|Edg|OPR|SamsungBrowser/.test(ua)) return 'blink'
  if (/AppleWebKit/.test(ua)) return 'webkit'
  return 'other'
}

/** UA 文字列（＋ヒント）からプラットフォームを判定する純粋関数。 */
export const parseUserAgent = (ua: string, hints: UserAgentHints = {}): Platform => {
  const os = detectOS(ua, hints)
  const engine = detectEngine(ua, os)
  return {
    os,
    engine,
    isMobile: os === 'ios' || os === 'android',
    isIOS: os === 'ios',
    isAndroid: os === 'android',
  }
}
