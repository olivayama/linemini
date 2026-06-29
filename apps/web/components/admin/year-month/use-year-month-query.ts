import { useCallback, useMemo } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { PlainMessage } from '@bufbuild/protobuf'
import invariant from 'tiny-invariant'

import { YearMonth } from '@/gen/stdutils/year_month_pb'

const ensureYearMonth = (yearMonth: string) => {
  if (/^2\d{3}-(0[1-9]|1[0-2])$/.test(yearMonth)) {
    return yearMonth
  }
  return 'all'
}

export const useYearMonthQuery = () => {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const yearMonthValue = useMemo(() => ensureYearMonth(searchParams.get('yearMonth') ?? 'all'), [searchParams])

  const yearMonth = useMemo<PlainMessage<YearMonth> | undefined>(() => {
    if (yearMonthValue === 'all') {
      return undefined
    }
    const [year, month] = yearMonthValue.split('-').map(Number)
    invariant(year != null && month != null)
    return { year, month }
  }, [yearMonthValue])

  const handleYearMonthChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('yearMonth', ensureYearMonth(value))
      router.replace(pathname + `?${params.toString()}`, { scroll: false })
    },
    [searchParams, pathname, router],
  )

  return {
    yearMonthValue,
    yearMonth,
    handleYearMonthChange,
  }
}
