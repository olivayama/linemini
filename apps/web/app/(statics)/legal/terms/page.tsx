import React from 'react'

import { Metadata } from 'next'

import { Terms } from '@/components/legal/terms'

export const metadata: Metadata = {
  title: '利用規約',
}

export default function PrivacyPage() {
  return (
    <main className="h-full pb-ios-safe-area-bottom">
      <Terms className="p-4" />
    </main>
  )
}
