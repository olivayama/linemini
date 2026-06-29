'use client'

import React, { useMemo } from 'react'

import { useQuery } from '@connectrpc/connect-query'

import { CopyButton } from '@/components/copy-button'
import { useUserSession } from '@/providers/user-session-provider'
import { getMyUser } from '@/services/user_service'
import { insertSeparatorEveryNChars } from '@/stdutils/string'

export const CustomerNumber: React.FC = () => {
  const userSession = useUserSession()
  const getMyUserQuery = useQuery(getMyUser, userSession.query({}))
  const userMe = useMemo(() => getMyUserQuery.data?.user, [getMyUserQuery.data])

  return (
    <div className="grid gap-3">
      <div className="font-semibold">お客様番号</div>
      <div className="flex place-items-center justify-between gap-4 rounded-xl border bg-background p-4">
        <div className="text-lg">{insertSeparatorEveryNChars(userMe?.customerNumber ?? '', '-', 4)}</div>
        <CopyButton text={userMe?.customerNumber ?? ''} />
      </div>
    </div>
  )
}
