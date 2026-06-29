'use client'

// IMPORTANT: ReactQueryProvider の外側で使われるので、react-query は使ってはいけない
import React from 'react'

import { useRouter } from 'next/navigation'

import { disableQuery } from '@connectrpc/connect-query'
import { sendGTMEvent } from '@next/third-parties/google'

// import { appConfig } from '@/app/config'
// import { waitForCookie } from '@/stdutils/wait-for-cookie'

export type Session = {
  isLoading: boolean
  isLoggedIn: boolean
  accessToken?: string
  userId?: string
  statusCode?: number
}

export type SessionContextType = Session & {
  init: () => Promise<number>
  signIn: (
    payload:
      | {
          type: 'line'
          token: string
          signUpParams?: {
            referrer?: string
            firstAccessPath: string
            serviceAgreementVersion: string
          }
        }
      | { type: 'guest' },
  ) => Promise<number>
  signOut: (opts?: { redirectTo?: string }) => Promise<void>
  query: <Q extends {}>(q: Q) => Q | typeof disableQuery
}

export const SessionContext = React.createContext<SessionContextType>({
  isLoading: true,
  isLoggedIn: false,
  statusCode: undefined,
  accessToken: undefined,
  userId: undefined,
  init: async () => 0,
  signIn: async () => 0,
  signOut: async () => {},
  query: () => disableQuery,
})

export const SessionProvider: React.FC<{ children: React.ReactNode }> = (props) => {
  // loading | loaded | deleting | deleted とかじゃだめ？

  const router = useRouter()
  const sessionReadySentRef = React.useRef(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [accessToken, setAccessToken] = React.useState<string>()
  const [userId, setUserId] = React.useState<string>()
  const [statusCode, setStatusCode] = React.useState<number>()

  const isLoggedIn = React.useMemo(() => statusCode === 200 && accessToken != null, [statusCode, accessToken])

  // Load token from cookie
  const init = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/session?sessionType=user')
      console.log('GET /api/session', res.status)
      setStatusCode(res.status)
      if (res.ok) {
        const body = (await res.json()) as { accessToken: string; userId: string; lineUid: string }
        setAccessToken(body.accessToken)
        setUserId(body.userId)
        // SessionProvider は layout 内で SPA 遷移をまたいで生存するため、ref でブラウザリロードあたり 1 回だけ発火させる。
        if (!sessionReadySentRef.current) {
          sessionReadySentRef.current = true
          // Cookie 反映を待たなくても session_ready / custom dimension は正常に取れているようなので、一旦コメントアウトして様子見する。
          // custom dimension に (not set) が発生するようならコメントインし、Cookie 登録 (Set-Cookie 反映) 遅延の可能性を調査する。
          // await waitForCookie(appConfig.gtm.userIdCookie.name)
          sendGTMEvent({ event: 'session_ready', user_id: body.userId, line_uid: body.lineUid })
        }
      }
      return res.status
    } finally {
      setIsLoading(false)
      console.log('finish GET /api/session')
    }
  }, [])

  // Set token to cookie
  const signIn = React.useCallback(
    async (
      payload:
        | {
            type: 'line'
            token: string
            signUpParams?: {
              referrer?: string
              serviceAgreementVersion: string
              firstAccessPath: string
            }
          }
        // guestを将来サポートするときのために予め実装している。
        | { type: 'guest' },
    ) => {
      try {
        setIsLoading(true)
        const res = await fetch('/api/session?sessionType=user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
        console.log(res.status)
        setStatusCode(res.status)
        if (res.ok) {
          const body = (await res.json()) as {
            accessToken: string
            userId: string
            // lineログイン以外の場合は空文字になる
            lineUid: string
          }
          setAccessToken(body.accessToken)
          setUserId(body.userId)
          // SessionProvider は layout 内で SPA 遷移をまたいで生存するため、ref でブラウザリロードあたり 1 回だけ発火させる。
          if (!sessionReadySentRef.current) {
            sessionReadySentRef.current = true
            // Cookie 反映を待たなくても session_ready / custom dimension は正常に取れているようなので、一旦コメントアウトして様子見する。
            // custom dimension に (not set) が発生するようならコメントインし、Cookie 登録 (Set-Cookie 反映) 遅延の可能性を調査する。
            // await waitForCookie(appConfig.gtm.userIdCookie.name)
            sendGTMEvent({ event: 'session_ready', user_id: body.userId, line_uid: body.lineUid })
          }
        }
        return res.status
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  // Delete token from cookie
  const signOut = React.useCallback(
    async (opts?: { redirectTo?: string }) => {
      const res = await fetch('/api/session?sessionType=user', {
        method: 'DELETE',
      })
      if (res.ok) {
        setAccessToken(undefined)
        setUserId(undefined)
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
    <Q extends {}>(q: Q) => {
      if (isLoggedIn) return q
      else return disableQuery
    },
    [isLoggedIn],
  )

  return (
    <SessionContext.Provider
      value={{
        isLoading,
        isLoggedIn,
        accessToken,
        userId,
        statusCode,
        init,
        signIn,
        signOut,
        query,
      }}
    >
      {props.children}
    </SessionContext.Provider>
  )
}

export const useUserSession = () => {
  const ctx = React.useContext(SessionContext)
  return ctx
}
