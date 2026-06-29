'use client'

import React from 'react'

import { Icon, iconClassNames } from '@/components/icons'
import { cn } from '@/components/utils'

export type SimpleListItemProps = {
  title: string
  icon: keyof typeof iconClassNames
  accessoryIcon?: keyof typeof iconClassNames
  onClick?: () => void
  value?: string
}

export const SimpleListItem: React.FC<{ item: SimpleListItemProps; className?: string }> = ({ item, className }) => {
  return (
    <li
      className={cn('grid h-16 grid-cols-[1fr_auto] items-center justify-between gap-2 px-4', className)}
      onClick={item.onClick}
    >
      <div className="flex place-items-center justify-between gap-2">
        <Icon i={item.icon} className="h-6 w-6" />
        <div className="grid w-full gap-0">
          <div>{item.title}</div>
          <div className="text-xs text-muted-foreground">{item.value != null && item.value}</div>
        </div>
      </div>
      <Icon
        i={item.accessoryIcon != null ? item.accessoryIcon : 'chevronRight'}
        className="h-5 w-5 text-muted-foreground"
      />
    </li>
  )
}
