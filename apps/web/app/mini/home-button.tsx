'use client'

import React from 'react'

import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'

export const HomeButton: React.FC = () => {
  const router = useRouter()
  return (
    <Button variant="secondary" onClick={() => router.replace('/mini/home')}>
      トップに移動
    </Button>
  )
}
