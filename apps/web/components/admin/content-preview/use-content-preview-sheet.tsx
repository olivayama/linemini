'use client'

import React from 'react'

import { AdminContentPreviewSheetContext } from './content-preview-sheet-context'

export const useAdminContentPreviewSheet = () => {
  const ctx = React.useContext(AdminContentPreviewSheetContext)
  return ctx
}
