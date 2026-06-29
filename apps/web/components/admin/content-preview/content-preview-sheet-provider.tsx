'use client'

import React from 'react'

import Link from 'next/link'

import { SanitizedHTML } from '@/components/sanitized-html'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatDateOnly } from '@/stdutils/date-only'
import { formatYMDDotOpt } from '@/stdutils/intl'
import { mapOption } from '@/stdutils/option'

import {
  AdminContentPreviewSheetContent,
  AdminContentPreviewSheetContentValue,
  AdminContentPreviewSheetContext,
} from './content-preview-sheet-context'

const AdminContentPreviewSheetContentValueCell: React.FC<{ value: AdminContentPreviewSheetContentValue }> = (props) => {
  switch (props.value.type) {
    case 'plain':
      return <p>{props.value.value}</p>
    case 'date-only':
      return <p>{mapOption(props.value.value, formatDateOnly) ?? 'なし'}</p>
    case 'datetime':
      return <p>{formatYMDDotOpt(props.value.value) ?? 'なし'}</p>
    case 'datetime-range':
      return (
        <p>
          {formatYMDDotOpt(props.value.value[0])}～{formatYMDDotOpt(props.value.value[1])}
        </p>
      )
    case 'image':
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={props.value.value} alt="" />
    case 'link':
      return (
        <a href={props.value.value} target="_blank" rel="noopener noreferrer">
          {props.value.value}
        </a>
      )
    case 'text':
      return <SanitizedHTML className="preserve-whitespace" htmlContent={props.value.value} />
  }
}

// TODO: heading のセマンティクス再考
export const AdminContentPreviewSheetProvider: React.FC<{ children: React.ReactNode }> = (props) => {
  const [content, setContent] = React.useState<AdminContentPreviewSheetContent>()

  return (
    <AdminContentPreviewSheetContext.Provider
      value={{
        content,
        setContent,
      }}
    >
      {props.children}
      <Sheet
        open={content != null}
        onOpenChange={(v) => {
          if (!v) {
            setContent(undefined)
          }
        }}
      >
        {/* admin layout の DOM の外なので、ここでも .admin が必要 */}
        <SheetContent className="admin grid h-full grid-rows-sheet-content">
          <SheetHeader>
            <SheetTitle>{content?.title}</SheetTitle>
            <SheetDescription />
          </SheetHeader>
          <ScrollArea className="-mx-6 flex flex-col gap-6 px-6">
            {content?.sections.map((section, i) => {
              return (
                <div key={i} className="space-y-2">
                  {section.name != null && <div className="text-lg font-bold">{section.name}</div>}
                  <div className="space-y-4 rounded-lg bg-popover p-4">
                    {section.fields.map((field, j) => {
                      return (
                        <div key={j} className="space-y-4 break-all">
                          <h3 className="text-gray-500">{field.name}</h3>
                          <AdminContentPreviewSheetContentValueCell value={field.value} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </ScrollArea>
          <div className="flex justify-end gap-2">
            {content?.actions?.map((action, i, actions) => {
              return (
                <Button
                  variant={actions.length > 1 && i < actions.length - 1 ? 'tertiary' : 'secondary'}
                  className="rounded-full"
                  key={i}
                  asChild
                >
                  <Link
                    href={action.href}
                    onClick={() => {
                      setContent(undefined)
                    }}
                  >
                    {action.text}
                  </Link>
                </Button>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    </AdminContentPreviewSheetContext.Provider>
  )
}
