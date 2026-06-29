'use client'

import React, { useEffect, useRef } from 'react'

import { useRouter } from 'next/navigation'

import { AdminPageLoader } from '@/components/ui/loader'

import { useAdminSession } from './use-admin-session'

export const RequireAdminSession: React.FC<{ enableGuestLogin?: boolean; children: React.ReactNode }> = (props) => {
  const router = useRouter()
  const initRef = useRef(false)
  const { signIn, init: initSession, isLoggedIn } = useAdminSession()

  useEffect(() => {
    if (initRef.current) {
      return
    }
    initRef.current = true
    ;(async () => {
      const statusCode = await initSession()
      /* TODO: 500 エラーのハンドリング */
      if (statusCode !== 200 && statusCode < 500) {
        router.replace('/admin/sign-in')
      }
    })()
  }, [initSession, props.enableGuestLogin, router, signIn])

  return <>{!isLoggedIn ? <AdminPageLoader /> : props.children}</>
}
