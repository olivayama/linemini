import { describe, expect, it } from 'vitest'

import { insertSeparatorEveryNChars } from './string'

describe('insertSeparatorEveryNChars', () => {
  it('n 文字ごとに区切り文字を挿入する', () => {
    expect(insertSeparatorEveryNChars('1234567890', ',', 3)).toBe('123,456,789,0')
  })

  it('文字数が n の倍数のとき末尾には区切りを付けない', () => {
    expect(insertSeparatorEveryNChars('123456', '-', 3)).toBe('123-456')
  })

  it('文字数が n 以下なら区切りを挿入しない', () => {
    expect(insertSeparatorEveryNChars('12', ',', 3)).toBe('12')
  })

  it('空文字列はそのまま返す', () => {
    expect(insertSeparatorEveryNChars('', ',', 3)).toBe('')
  })

  it('複数文字の区切りも挿入できる', () => {
    expect(insertSeparatorEveryNChars('abcd', ' / ', 2)).toBe('ab / cd')
  })
})
