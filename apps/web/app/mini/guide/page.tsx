import React from 'react'

import { Metadata } from 'next'

import { GuideTutorial } from './guide-tutorial'

export const metadata: Metadata = {
  title: 'ガイド',
}
export default function GuidePage() {
  return (
    <main className="bg-onboarding h-full pb-ios-safe-area-bottom">
      <GuideTutorial />
    </main>
  )
}
