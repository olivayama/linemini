'use client'

import React, { useEffect, useRef } from 'react'

import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'

import { useLiff } from '@/providers/liff-provider'
import { useUserSession } from '@/providers/user-session-provider'
import { makeQueryString } from '@/stdutils/query'

export const InitSession = () => {
  const { signIn, init: initSession } = useUserSession()
  const initRef = useRef(false)
  const liff = useLiff()
  const router = useRouter()
  const readonlySearchParams = useSearchParams()
  const referrer = readonlySearchParams.get('referrer')
  const firstAccessPath = window.location.pathname + window.location.search + window.location.hash
  const returnTo = firstAccessPath

  // template でページ遷移ごとにセッションを有効化する
  useEffect(() => {
    if (!liff.initialized) {
      return
    }
    if (initRef.current) {
      return
    }

    console.log('Template: init')
    initRef.current = true
    ;(async () => {
      const statusCode = await initSession()

      // TODO: このprojectではLINEログイン必須にするためisInClientのチェックはコメントアウト
      // ゲストログインの可否を切り替え可能にする際に書き換える
      // isInClient = undefined の場合は処理をしない
      // switch (liff.isInClient) {
      //   case true:
      const token = liff.getIDToken()
      if (statusCode !== 200 && token != null) {
        const signInStatusCode = await signIn({
          type: 'line',
          token,
        })
        // 403（=FailedPrecondition）なら同意画面へリダイレクトする
        console.log(signInStatusCode)
        if (signInStatusCode === 403) {
          const query = { referrer, firstAccessPath, returnTo }
          const queryString = makeQueryString(query)
          router.replace(`/mini/service-agreement?${queryString}`)
        }
      }
      //     break
      //   case false:
      //     if (statusCode !== 200) {
      //       await signIn({
      //         type: 'guest',
      //       })
      //     }
      //     break
      // }
    })()
  }, [firstAccessPath, initSession, liff, referrer, returnTo, router, signIn])
  return <></>
}
