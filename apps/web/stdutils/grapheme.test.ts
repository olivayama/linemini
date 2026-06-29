import { describe, expect, it } from 'vitest'

import { getGraphemeLength, splitGraphemes } from './grapheme'

describe('grapheme', () => {
  it('空文字は長さ 0 / 空配列', () => {
    expect(getGraphemeLength('')).toBe(0)
    expect(splitGraphemes('')).toEqual([])
  })

  it('null は長さ 0 / 空配列 (実行時ガード)', () => {
    expect(getGraphemeLength(null as unknown as string)).toBe(0)
    expect(splitGraphemes(null as unknown as string)).toEqual([])
  })

  it('ASCII・日本語は 1 文字ずつ数える', () => {
    expect(getGraphemeLength('abc')).toBe(3)
    expect(getGraphemeLength('あいう')).toBe(3)
  })

  it('単体絵文字 (サロゲートペア) を 1 文字として数える', () => {
    expect(getGraphemeLength('😀')).toBe(1)
  })

  it('異体字セレクタ付き絵文字 (❤️) を 1 文字として数える', () => {
    expect(getGraphemeLength('❤️')).toBe(1)
  })

  // 国旗は Regional Indicator 2 個で 1 書記素。ZWJ とは別の結合メカニズム。
  it('国旗 (Regional Indicator のペア) を 1 文字として数える', () => {
    expect(getGraphemeLength('🇯🇵')).toBe(1)
  })

  // 肌の色修飾子は絵文字 + 修飾子で 1 書記素。これも ZWJ とは別の結合メカニズム。
  it('肌の色修飾子付き絵文字を 1 文字として数える', () => {
    expect(getGraphemeLength('👍🏽')).toBe(1)
  })

  // 旧 grapheme-splitter はこれらを 2〜3 個に割り、文字数の過大カウントや絵文字の分解描画を招いていた。
  it('ZWJ 連結の顔絵文字を 1 文字として数える (回帰防止)', () => {
    expect(getGraphemeLength('😮‍💨')).toBe(1) // face exhaling
    expect(getGraphemeLength('😵‍💫')).toBe(1) // face with spiral eyes
    expect(getGraphemeLength('😶‍🌫️')).toBe(1) // face in clouds
    expect(getGraphemeLength('🧑‍🤝‍🧑')).toBe(1) // people holding hands
  })

  it('ZWJ 絵文字 5 個 + 文字列を正しく数える (5×2=10 にならない)', () => {
    expect(getGraphemeLength('😮‍💨😵‍💫😶‍🌫️😮‍💨😵‍💫')).toBe(5)
    expect(getGraphemeLength('😮‍💨😵‍💫😶‍🌫️😮‍💨😵‍💫12345678')).toBe(13)
  })

  it('splitGraphemes は書記素単位で分割する', () => {
    expect(splitGraphemes('a😮‍💨b')).toEqual(['a', '😮‍💨', 'b'])
  })
})
