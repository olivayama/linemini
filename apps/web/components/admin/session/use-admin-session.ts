'use client'

import React from 'react'

import { AdminSessionContext } from './admin-session-context'

export const useAdminSession = () => {
  const ctx = React.useContext(AdminSessionContext)
  return ctx
}
