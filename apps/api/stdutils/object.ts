export const pick = <T extends {}>(object: T, keys: readonly (keyof T)[]): Pick<T, keyof T> => {
  return keys.reduce(
    (obj, key) => {
      if (object.hasOwnProperty(key) && keys.includes(key)) {
        obj[key] = object[key]
      }
      return obj
    },
    {} as Pick<T, keyof T>,
  )
}
