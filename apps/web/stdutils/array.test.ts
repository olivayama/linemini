import { describe, expect, it } from 'vitest'

import { groupToListMap, groupToMap, mapNonEmptyArray } from './array'

describe('groupToMap', () => {
  it('key ごとに最後の要素で上書きした Map を作る', () => {
    const result = groupToMap(
      [
        { id: 'a', v: 1 },
        { id: 'b', v: 2 },
        { id: 'a', v: 3 },
      ],
      'id',
    )

    expect(result.get('a')).toEqual({ id: 'a', v: 3 })
    expect(result.get('b')).toEqual({ id: 'b', v: 2 })
    expect(result.size).toBe(2)
  })

  it('空配列は空の Map を返す', () => {
    expect(groupToMap([] as { id: string }[], 'id').size).toBe(0)
  })
})

describe('groupToListMap', () => {
  it('同一 key の要素を入力順のまま配列にまとめる', () => {
    const result = groupToListMap(
      [
        { id: 'a', v: 1 },
        { id: 'b', v: 2 },
        { id: 'a', v: 3 },
      ],
      'id',
    )

    expect(result.get('a')).toEqual([
      { id: 'a', v: 1 },
      { id: 'a', v: 3 },
    ])
    expect(result.get('b')).toEqual([{ id: 'b', v: 2 }])
  })
})

describe('mapNonEmptyArray', () => {
  it('各要素に関数を適用した非空配列を返す', () => {
    expect(mapNonEmptyArray([1, 2, 3], (n) => n * 2)).toEqual([2, 4, 6])
  })
})
