export const groupToMap = <T, K extends keyof T>(items: T[], key: K) => {
  return items.reduce((m, item) => m.set(item[key], item), new Map<T[K], T>())
}

export const groupToListMap = <T, K extends keyof T>(items: T[], key: K) => {
  return items.reduce((m, item) => {
    const s = m.get(item[key])
    if (s != null) {
      s.push(item)
    } else {
      m.set(item[key], [item])
    }
    return m
  }, new Map<T[K], T[]>())
}

export type NonEmptyArray<T> = [T, ...T[]]

export const mapNonEmptyArray = <T, U>(items: NonEmptyArray<T>, fn: (item: T) => U): NonEmptyArray<U> => {
  return items.map(fn) as NonEmptyArray<U>
}
