import { pick } from './object'
import assert from 'node:assert'
import { describe, it } from 'node:test'

describe('pick', () => {
  it('指定したキーだけを抜き出す', () => {
    assert.deepStrictEqual(pick({ a: 1, b: 2, c: 3 }, ['a', 'c']), { a: 1, c: 3 })
  })

  it('オブジェクトに存在しないキーは含めない', () => {
    assert.deepStrictEqual(pick({ a: 1 } as { a: number; b?: number }, ['a', 'b']), { a: 1 })
  })

  it('空のキー配列は空オブジェクトを返す', () => {
    assert.deepStrictEqual(pick({ a: 1, b: 2 }, []), {})
  })
})
