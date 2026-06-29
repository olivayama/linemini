import React from 'react'

import { appConfig } from '@/app/config'
import { SessionManager } from '@/utils/session-manager'

import { Account } from './account'

export default async function AccountPage() {
  const sessionManager = new SessionManager(appConfig.cookie.user)
  const session = await sessionManager.getSession()
  return (
    <main className="h-full">
      <Account lineUid={session?.lineUid} />
    </main>
  )
}
