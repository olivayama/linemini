import React from 'react'

import { Metadata } from 'next'

import { Privacy } from '@/components/legal/privacy'

export const metadata: Metadata = {
  title: 'プライバシーポリシー',
}

export default function PrivacyPage() {
  return (
    <main className="h-full pb-ios-safe-area-bottom">
      <Privacy className="p-4" />
    </main>
  )
}
