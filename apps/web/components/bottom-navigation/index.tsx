'use client'

import React from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Icon, iconClassNames } from '@/components/icons'

export const BottomNavigation: React.FC = () => {
  const pathname = usePathname()

  const navItems: { href: string; label: string; icon: keyof typeof iconClassNames; pathGroup: string[] }[] = [
    { href: '/mini/home', label: 'ホーム', icon: 'home', pathGroup: ['/mini/home'] },
    {
      href: '/mini/more',
      label: 'その他',
      icon: 'MoreHorizontal',
      pathGroup: ['/mini/more', '/mini/contact', '/mini/faq', '/mini/guide', '/mini/users/me/profile'],
    },
  ]
  return (
    <nav className="w-full border-t border-border bg-white pb-ios-safe-area-bottom">
      <div className="flex justify-around py-2">
        {navItems.map((item) => {
          const isActive = item.pathGroup.some((path) => pathname.startsWith(path))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center text-xs ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <Icon i={item.icon} className="h-6 w-6" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
