import invariant from 'tiny-invariant'

export type TimeZone = 'JST' | 'UTC'

export const dateTimeParts = (date: Date, timeZone: TimeZone) => {
  switch (timeZone) {
    case 'UTC':
      return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
        second: date.getUTCSeconds(),
      }
    case 'JST':
      const parts = new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      })
        .formatToParts(date)
        .reduce((acc, p) => acc.set(p.type, parseInt(p.value)), new Map<string, number>())
      const year = parts.get('year')
      const month = parts.get('month')
      const day = parts.get('day')
      const hour = parts.get('hour')
      const minute = parts.get('minute')
      const second = parts.get('second')
      invariant(year != null && month != null && day != null && hour != null && minute != null && second != null)
      return { year, month, day, hour, minute, second }
  }
}

// 日付をISO 8601形式でJSTオフセット付きにフォーマットするヘルパー関数
export const formatToJSTISOString = (date: Date): string => {
  const parts = dateTimeParts(date, 'JST')
  const { year, month, day, hour, minute, second } = parts
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}+09:00`
}
