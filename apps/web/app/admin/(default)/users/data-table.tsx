'use client'

import React, { useCallback, useMemo, useState } from 'react'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { useInfiniteQuery } from '@connectrpc/connect-query'
import { ColumnDef } from '@tanstack/react-table'
import { useDebouncedCallback } from 'use-debounce'

import { useAdminSession } from '@/components/admin/session/use-admin-session'
import { useYearMonthQuery } from '@/components/admin/year-month/use-year-month-query'
import YearMonthSelect from '@/components/admin/year-month/year-month-select'
import { DataTable } from '@/components/ui/data-table'
import { FormItem } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User } from '@/gen/services/user/v1/user_pb'
import { listUsers } from '@/services/user_service'

import { ensureCustomerNumberPrefix } from './ensure-customer-number-prefix'

// TODO: cursor paging

const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'customerNumber',
    header: 'お客様番号',
    cell: ({ row }) => {
      return (
        <Link
          // TODO: スタイル調整
          className="text-blue-500"
          href={{
            pathname: `/admin/users/${row.original.id}`,
          }}
        >
          {row.original.customerNumber}
        </Link>
      )
    },
  },
  {
    accessorKey: 'signedUpAt',
    header: '登録日時',
    accessorFn: (row) => row.signedUpAt?.toDate().toLocaleString(),
  },
]

export const UserDataTable: React.FC = () => {
  const adminSession = useAdminSession()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const { yearMonthValue, yearMonth, handleYearMonthChange } = useYearMonthQuery()

  const customerNumberPrefixQuery = useMemo(
    () => ensureCustomerNumberPrefix(searchParams.get('customerNumberPrefix') ?? ''),
    [searchParams],
  )

  const [customerNumberPrefixValue, setCustomerNumberPrefixValue] = useState(customerNumberPrefixQuery)

  const changeCustomerNumberPrefixQuery = useDebouncedCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('customerNumberPrefix', value)
    router.replace(pathname + `?${params.toString()}`, { scroll: false })
  }, 200)

  const handleCustomerNumberPrefixChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const v = ensureCustomerNumberPrefix(e.target.value)
      setCustomerNumberPrefixValue(v)
      changeCustomerNumberPrefixQuery(v)
    },
    [changeCustomerNumberPrefixQuery],
  )

  const limit = 100
  const listUsersQuery = useInfiniteQuery(
    listUsers,
    adminSession.query({
      customerNumberPrefix: customerNumberPrefixQuery !== '' ? customerNumberPrefixQuery : undefined,
      yearMonth,
      paging: {
        limit,
      },
    }),
    {
      pageParamKey: 'paging',
      getNextPageParam: (res) =>
        res.paging?.lastEvaluatedId == null
          ? undefined
          : {
              limit,
              exclusiveStartId: res.paging.lastEvaluatedId,
            },
    },
  )

  const users = useMemo(
    () => listUsersQuery.data?.pages.flatMap((page) => page.users) ?? [],
    [listUsersQuery.data?.pages],
  )

  const infiniteScrollProps = useMemo(
    () => ({
      hasNextPage: listUsersQuery.hasNextPage,
      fetchNextPage: listUsersQuery.fetchNextPage,
    }),
    [listUsersQuery.fetchNextPage, listUsersQuery.hasNextPage],
  )

  return (
    <>
      <div className="flex items-end justify-between">
        <div className="flex items-center justify-start gap-4">
          <FormItem>
            <YearMonthSelect yearMonthValue={yearMonthValue} handleYearMonthChange={handleYearMonthChange} />
          </FormItem>
          <FormItem>
            <Label htmlFor="customerNumber" className="text-sm">
              お客様番号（前方一致）
            </Label>
            <Input
              id="customerNumber"
              type="text"
              value={customerNumberPrefixValue}
              onChange={handleCustomerNumberPrefixChange}
              placeholder=""
            />
          </FormItem>
        </div>
        <div className="text-sm">全 {String(listUsersQuery.data?.pages[0]?.paging?.totalCount ?? 0)} 件</div>
      </div>
      <DataTable columns={columns} data={users} infiniteScrollProps={infiniteScrollProps} />
    </>
  )
}
