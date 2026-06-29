import React from 'react'

import { Metadata } from 'next'

import { BottomNavigationLayout } from '@/components/bottom-navigation/bottom-navigation-layout'

import { FAQ } from './faq'

export const metadata: Metadata = {
  title: 'よくある質問',
}
export default function FaqPage() {
  return (
    <BottomNavigationLayout>
      <main className="p-4">
        <FAQ />
      </main>
    </BottomNavigationLayout>
  )
}
