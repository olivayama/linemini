'use client'

import React from 'react'

export const AdminSidebarContext = React.createContext<{ expand: boolean; toggleExpand: () => void }>({
  expand: true,
  toggleExpand: () => {},
})
