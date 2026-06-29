'use client'

import React from 'react'

import Link from 'next/link'

import { CopyIcon, DeleteIcon, EditIcon, EllipsisIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export const ResourceActionDropdown: React.FC<{
  id: string
  editHref?: string
  onDuplicateClick?: (id: string) => void
  onDeleteClick?: (id: string) => void
}> = (props) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-sm" variant="in-table">
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {props.editHref != null && (
          <DropdownMenuItem className="flex gap-2" asChild>
            <Link href={props.editHref}>
              <EditIcon className="size-4" />
              編集
            </Link>
          </DropdownMenuItem>
        )}
        {props.onDuplicateClick != null && (
          <DropdownMenuItem className="flex gap-2" onClick={() => props.onDuplicateClick?.(props.id)}>
            <CopyIcon className="size-4" />
            複製
          </DropdownMenuItem>
        )}
        {props.onDeleteClick != null && (
          <DropdownMenuItem className="flex gap-2" onClick={() => props.onDeleteClick?.(props.id)}>
            <DeleteIcon className="size-4" />
            削除
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
