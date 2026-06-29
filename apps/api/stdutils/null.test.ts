import { ensureNotNull, isNotNull } from './null'
import { DomainError } from '@/domain/errors'
import assert from 'node:assert'
import { describe, it } from 'node:test'

describe('ensureNotNull', () => {
  it('値があればそのまま返す', () => {
    assert.strictEqual(ensureNotNull('x'), 'x')
  })

  it('0 や空文字は null ではないのでそのまま返す', () => {
    assert.strictEqual(ensureNotNull(0), 0)
    assert.strictEqual(ensureNotNull(''), '')
  })

  it('null は入力不正（InvalidArgument）', () => {
    assert.throws(
      () => ensureNotNull(null),
      (e: unknown) => e instanceof DomainError && e.code === 'InvalidArgument',
    )
  })

  it('undefined は入力不正（InvalidArgument）', () => {
    assert.throws(
      () => ensureNotNull(undefined),
      (e: unknown) => e instanceof DomainError && e.code === 'InvalidArgument',
    )
  })
})

describe('isNotNull', () => {
  it('値があれば true（0 を含む）', () => {
    assert.strictEqual(isNotNull(0), true)
  })

  it('null / undefined は false', () => {
    assert.strictEqual(isNotNull(null), false)
    assert.strictEqual(isNotNull(undefined), false)
  })
})
