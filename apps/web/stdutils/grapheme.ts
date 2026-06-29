// 書記素クラスタ（grapheme）単位のテキスト操作。
// 絵文字（ZWJ 連結・修飾子付き・異体字セレクタ付き・国旗）を 1 文字として数えたい・
// 分割したい場面で使う。文字数カウントや 1 文字ずつの描画などで「絵文字 1 個 = 1」を保証する。
// `grapheme-splitter` (npm) は更新が止まっており ZWJ 連結の新しい絵文字 (😮‍💨 等) を
// 複数に割ってしまうため、標準の Intl.Segmenter を使う。

// grapheme 粒度の分割は UAX#29 上 locale 非依存のため、locale は指定しない。
const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null

/**
 * テキストを書記素クラスタ単位の配列に分割する。
 * ZWJ 連結・修飾子付き・異体字セレクタ付きの絵文字を 1 要素として扱う。
 * Intl.Segmenter 非対応環境では Array.from（コードポイント単位）にフォールバックする。
 */
export const splitGraphemes = (text: string): string[] => {
  if (text === '' || text == null) return []
  if (segmenter !== null) {
    return Array.from(segmenter.segment(text)).map((s) => s.segment)
  }
  return Array.from(text)
}

/** 書記素クラスタ単位の文字数を返す（絵文字 1 文字 = 1 とカウント）。 */
export const getGraphemeLength = (text: string): number => splitGraphemes(text).length
