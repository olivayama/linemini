export const insertSeparatorEveryNChars = (string: string, insertChar: string, n: number): string => {
  // n文字ごとに指定した文字列を挿入
  const regex = new RegExp(`(.{${n}})(?=.)`, 'g')
  return string.replace(regex, `$1${insertChar}`)
}
