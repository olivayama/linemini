'use client'

import React from 'react'

import { AdminImageSheetContext } from './image-sheet-context'

export const useAdminImageSheet = () => {
  const ctx = React.useContext(AdminImageSheetContext)
  return ctx
}
