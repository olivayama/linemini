import { dateOnlyAddDays, dateOnlySubDays, dateOnlyToDate, formatDateOnly, isEqualDateOnly } from './date-only'
import assert from 'node:assert'
import { describe, it } from 'node:test'

describe('dateOnlyToDate', () => {
  it('サーバーのタイムゾーンに依存せず UTC 00:00 の Date を生成する', () => {
    const date = dateOnlyToDate({ year: 2026, month: 6, dayOfMonth: 20 })

    assert.strictEqual(date.toISOString(), '2026-06-20T00:00:00.000Z')
  })
})

describe('isEqualDateOnly', () => {
  it('年月日がすべて一致すれば true', () => {
    const result = isEqualDateOnly({ year: 2026, month: 6, dayOfMonth: 20 }, { year: 2026, month: 6, dayOfMonth: 20 })

    assert.strictEqual(result, true)
  })

  it('日だけ異なれば false', () => {
    const result = isEqualDateOnly({ year: 2026, month: 6, dayOfMonth: 20 }, { year: 2026, month: 6, dayOfMonth: 21 })

    assert.strictEqual(result, false)
  })
})

describe('dateOnlyAddDays', () => {
  it('月内で日数を加算する', () => {
    const result = dateOnlyAddDays({ year: 2026, month: 6, dayOfMonth: 20 }, 5)

    assert.deepStrictEqual(result, { year: 2026, month: 6, dayOfMonth: 25 })
  })

  it('月末を越えると翌月へ繰り上がる', () => {
    const result = dateOnlyAddDays({ year: 2026, month: 6, dayOfMonth: 30 }, 1)

    assert.deepStrictEqual(result, { year: 2026, month: 7, dayOfMonth: 1 })
  })

  it('年末を越えると翌年へ繰り上がる', () => {
    const result = dateOnlyAddDays({ year: 2026, month: 12, dayOfMonth: 31 }, 1)

    assert.deepStrictEqual(result, { year: 2027, month: 1, dayOfMonth: 1 })
  })

  it('うるう年の 2/28 の翌日は 2/29', () => {
    const result = dateOnlyAddDays({ year: 2024, month: 2, dayOfMonth: 28 }, 1)

    assert.deepStrictEqual(result, { year: 2024, month: 2, dayOfMonth: 29 })
  })
})

describe('dateOnlySubDays', () => {
  it('月初を下回ると前月へ繰り下がる', () => {
    const result = dateOnlySubDays({ year: 2026, month: 7, dayOfMonth: 1 }, 1)

    assert.deepStrictEqual(result, { year: 2026, month: 6, dayOfMonth: 30 })
  })
})

describe('formatDateOnly', () => {
  it('月・日を2桁ゼロ埋めして / 区切りで整形する', () => {
    const result = formatDateOnly({ year: 2026, month: 6, dayOfMonth: 5 })

    assert.strictEqual(result, '2026/06/05')
  })
})
