import React from 'react'

import { Metadata } from 'next'

import { BottomNavigationLayout } from '@/components/bottom-navigation/bottom-navigation-layout'

import { MoreList } from './more-list'

export const metadata: Metadata = {
  title: 'その他',
}
export default function MorePage() {
  return (
    <BottomNavigationLayout className="bg-slate-100">
      <main className="grid gap-8 p-4">
        <MoreList />
      </main>
    </BottomNavigationLayout>
  )
}
