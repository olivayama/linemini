'use client'

import React from 'react'

import { SimpleListItem, SimpleListItemProps } from '@/components/simple-list/simple-list-item'
import { cn } from '@/components/utils'

export type SimpleListSectionProps = {
  title?: string
  items: SimpleListItemProps[]
}

export const SimpleListSection: React.FC<{ section: SimpleListSectionProps; className?: string }> = ({
  section,
  className,
}) => {
  return (
    <div className={cn('grid gap-2', className)}>
      {section.title != null && <div className="text-xs text-muted-foreground">{section.title}</div>}
      <ul className="divide-y divide-solid rounded-xl bg-white">
        {section.items.map((item, i) => (
          <SimpleListItem key={item.title} item={item} />
        ))}
      </ul>
    </div>
  )
}
