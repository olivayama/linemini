import { dateTimeParts, TimeZone } from './date'

export type DateOnly = {
  year: number
  month: number
  dayOfMonth: number
}

// DateOnly から UTC 00:00 の Date オブジェクトを生成する
// サーバーのタイムゾーンは UTC に設定されるはずではあるが、それに依存せず UTC 00:00 を生成したいため Date.UTC を経由する
export const dateOnlyToDate = (date: DateOnly): Date => new Date(Date.UTC(date.year, date.month - 1, date.dayOfMonth))
// Date から DateOnly を生成する
export const dateToDateOnly = (date: Date, options: { timeZone: TimeZone }): DateOnly => {
  const { year, month, day } = dateTimeParts(date, options.timeZone)
  return {
    year: year,
    month: month,
    dayOfMonth: day,
  }
}

export const isEqualDateOnly = (a: DateOnly, b: DateOnly) =>
  a.year === b.year && a.month === b.month && a.dayOfMonth === b.dayOfMonth

export const dateOnlyAddDays = (date: DateOnly, days: number) => {
  const dateObject = dateOnlyToDate(date)
  dateObject.setDate(dateObject.getDate() + days)
  return dateToDateOnly(dateObject, { timeZone: 'UTC' })
}

export const dateOnlySubDays = (date: DateOnly, days: number) => dateOnlyAddDays(date, -days)

export const formatDateOnly = (dateOnly: DateOnly) => {
  return `${dateOnly.year}/${String(dateOnly.month).padStart(2, '0')}/${String(dateOnly.dayOfMonth).padStart(2, '0')}`
}
