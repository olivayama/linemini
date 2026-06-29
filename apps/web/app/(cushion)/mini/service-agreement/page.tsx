import React, { Suspense } from 'react'

import { Metadata } from 'next'

import { Privacy } from '@/components/legal/privacy'

import { AgreeForm } from './agree-form'

export const metadata: Metadata = {
  title: '同意',
}

export default function AgreementPage() {
  return (
    <main className="bg-onboarding h-full max-w-[620px] pb-ios-safe-area-bottom">
      <div className="mx-4 grid h-full grid-rows-[auto_1fr_auto] gap-4 py-4">
        <div>
          ミニアプリをご利用いただくためには、プライバシーポリシーに同意いただく必要があります。下記の内容をよくお読みいただき、同意いただける場合はチェックをお願いします。
        </div>

        <Privacy className="w-full overflow-y-scroll rounded border bg-white p-4" />

        <Suspense>
          <AgreeForm />
        </Suspense>
      </div>
    </main>
  )
}
