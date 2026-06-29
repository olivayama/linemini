'use client'

import React, { useCallback, useRef, useState } from 'react'

import liff from '@line/liff'

// @line/liff が SSR を考慮しておらず、トップレベルで window オブジェクトを触っているため
// import liff が出来ない。よって、useEffect 内で @line/liff を dynamic import する必要がある
// この状態で、liff のインスタンスは共有したいため、context 化する

type Ctx = {
  initialized: boolean
  isInClient: boolean
  openWindow: typeof liff.openWindow
  closeWindow: typeof liff.closeWindow
  shareTargetPicker: typeof liff.shareTargetPicker
  createShortcutOnHomeScreen: typeof liff.createShortcutOnHomeScreen
  createUrl: (by: string) => Promise<string | undefined>
  logout: () => void
  login: () => void
  getIDToken: () => string | undefined
  tokenError: 'expired' | 'missing' | undefined
  isLoggedIn: () => boolean
}

export const LiffContext = React.createContext<Ctx>({
  initialized: false,
  isInClient: false,
  openWindow: async () => undefined,
  closeWindow: async () => undefined,
  shareTargetPicker: async () => undefined,
  createShortcutOnHomeScreen: async () => undefined,
  createUrl: () => Promise.resolve(undefined),
  logout: () => undefined,
  login: () => undefined,
  getIDToken: () => undefined,
  tokenError: undefined,
  isLoggedIn: () => false,
})

export const LiffProvider: React.FC<{
  liffId: string
  liffEndpointPathname: string
  children: React.ReactNode
}> = ({ liffId, liffEndpointPathname, children }) => {
  const initRef = useRef(false)
  const expRef = React.useRef<number>()
  const [initialized, setInitialized] = useState(false)
  const [isInClient, setIsInClient] = useState(false)
  const [tokenError, setTokenError] = useState<'expired' | 'missing'>()

  React.useEffect(() => {
    if (liffId == null) {
      return
    }
    if (initRef.current) {
      return
    }

    initRef.current = true
    ;(async () => {
      console.info('LiffProvider: Initializing LiffHooks')
      setIsInClient(liff.isInClient())
      await liff.init({ liffId })
      setInitialized(true)

      const decodedIdToken = liff.getDecodedIDToken()
      if (decodedIdToken == null) {
        return
      }
      expRef.current = decodedIdToken.exp
    })()
  }, [liffId])

  React.useEffect(() => {
    const intervalID = setInterval(() => {
      if (expRef.current != null && (expRef.current - 60 * 5) * 1000 < Date.now()) {
        setTokenError('expired')
        clearInterval(intervalID)
      }
    }, 1000)
    return () => clearInterval(intervalID)
  }, [])

  const createUrl = useCallback(
    async (by: string) => {
      if (!initialized) return
      const url = await liff.permanentLink.createUrlBy(by)
      return url
    },
    [initialized],
  )

  const getIDToken = useCallback((): string | undefined => {
    switch (liff.isLoggedIn()) {
      case true:
        console.log('Getting decoded idToken')
        const decodedIdToken = liff.getDecodedIDToken()
        if (decodedIdToken?.exp == null || decodedIdToken.exp * 1000 < Date.now()) {
          setTokenError('expired')
          return
        }
        console.log('liffGetIdToken: Getting idToken')
        const idToken = liff.getIDToken()
        if (idToken == null) {
          throw new Error('liff.getIDToken returns null')
        }
        return idToken
      case false:
        setTokenError('missing')
        break
      default:
        console.log('liffGetIdToken: LIFF is not initialized yet')
        break
    }
  }, [])

  const login = useCallback(() => {
    // LIFF の Endpoint URL と redirectUri が完全一致する場合
    // 2次リダイレクトが正常に行なわれずに、ログイン処理が完全に終了しない上
    // URL から認証情報の除去も行なわれないので必ずEndpoint URLと違うredirectUriにする
    const redirectUri = location.pathname === liffEndpointPathname ? location.href + '/home' : location.href
    // console.log('location.pathname', location.pathname)
    // console.log('liffEndpointPathname', liffEndpointPathname)

    switch (tokenError) {
      case 'expired':
        // LIFF ブラウザなどで、ログアウトしないと idToken がリフレッシュされないため明示的に logout する
        console.log('(expired): Executing line.logout()')
        liff.logout()
        console.log('(expired): Executing line.login()')
        liff.login({ redirectUri })
        break
      case 'missing':
        console.log('(missing): Executing line.login()')
        liff.login({ redirectUri })
        break
      default:
        console.log('default: Executing line.login()')
        liff.login({ redirectUri })
    }
  }, [liffEndpointPathname, tokenError])

  return (
    <LiffContext.Provider
      value={{
        initialized,
        isInClient,
        createUrl,
        login,
        logout: liff.logout,
        openWindow: liff.openWindow,
        closeWindow: liff.closeWindow,
        isLoggedIn: liff.isLoggedIn,
        shareTargetPicker: liff.shareTargetPicker,
        createShortcutOnHomeScreen: liff.createShortcutOnHomeScreen,
        getIDToken,
        tokenError,
      }}
    >
      {children}
    </LiffContext.Provider>
  )
}

export const useLiff = (): Ctx => {
  return React.useContext(LiffContext)
}
