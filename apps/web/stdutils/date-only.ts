import { PlainMessage } from '@bufbuild/protobuf'

import { DateOnly } from '@/gen/stdutils/date_only_pb'

// DateOnly から Date オブジェクトを生成する
export const dateOnlyToDate = (date: DateOnly): Date => new Date(date.year, date.month - 1, date.dayOfMonth)
export const dateOnlyToDateOpt = (date: DateOnly | undefined) => (date == null ? undefined : dateOnlyToDate(date))

// Date から DateOnly を生成する
export const dateToDateOnly = (date: Date): DateOnly => {
  return new DateOnly({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    dayOfMonth: date.getDate(),
  })
}

export const formatDateOnly = (dateOnly: PlainMessage<DateOnly>) => {
  return `${dateOnly.year}/${String(dateOnly.month).padStart(2, '0')}/${String(dateOnly.dayOfMonth).padStart(2, '0')}`
}

export const isDateOnlyGte = (a: PlainMessage<DateOnly>, b: PlainMessage<DateOnly>) => {
  return (
    a.year > b.year ||
    (a.year === b.year && (a.month > b.month || (a.month === b.month && a.dayOfMonth >= b.dayOfMonth)))
  )
}
