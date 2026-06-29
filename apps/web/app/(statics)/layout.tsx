import React from 'react'

import { Noto_Sans_JP } from 'next/font/google'

import { cn } from '@/components/utils'

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--noto-sans-jp-font',
})

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function StaticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&family=Noto+Sans+JP&family=Shippori+Mincho:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('min-h-dvh font-main', notoSansJP.variable)}>{children}</body>
    </html>
  )
}
