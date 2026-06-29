export const makeQueryString = (query: Record<string, unknown>): string => {
  // クエリパラメータからnull,undefinedを除外し、Record<string, string>に変換
  const filteredQuery = Object.entries(query)
    .filter(([, value]) => value != null)
    .reduce(
      (acc, [key, value]) => {
        acc[key] = value as string
        return acc
      },
      {} as Record<string, string>,
    )
  return new URLSearchParams(filteredQuery).toString()
}
