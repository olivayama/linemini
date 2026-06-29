import React from 'react'

import { Metadata } from 'next'

import { BottomNavigationLayout } from '@/components/bottom-navigation/bottom-navigation-layout'

import { ProfileForm } from './profile-form'

export const metadata: Metadata = {
  title: 'プロフィール',
}

export default function ProfilePage() {
  return (
    <BottomNavigationLayout>
      <main className="h-full">
        <ProfileForm />
      </main>
    </BottomNavigationLayout>
  )
}
