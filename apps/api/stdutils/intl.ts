const dateFormat = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const dateTimeFormat = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

export const formatDate = (d: Date) => dateFormat.format(d).replace(/\//g, '.')
export const formatDateOpt = (date: Date | undefined) => (date == null ? undefined : formatDate(date))

export const formatDateTime = dateTimeFormat.format
export const formatDateTimeOpt = (date: Date | undefined) => (date == null ? undefined : formatDateTime(date))
