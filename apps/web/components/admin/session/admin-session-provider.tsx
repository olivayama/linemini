'use client'

// IMPORTANT: ReactQueryProvider の外側で使われるので、react-query は使ってはいけない
import React from 'react'

import { useRouter } from 'next/navigation'

import { disableQuery } from '@connectrpc/connect-query'
import { sendGTMEvent } from '@next/third-parties/google'

import { AdminSessionContext } from './admin-session-context'

export const AdminSessionProvider: React.FC<{ children: React.ReactNode }> = (props) => {
  // loading | loaded | deleting | deleted とかじゃだめ？

  const router = useRouter()
  const sessionReadySentRef = React.useRef(false)
  const [isLoggedIn, setIsLoggedIn] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [accessToken, setAccessToken] = React.useState<string>()
  const [statusCode, setStatusCode] = React.useState<number>()

  // Load token from cookie
  const init = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/session?sessionType=admin')
      console.log('GET /api/session', res.status)
      setStatusCode(res.status)
      if (res.ok) {
        const body = (await res.json()) as { accessToken: string; userId: string }
        setIsLoggedIn(true)
        setAccessToken(body.accessToken)
        // /api/session の Set-Cookie で gtm_user_id / gtm_line_uid がセットされた直後に GTM へ通知する。
        // AdminSessionProvider は layout 内で SPA 遷移をまたいで生存するため、ref でブラウザリロードあたり 1 回だけ発火させる。
        if (!sessionReadySentRef.current) {
          sendGTMEvent({ event: 'session_ready' })
          sessionReadySentRef.current = true
        }
      }
      return res.status
    } finally {
      setIsLoading(false)
      console.log('finish GET /api/session')
    }
  }, [])

  // Set token to cookie
  const signIn = React.useCallback(async (payload: { email: string; password: string }) => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/session?sessionType=admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      console.log(res.status)
      setStatusCode(res.status)
      if (res.ok) {
        const body = (await res.json()) as { accessToken: string; userId: string }
        setIsLoggedIn(true)
        setAccessToken(body.accessToken)
        if (!sessionReadySentRef.current) {
          sendGTMEvent({ event: 'session_ready' })
          sessionReadySentRef.current = true
        }
      }
      return res.ok
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Delete token from cookie
  const signOut = React.useCallback(
    async (opts?: { redirectTo?: string }) => {
      const res = await fetch('/api/session?sessionType=admin', {
        method: 'DELETE',
      })
      if (res.ok) {
        setAccessToken(undefined)
        setIsLoggedIn(false)
        if (opts?.redirectTo != null) {
          router.push(opts.redirectTo)
        } else {
          setStatusCode(401)
        }
      }
    },
    [router],
  )

  const query = React.useCallback(
    <T extends {}>(v: T) => {
      if (isLoggedIn) return v
      else return disableQuery
    },
    [isLoggedIn],
  )

  return (
    <AdminSessionContext.Provider
      value={{
        isLoading,
        isLoggedIn,
        accessToken,
        statusCode,
        init,
        signIn,
        signOut,
        query,
      }}
    >
      {props.children}
    </AdminSessionContext.Provider>
  )
}
