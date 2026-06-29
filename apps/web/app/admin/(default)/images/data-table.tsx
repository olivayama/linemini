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
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Image, ImageTag } from '@/gen/services/image/v1/image_pb'
import { listImageTags, listImages } from '@/gen/services/image/v1/image_service-ImageService_connectquery'

const PAGE_SIZE = 10

const ActionDropdownMenu: React.FC<{ id: string }> = (props) => {
  return <ResourceActionDropdown id={props.id} editHref={`/admin/images/${props.id}`} />
}

const adminContentPreviewSheetContent = (image: Image, imageTags?: ImageTag[]): AdminContentPreviewSheetContent => ({
  title: '画像詳細',
  sections: [
    {
      fields: [
        {
          name: '管理名',
          value: { type: 'plain', value: image.adminName },
        },
        {
          name: '画像',
          value: { type: 'image', value: image.imageUrl },
        },
        {
          name: '画像タグ',
          value: {
            type: 'plain',
            value: image.tagIds
              .map((tagId) => imageTags?.find((tag) => tag.id === tagId)?.adminName)
              .filter(Boolean)
              .join(', '),
          },
        },
        {
          name: '登録日時',
          value: { type: 'plain', value: image?.createdAt?.toDate().toLocaleString() },
        },
        {
          name: '更新日時',
          value: { type: 'plain', value: image?.updatedAt?.toDate().toLocaleString() },
        },
      ],
    },
  ],
  actions: [
    {
      type: 'link',
      text: '編集',
      href: `/admin/images/${image.id}`,
    },
  ],
})

export const ImageDataTable: React.FC = () => {
  const adminSession = useAdminSession()

  const imageTagsQuery = useQuery(listImageTags, adminSession.query({}))

  const [selectedImageTagId, setSelectedImageTagId] = React.useState<string>()
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: PAGE_SIZE })

  const imagesQuery = useQuery(
    listImages,
    adminSession.query({
      imageTagId: selectedImageTagId === 'all' ? undefined : selectedImageTagId,
      paging: {
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
      },
    }),
  )

  const columns: ColumnDef<Image>[] = [
    {
      id: 'adminName',
      header: '管理名',
      cell: ({ row }) => {
        return (
          <AdminContentPreviewSheetTriggerButton
            text={row.original.adminName}
            content={adminContentPreviewSheetContent(row.original, imageTagsQuery.data?.imageTags)}
          />
        )
      },
    },
    {
      accessorKey: 'imageUrl',
      header: '画像',
      cell: ({ row }) => {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={row.original.imageUrl} alt="" width={200} height={100} />
      },
    },
    {
      id: 'imageTag',
      header: '画像タグ',
      cell: ({ row }) => {
        return row.original.tagIds
          .map((tagId) => imageTagsQuery.data?.imageTags.find((tag) => tag.id === tagId)?.adminName)
          .filter(Boolean)
          .join(', ')
      },
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
      cell: ({ row }) => <ActionDropdownMenu id={row.original.id} />,
    },
  ]

  const data = imagesQuery.data?.images ?? []
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    rowCount: Number(imagesQuery.data?.paging?.totalCount ?? 0),
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
  })

  return (
    <>
      <Label>画像タグ</Label>
      <Select
        onValueChange={(value) => {
          setSelectedImageTagId(value)
          setPagination({ pageIndex: 0, pageSize: PAGE_SIZE })
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="未選択" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">未選択</SelectItem>
          {imageTagsQuery.data?.imageTags.map((tag) => {
            return (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.adminName}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>

      <div className="m-2 flex items-end justify-between">
        <div className="flex w-full justify-end text-sm">全 {String(imagesQuery.data?.paging?.totalCount ?? 0)} 件</div>
      </div>

      <DataTable columns={columns} data={data} />
      <DataTablePagination table={table} />
    </>
  )
}
