'use client'

import React, { useMemo } from 'react'

import { useSearchParams } from 'next/navigation'

import { FileDownloadButton } from '@/components/admin/file-download-button'
import { useYearMonthQuery } from '@/components/admin/year-month/use-year-month-query'
import { ButtonProps } from '@/components/ui/button'
import { UserService } from '@/gen/services/user/v1/user_service_connect'

import { ensureCustomerNumberPrefix } from './ensure-customer-number-prefix'

const UserCsvDownloadButton = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const searchParams = useSearchParams()
  const { yearMonth } = useYearMonthQuery()

  const customerNumberPrefix = useMemo(() => {
    const value = ensureCustomerNumberPrefix(searchParams.get('customerNumberPrefix') ?? '')
    return value !== '' ? value : undefined
  }, [searchParams])

  return (
    <FileDownloadButton
      {...props}
      ref={ref}
      fileName="users"
      extension="csv"
      mimeType="text/csv"
      service={UserService}
      streamMethod={(client, signal) => client.exportUsersCSV({ yearMonth, customerNumberPrefix }, { signal })}
    >
      CSVダウンロード
    </FileDownloadButton>
  )
})

UserCsvDownloadButton.displayName = 'UserCsvDownloadButton'

export { UserCsvDownloadButton }
