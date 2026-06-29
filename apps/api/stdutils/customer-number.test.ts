import { generateCustomerNumber } from './customer-number'
import assert from 'node:assert'
import { describe, it } from 'node:test'

describe('generateCustomerNumber', () => {
  it('16桁の数字文字列を生成する', () => {
    assert.match(generateCustomerNumber(), /^\d{16}$/)
  })

  it('呼び出しごとに（ランダム部により）異なる番号になる', () => {
    assert.notStrictEqual(generateCustomerNumber(), generateCustomerNumber())
  })
})
