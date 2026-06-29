'use client'

// ref. https://ui.shadcn.com/docs/components/data-table
import { useEffect, useMemo } from 'react'

import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useInView } from 'react-intersection-observer'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

type InfiniteScrollProps = {
  hasNextPage: boolean
  fetchNextPage: () => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  infiniteScrollProps,
}: DataTableProps<TData, TValue> & { infiniteScrollProps?: InfiniteScrollProps }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const { ref, inView } = useInView()

  const hasNextPage = useMemo(() => infiniteScrollProps?.hasNextPage, [infiniteScrollProps?.hasNextPage])
  const fetchNextPage = useMemo(() => infiniteScrollProps?.fetchNextPage, [infiniteScrollProps?.fetchNextPage])

  useEffect(() => {
    if (fetchNextPage != null && hasNextPage && inView) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, inView])

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        {/* TableHeader 固定 */}
        <TableHeader className="sticky top-0 bg-white shadow-sm">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length !== 0 ? (
            <>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : ''}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))}
              <TableRow ref={ref} />
            </>
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                データがありません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
