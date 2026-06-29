'use client'

import React from 'react'

import { useLocalStorage } from 'react-use'

import { AdminSidebarContext } from './sidebar-context'

const ADMIN_SIDEBAR_EXPAND_LOCAL_STORAGE_KEY = 'admin-sidebar-expand'

export const AdminSidebarProvider: React.FC<{ children: React.ReactNode }> = (props) => {
  const [expand, setExpand] = useLocalStorage(ADMIN_SIDEBAR_EXPAND_LOCAL_STORAGE_KEY, true)

  return (
    <AdminSidebarContext.Provider
      value={{
        expand: expand ?? true,
        toggleExpand: () => setExpand(!expand),
      }}
    >
      {props.children}
    </AdminSidebarContext.Provider>
  )
}
