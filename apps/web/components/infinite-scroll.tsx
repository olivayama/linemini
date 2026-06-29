'use client'

import React, { useEffect } from 'react'

import { useInView } from 'react-intersection-observer'

import { cn } from './utils'

export const InfiniteScroll: React.FC<{
  hasNextPage: boolean
  fetchNextPage: () => void
  className?: string
  children: React.ReactNode
}> = ({ hasNextPage, fetchNextPage, className, children }) => {
  const { ref, inView } = useInView()

  useEffect(() => {
    if (hasNextPage && inView) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, inView])

  return (
    <div className={cn('', className)}>
      {children}
      <div ref={ref} />
    </div>
  )
}
