import React from 'react'

import { Noto_Sans_JP } from 'next/font/google'

import { AdminContentPreviewSheetProvider } from '@/components/admin/content-preview/content-preview-sheet-provider'
import { AdminImageSheetProvider } from '@/components/admin/image/image-sheet-provider'
import { AdminSessionProvider } from '@/components/admin/session/admin-session-provider'
import { AdminSidebarProvider } from '@/components/admin/sidebar/sidebar-provider'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/components/utils'
import { ConnectrpcProvider } from '@/providers/connectrpc-provider'

import './globals.css'

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--noto-sans-jp-font',
})

export default function AdminIndexLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={cn('h-full font-main', notoSansJP.variable)}>
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&family=Noto+Sans+JP&family=Shippori+Mincho:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('h-full text-sm')}>
        <div className="h-full w-full">
          <TooltipProvider>
            <AdminSidebarProvider>
              <AdminSessionProvider>
                <ConnectrpcProvider isAdmin>
                  <AdminImageSheetProvider>
                    <AdminContentPreviewSheetProvider>{children}</AdminContentPreviewSheetProvider>
                  </AdminImageSheetProvider>
                </ConnectrpcProvider>
              </AdminSessionProvider>
            </AdminSidebarProvider>
          </TooltipProvider>
          <Toaster />
        </div>
      </body>
    </html>
  )
}
