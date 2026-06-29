'use client'

import React from 'react'

import { SimpleListSection, SimpleListSectionProps } from '@/components/simple-list/simple-list-section'
import { cn } from '@/components/utils'

export const SimpleList: React.FC<{ sections: SimpleListSectionProps[]; className?: string }> = ({
  sections,
  className,
}) => {
  return (
    <div className={cn('grid gap-8', className)}>
      {sections.map((section, i) => (
        <SimpleListSection key={i} section={section} />
      ))}
    </div>
  )
}
