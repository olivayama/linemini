import React from 'react'

import { Metadata } from 'next'

import { ProfileForm } from './profile-form'

export const metadata: Metadata = {
  title: 'アンケート',
}

export default function ProfileNewPage() {
  return (
    <main className="h-full overflow-y-scroll">
      <div className="h-full pb-ios-safe-area-bottom">
        <ProfileForm />
      </div>
    </main>
  )
}
