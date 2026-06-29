import React from 'react'

import Image from 'next/image'

import { appConfig } from '@/app/config'
import { RequireAdminSession } from '@/components/admin/session/require-admin-session'
import { AdminSidebar, AdminSidebarExpander } from '@/components/admin/sidebar'

import { AdminSignOutButton } from './sign-out-button'

export default function AdminIndexDefaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAdminSession>
      <div className="grid h-full grid-rows-admin-layout-shell">
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex place-items-center gap-4">
            <AdminSidebarExpander />
            <div className="flex place-items-center gap-2">
              <Image
                src="/admin/assets/images/logos/app-logo.png"
                unoptimized
                priority={true}
                alt="app logo"
                width={284}
                height={351}
                className="w-12 object-contain"
              />
              <span className="font-bold">xxxappnamexxx</span>
              {appConfig.appEnv !== 'prd' && <span className="text-muted-foreground">- {appConfig.appEnv}</span>}
            </div>
          </div>
          <AdminSignOutButton />
        </div>
        <div className="flex h-full w-full overflow-hidden">
          <AdminSidebar
            items={[
              {
                name: 'ユーザー',
                icon: <span className="i-lucide-user" />,
                href: '/admin/users',
                alt: [],
              },
              {
                name: '画像',
                icon: <span className="i-lucide-image" />,
                href: '/admin/images',
                alt: [],
              },
              {
                name: '画像タグ',
                icon: <span className="i-lucide-tag" />,
                href: '/admin/image-tags',
                alt: [],
              },
            ]}
          />
          <main className="h-full flex-grow overflow-hidden">{children}</main>
        </div>
      </div>
    </RequireAdminSession>
  )
}
