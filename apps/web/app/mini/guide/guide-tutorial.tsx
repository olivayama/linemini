'use client'

import React from 'react'

import { useRouter } from 'next/navigation'

import { Tutorial } from '@/components/tutorial'

export const GuideTutorial: React.FC = () => {
  const router = useRouter()
  const handleCompleteTutorial = () => {
    router.push('/mini/more')
  }

  return <Tutorial completeButtonText="閉じる" onCompleteTutorial={handleCompleteTutorial} />
}
