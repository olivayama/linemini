import { groupToListMap, groupToMap, mapNonEmptyArray } from './array'
import assert from 'node:assert'
import { describe, it } from 'node:test'

describe('groupToMap', () => {
  it('key ごとに最後の要素で上書きした Map を作る', () => {
    const items = [
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
      { id: 'a', v: 3 },
    ]

    const result = groupToMap(items, 'id')

    assert.deepStrictEqual(result.get('a'), { id: 'a', v: 3 })
    assert.deepStrictEqual(result.get('b'), { id: 'b', v: 2 })
    assert.strictEqual(result.size, 2)
  })

  it('空配列は空の Map を返す', () => {
    const result = groupToMap([] as { id: string }[], 'id')

    assert.strictEqual(result.size, 0)
  })
})

describe('groupToListMap', () => {
  it('同一 key の要素を入力順のまま配列にまとめる', () => {
    const items = [
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
      { id: 'a', v: 3 },
    ]

    const result = groupToListMap(items, 'id')

    assert.deepStrictEqual(result.get('a'), [
      { id: 'a', v: 1 },
      { id: 'a', v: 3 },
    ])
    assert.deepStrictEqual(result.get('b'), [{ id: 'b', v: 2 }])
  })

  it('空配列は空の Map を返す', () => {
    const result = groupToListMap([] as { id: string }[], 'id')

    assert.strictEqual(result.size, 0)
  })
})

describe('mapNonEmptyArray', () => {
  it('各要素に関数を適用した非空配列を返す', () => {
    const result = mapNonEmptyArray([1, 2, 3], (n) => n * 2)

    assert.deepStrictEqual(result, [2, 4, 6])
  })

  it('要素が1件でも適用できる', () => {
    const result = mapNonEmptyArray([5], (n) => n + 1)

    assert.deepStrictEqual(result, [6])
  })
})
