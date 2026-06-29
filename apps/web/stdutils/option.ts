export const mapOption = <T, R>(x: T | null | undefined, f: (v: T) => R): R | undefined => {
  if (x == null) return undefined
  return f(x)
}
