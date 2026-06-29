// 実行環境（navigator）からプラットフォームを取得するアクセサ。
// 純粋ロジックは ./parse に分離してある。React コンポーネントからは ./use-platform の
// usePlatform() を使うとハイドレーション安全に扱える。
import { type Platform, UNKNOWN_PLATFORM, parseUserAgent } from './parse'

let cached: Platform | null = null

/**
 * クライアントの実プラットフォームを返す。
 * navigator が無い（SSR）場合は既定値 UNKNOWN_PLATFORM を返す。
 * UA は実行中に変わらないためメモ化する。
 *
 * 注意: レンダー中に直接呼ぶと SSR とクライアントで結果が割れ得る（hydration mismatch）。
 * コンポーネントの描画分岐には usePlatform() を使うこと。イベントハンドラなど
 * マウント後の処理から呼ぶのは安全。
 */
export const getPlatform = (): Platform => {
  if (typeof navigator === 'undefined') return UNKNOWN_PLATFORM
  if (cached != null) return cached
  cached = parseUserAgent(navigator.userAgent, { maxTouchPoints: navigator.maxTouchPoints })
  return cached
}

/** getPlatform().isIOS の薄いショートカット（イベント/マウント後処理向け）。 */
export const isIOS = (): boolean => getPlatform().isIOS

export { parseUserAgent, UNKNOWN_PLATFORM } from './parse'
export type { Platform, OS, Engine, UserAgentHints } from './parse'
