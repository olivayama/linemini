'use client'

import React from 'react'

import { ScrollArea } from '../ui/scroll-area'

export const AdminPageContainer: React.FC<{ children: React.ReactNode; scroll?: boolean }> = ({ scroll, children }) => {
  return scroll ? (
    <ScrollArea className="h-full">
      <AdminPageContainer>{children}</AdminPageContainer>
    </ScrollArea>
  ) : (
    <div className="flex h-full flex-col gap-4 px-8 py-4">{children}</div>
  )
}
