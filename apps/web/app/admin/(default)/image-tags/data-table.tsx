'use client'

import React from 'react'

import { useQuery } from '@connectrpc/connect-query'
import { ColumnDef, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table'

import { AdminContentPreviewSheetContent } from '@/components/admin/content-preview/content-preview-sheet-context'
import { AdminContentPreviewSheetTriggerButton } from '@/components/admin/content-preview/content-preview-sheet-trigger-button'
import { ResourceActionDropdown } from '@/components/admin/resource-action-dropdown'
import { useAdminSession } from '@/components/admin/session/use-admin-session'
import { DataTable } from '@/components/ui/data-table'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { ImageTag } from '@/gen/services/image/v1/image_pb'
import { listImageTags } from '@/gen/services/image/v1/image_service-ImageService_connectquery'

const ActionDropdownMenu: React.FC<{ id: string }> = (props) => {
  return <ResourceActionDropdown id={props.id} editHref={`/admin/image-tags/${props.id}`} />
}

const adminContentPreviewSheetContent = (imageTag: ImageTag): AdminContentPreviewSheetContent => ({
  title: '画像タグ詳細',
  sections: [
    {
      fields: [
        {
          name: '管理名',
          value: { type: 'plain', value: imageTag.adminName },
        },
        {
          name: '編集不可',
          value: { type: 'plain', value: imageTag.isLocked ? 'はい' : 'いいえ' },
        },
        {
          name: '登録日時',
          value: { type: 'plain', value: imageTag?.createdAt?.toDate().toLocaleString() },
        },
        {
          name: '更新日時',
          value: { type: 'plain', value: imageTag?.updatedAt?.toDate().toLocaleString() },
        },
      ],
    },
  ],
  actions: imageTag.isLocked
    ? []
    : [
        {
          type: 'link',
          text: '編集',
          href: `/admin/image-tags/${imageTag.id}`,
        },
      ],
})

const columns: ColumnDef<ImageTag>[] = [
  {
    id: 'adminName',
    header: '管理名',
    cell: ({ row }) => {
      return (
        <AdminContentPreviewSheetTriggerButton
          text={row.original.adminName}
          content={adminContentPreviewSheetContent(row.original)}
        />
      )
    },
  },
  {
    id: 'isLocked',
    header: '編集不可',
    accessorFn: (row) => (row.isLocked ? 'はい' : 'いいえ'),
  },
  {
    accessorKey: 'createdAt',
    header: '登録日時',
    accessorFn: (row) => row.createdAt?.toDate().toLocaleString(),
  },
  {
    accessorKey: 'updatedAt',
    header: '更新日時',
    accessorFn: (row) => row.updatedAt?.toDate().toLocaleString(),
  },
  {
    id: '$actions',
    header: '操作',
    cell: ({ row }) => {
      if (!row.original.isLocked) {
        return <ActionDropdownMenu id={row.original.id} />
      }
    },
  },
]

export const ImageTagDataTable: React.FC = () => {
  const adminSession = useAdminSession()

  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
  const listImageTagsQuery = useQuery(
    listImageTags,
    adminSession.query({
      paging: {
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
      },
    }),
  )
  const data = listImageTagsQuery.data?.imageTags ?? []
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    rowCount: Number(listImageTagsQuery.data?.paging?.totalCount ?? 0),
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
  })
  return (
    <>
      <div className="flex items-end justify-between">
        <div className="flex w-full justify-end text-sm">
          全 {String(listImageTagsQuery.data?.paging?.totalCount ?? 0)} 件
        </div>
      </div>
      <DataTable columns={columns} data={data} />
      <DataTablePagination table={table} />
    </>
  )
}
