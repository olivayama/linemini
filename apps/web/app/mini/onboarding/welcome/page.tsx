import React from 'react'

import { Metadata } from 'next'

import { WelcomeTutorial } from './welcome-tutorial'

export const metadata: Metadata = {
  title: 'ようこそ',
}
export default function WelcomePage() {
  return (
    <main className="bg-onboarding h-full pb-ios-safe-area-bottom">
      <WelcomeTutorial />
    </main>
  )
}
