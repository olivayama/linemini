import React from 'react'

import { Metadata } from 'next'

import { BottomNavigationLayout } from '@/components/bottom-navigation/bottom-navigation-layout'
import { Icon } from '@/components/icons'
import { Separator } from '@/components/ui/separator'

import { CustomerNumber } from './customer-number'

export const metadata: Metadata = {
  title: 'お問い合わせ',
}
export default function ContactPage() {
  return (
    <BottomNavigationLayout>
      <main className="grid gap-4 p-4">
        <div className="text-sm">
          「 よくある質問」をご確認の上、解決しない場合は下記お問い合わせ先にご連絡ください。
        </div>
        <CustomerNumber />
        <div className="grid gap-3">
          <div className="font-semibold">お問い合わせ先</div>
          <div className="grid gap-2 rounded-xl border bg-background p-4">
            <div>xxxagencynamexxx</div>
            <div className="flex items-center gap-2">
              <Icon i="tel" className="h-6 w-6" />
              <a href="tel: xxxagencytelxxx" className="text-2xl font-bold">
                {' '}
                xxxagencytelxxx
              </a>
            </div>
            <Separator />
            <div className="text-xs leading-relaxed">
              受付時間 xxxagencyhoursxxx <br />
              （土・日・祝日および年末年始休業期間を除く）
              <br />
              ※事情により、受付時間は変更になる場合がございます。
            </div>
          </div>
        </div>
        <div className="break-all px-1 text-xs leading-relaxed text-muted-foreground">
          ※個人情報の取り扱いについて
          <br />
          お客様の個人情報は、xxxcompanynamexxxの
          <a href="https://privacy.example.com" target="_blank" className="underline">
            プライバシーポリシー
          </a>
          に従い利用させていただきます。
        </div>
      </main>
    </BottomNavigationLayout>
  )
}
