'use client'

import React from 'react'

import dynamic from 'next/dynamic'

import { cn } from '@/components/utils'

import './privacy.css'

const PrivacyContent = dynamic(() => import('./privacy.mdx'))

export const Privacy: React.FC<{ className?: string }> = (props) => {
  return (
    <div className={cn('privacy-wrapper prose prose-sm mx-auto max-w-[620px]', props.className)}>
      <PrivacyContent />
    </div>
  )
}
