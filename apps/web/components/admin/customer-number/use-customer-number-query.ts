import { useCallback, useMemo, useState } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { useQuery } from '@connectrpc/connect-query'
import { useDebouncedCallback } from 'use-debounce'

import { getUserByCustomerNumber } from '@/services/user_service'

const ensureCustomerNumber = (customerNumber: string) => customerNumber.replace(/[^0-9]/g, '')

export const useCustomerNumberQuery = () => {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const customerNumberQuery = useMemo(
    () => ensureCustomerNumber(searchParams.get('customerNumber') ?? ''),
    [searchParams],
  )

  const [customerNumberValue, setCustomerNumberValue] = useState(customerNumberQuery)

  const userQuery = useQuery(
    getUserByCustomerNumber,
    { customerNumber: customerNumberQuery },
    {
      enabled: customerNumberQuery !== '',
    },
  )

  const userId = useMemo(
    () => (userQuery.isLoading || userQuery.isError ? '' : userQuery.data?.user?.id),
    [userQuery.data?.user?.id, userQuery.isError, userQuery.isLoading],
  )

  const changeCustomerNumberQuery = useDebouncedCallback((customerNumber: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('customerNumber', customerNumber)
    router.replace(pathname + `?${params.toString()}`, { scroll: false })
  }, 200)

  const handleCustomerNumberChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const customerNumber = ensureCustomerNumber(e.target.value)
      setCustomerNumberValue(customerNumber)
      changeCustomerNumberQuery(customerNumber)
    },
    [changeCustomerNumberQuery],
  )

  return {
    customerNumberValue,
    handleCustomerNumberChange,
    userId,
  }
}
