'use client'

import React from 'react'

import { cn } from '@/components/utils'

import { AdminContentPreviewSheetContent, AdminContentPreviewSheetContext } from './content-preview-sheet-context'

export const useAdminContentPreviewSheet = () => {
  const ctx = React.useContext(AdminContentPreviewSheetContext)
  return ctx
}

export const AdminContentPreviewSheetTriggerButton: React.FC<{
  text: string
  content: AdminContentPreviewSheetContent
  className?: string
}> = (props) => {
  const adminContentPreviewSheet = useAdminContentPreviewSheet()
  return (
    <button
      className={cn(
        'break-all text-left font-medium text-blue-500 underline-offset-4 hover:underline',
        props.className,
      )}
      onClick={() => {
        adminContentPreviewSheet.setContent(props.content)
      }}
    >
      {props.text}
    </button>
  )
}
