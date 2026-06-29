'use client'

import React from 'react'

import dynamic from 'next/dynamic'

import { cn } from '@/components/utils'

import './terms.css'

const TermsContent = dynamic(() => import('./terms.mdx'))

export const Terms: React.FC<{ className?: string }> = (props) => {
  return (
    <div className={cn('terms-wrapper prose prose-sm mx-auto max-w-[620px]', props.className)}>
      <TermsContent />
    </div>
  )
}
