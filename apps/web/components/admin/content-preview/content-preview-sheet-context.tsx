'use client'

import React from 'react'

import { PlainMessage } from '@bufbuild/protobuf'

import { DateOnly } from '@/gen/stdutils/date_only_pb'

export type AdminContentPreviewSheetContentValue =
  | {
      type: 'plain'
      value?: string | number
    }
  | {
      type: 'date-only'
      value?: PlainMessage<DateOnly>
    }
  | {
      type: 'datetime'
      value?: Date
    }
  | {
      type: 'datetime-range'
      value: [Date | undefined, Date | undefined]
    }
  | {
      type: 'image'
      value?: string
    }
  | {
      type: 'link'
      value?: string
    }
  | {
      type: 'text'
      value?: string
    }

export type AdminContentPreviewSheetContent = {
  title: string
  sections: {
    name?: string
    fields: {
      name: string
      value: AdminContentPreviewSheetContentValue
    }[]
  }[]
  actions?: {
    type: 'link'
    href: string
    text: string
  }[]
}

export type AdminContentPreviewSheetContextType = {
  content?: AdminContentPreviewSheetContent
  setContent: (content: AdminContentPreviewSheetContent | undefined) => void
}

export const AdminContentPreviewSheetContext = React.createContext<AdminContentPreviewSheetContextType>({
  setContent: () => {
    throw new Error('AdminContentPreviewSheetContext is not provided')
  },
})
