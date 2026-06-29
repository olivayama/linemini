import { dateTimeParts, TimeZone } from './date'

export type YearMonth = {
  year: number
  month: number
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000

export const yearMonthToStartDate = (yearMonth: YearMonth): Date =>
  new Date(Date.UTC(yearMonth.year, yearMonth.month - 1, 1))

export const yearMonthToEndDate = (yearMonth: YearMonth): Date => new Date(Date.UTC(yearMonth.year, yearMonth.month, 0))

export const yearMonthToStartDateTime = (yearMonth: YearMonth): Date =>
  new Date(Date.UTC(yearMonth.year, yearMonth.month - 1, 1) - JST_OFFSET_MS)

export const yearMonthToEndDateTime = (yearMonth: YearMonth): Date =>
  new Date(Date.UTC(yearMonth.year, yearMonth.month, 1) - JST_OFFSET_MS - 1)

export const dateToYearMonth = (date: Date, options: { timeZone: TimeZone }): YearMonth => {
  const { year, month } = dateTimeParts(date, options.timeZone)
  return { year, month }
}

export const isEqualYearMonth = (a: YearMonth, b: YearMonth): boolean => a.year === b.year && a.month === b.month

export const isYearMonthGte = (a: YearMonth, b: YearMonth): boolean => {
  return a.year > b.year || (a.year === b.year && a.month >= b.month)
}

export const isYearMonthGt = (a: YearMonth, b: YearMonth): boolean => {
  return a.year > b.year || (a.year === b.year && a.month > b.month)
}

export const isYearMonthLt = (a: YearMonth, b: YearMonth): boolean => {
  return a.year < b.year || (a.year === b.year && a.month < b.month)
}

export const getPreviousYearMonth = (yearMonth: YearMonth): YearMonth => {
  if (yearMonth.month === 1) {
    return { year: yearMonth.year - 1, month: 12 }
  }
  return { year: yearMonth.year, month: yearMonth.month - 1 }
}

export const getYearMonthLastDay = (yearMonth: YearMonth): number => {
  return new Date(yearMonth.year, yearMonth.month, 0).getDate()
}

export const calculateEndYearMonthDay = (
  requestedYear: number,
  limitYearMonth: YearMonth,
): { year: number; month: number; dayOfMonth: number } => {
  const endYear = requestedYear < limitYearMonth.year ? requestedYear : limitYearMonth.year
  const endMonth = requestedYear < limitYearMonth.year ? 12 : limitYearMonth.month
  const endDay = getYearMonthLastDay({ year: endYear, month: endMonth })

  return { year: endYear, month: endMonth, dayOfMonth: endDay }
}
