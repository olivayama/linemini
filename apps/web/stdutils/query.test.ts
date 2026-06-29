import { describe, expect, it } from 'vitest'

import { makeQueryString } from './query'

describe('makeQueryString', () => {
  it('複数パラメータを & で連結する', () => {
    expect(makeQueryString({ a: '1', b: '2' })).toBe('a=1&b=2')
  })

  it('null / undefined の値は除外する', () => {
    expect(makeQueryString({ a: '1', b: null, c: undefined })).toBe('a=1')
  })

  it('空オブジェクトは空文字列', () => {
    expect(makeQueryString({})).toBe('')
  })

  it('値は URL エンコードされる', () => {
    expect(makeQueryString({ q: 'a b&c' })).toBe('q=a+b%26c')
  })
})
