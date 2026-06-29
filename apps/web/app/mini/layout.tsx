import React from 'react'

import type { Metadata } from 'next'
import { Noto_Sans_JP } from 'next/font/google'

import { GoogleTagManager } from '@next/third-parties/google'
import 'swiper/css'
import 'swiper/css/pagination'

import { appConfig } from '@/app/config'
import { ErrorProvider } from '@/components/error-boundary/error-provider'
import { RequireSession } from '@/components/require-session'
import { Toaster } from '@/components/ui/toaster'
import { cn } from '@/components/utils'
import { WaitLiffInit } from '@/components/wait-liff-init'
import { LiffProvider } from '@/providers/liff-provider'
import { RootProviders } from '@/providers/root-providers'

import { InitEruda } from '../init-eruda'
import './globals.css'

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
  // Android Chrome のキーボード表示時にレイアウトを縮めず iOS と同じくオーバーレイさせる
  interactiveWidget: 'overlays-content',
}

export const metadata: Metadata = {
  title: appConfig.serviceName,
  description: appConfig.description,
}

// ドロワーが開いたときに自動でbodyの背景色を黒に書き換えられるので、bodyとvaul-drawer-wrapperに同じ背景色を設定しておく
const bgColor = 'bg-muted'

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
      <body className={cn('!h-full overflow-hidden font-main', bgColor, notoSansJP.variable)}>
        <RootProviders>
          <LiffProvider liffId={appConfig.liffId} liffEndpointPathname={appConfig.liffEndpointPathname}>
            <ErrorProvider>
              <WaitLiffInit>
                <RequireSession />
                <div vaul-drawer-wrapper="" className={cn('h-full', bgColor)}>
                  {children}
                </div>
                <GoogleTagManager gtmId={appConfig.gtm.id} />
              </WaitLiffInit>
            </ErrorProvider>
          </LiffProvider>
        </RootProviders>
        <Toaster />
      </body>
      <InitEruda enabled={['localhost', 'dev'].includes(appConfig.appEnv)} />
    </html>
  )
}
