'use client'

import React from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

import { Button } from '../../ui/button'
import { cn } from '../../utils'
import { useAdminSidebar } from './use-sidebar'

export const AdminSidebarExpander: React.FC = () => {
  const { toggleExpand } = useAdminSidebar()
  return (
    <Button variant="outline" type="button" onClick={toggleExpand}>
      <span className="i-lucide-menu" />
    </Button>
  )
}

export const AdminSidebar: React.FC<{
  items: { name: string; icon: React.ReactNode; href: string; alt: string[] }[]
}> = (props) => {
  const pathname = usePathname()
  const { expand } = useAdminSidebar()

  return (
    <aside className="flex h-full flex-col border-r border-dashed bg-background px-4">
      <nav className="flex flex-col items-center gap-4 py-5">
        {props.items.map((item, index) => {
          return expand ? (
            <Button
              key={index}
              variant="ghost"
              type="button"
              className={cn(
                'flex w-full items-center justify-start gap-2 px-2',
                pathname.startsWith(item.href) || item.alt.some((x) => pathname.startsWith(x))
                  ? 'bg-popover-foreground text-background'
                  : 'bg-popover',
              )}
              asChild
            >
              <Link href={item.href}>
                {item.icon}
                {item.name}
              </Link>
            </Button>
          ) : (
            <Tooltip key={index} delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  type="button"
                  className={cn(
                    pathname.startsWith(item.href) || item.alt.some((x) => pathname.startsWith(x))
                      ? 'bg-popover-foreground text-background'
                      : 'bg-popover',
                  )}
                  asChild
                >
                  <Link href={item.href}>
                    {item.icon}
                    <span className="sr-only">{item.name}</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.name}</TooltipContent>
            </Tooltip>
          )
        })}
      </nav>
    </aside>
  )
}
