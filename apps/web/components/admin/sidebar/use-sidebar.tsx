'use client'

import React from 'react'

import { AdminSidebarContext } from './sidebar-context'

export const useAdminSidebar = () => {
  const ctx = React.useContext(AdminSidebarContext)
  return ctx
}
