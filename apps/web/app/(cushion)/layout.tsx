import React from 'react'

import type { Metadata } from 'next'
import { Noto_Sans_JP } from 'next/font/google'

import { GoogleTagManager } from '@next/third-parties/google'
import 'swiper/css'
import 'swiper/css/pagination'

import { appConfig } from '@/app/config'
import { ErrorProvider } from '@/components/error-boundary/error-provider'
import { Toaster } from '@/components/ui/toaster'
import { cn } from '@/components/utils'
import { LiffProvider } from '@/providers/liff-provider'
import { RootProviders } from '@/providers/root-providers'

import { InitEruda } from '../init-eruda'

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

export const metadata: Metadata = {
  title: appConfig.serviceName,
  description: appConfig.description,
}

export default function MiniLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&family=Noto+Sans+JP&family=Shippori+Mincho:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('h-full overflow-hidden font-main', notoSansJP.variable)}>
        <RootProviders>
          <LiffProvider liffId={appConfig.liffId} liffEndpointPathname={appConfig.liffEndpointPathname}>
            <ErrorProvider>{children}</ErrorProvider>
          </LiffProvider>
        </RootProviders>
        <Toaster />
      </body>
      <GoogleTagManager gtmId={appConfig.gtm.id} />
      <InitEruda enabled={['localhost', 'dev'].includes(appConfig.appEnv)} />
    </html>
  )
}
