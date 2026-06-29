// 日付・日時フォーマッタ（ja-JP）。名前は構成要素 = Y(年) M(月) D(日) H(時) m(分) W(曜)。
// 月は大文字 M・分は小文字 m（HH:mm 慣習）。区切りは既定スラッシュ、ドット区切りは末尾に Dot。各 export のコメントは出力例。

const dateFormat = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// 2026/06/21
export const formatYMD = dateFormat.format
export const formatYMDOpt = (date: Date | undefined) => (date == null ? undefined : formatYMD(date))

// 2026.06.21
export const formatYMDDot = (d: Date) => dateFormat.format(d).replace(/\//g, '.')
export const formatYMDDotOpt = (date: Date | undefined) => (date == null ? undefined : formatYMDDot(date))

// 2026/06/21 04:15
export const formatYMDHm = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
}).format
export const formatYMDHmOpt = (date: Date | undefined) => (date == null ? undefined : formatYMDHm(date))

// 7/17(水)
export const formatMDW = new Intl.DateTimeFormat('ja-JP', {
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
}).format
export const formatMDWOpt = (date: Date | undefined) => (date == null ? undefined : formatMDW(date))

// 2024年7月
export const formatYM = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: 'long',
}).format
export const formatYMOpt = (date: Date | undefined) => (date == null ? undefined : formatYM(date))

// 7月
export const formatM = new Intl.DateTimeFormat('ja-JP', {
  month: 'numeric',
}).format
export const formatMOpt = (date: Date | undefined) => (date == null ? undefined : formatM(date))

// 水
export const formatW = new Intl.DateTimeFormat('ja-JP', {
  weekday: 'short',
}).format
export const formatWOpt = (date: Date | undefined) => (date == null ? undefined : formatW(date))

// 午前4:15
export const formatH12m = new Intl.DateTimeFormat('ja-JP', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
}).format
export const formatH12mOpt = (date: Date | undefined) => (date == null ? undefined : formatH12m(date))

// 2026/06/21（UTC 基準）
export const formatUTCYMD = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'UTC',
}).format
export const formatUTCYMDOpt = (date: Date | undefined) => (date == null ? undefined : formatUTCYMD(date))
