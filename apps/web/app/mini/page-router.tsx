'use client'

import React, { useEffect, useMemo, useState } from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import { Code } from '@connectrpc/connect'
import { useQuery } from '@connectrpc/connect-query'

import { appConfig } from '@/app/config'
import { useLiff } from '@/providers/liff-provider'
import { useUserSession } from '@/providers/user-session-provider'
import { getMyUser } from '@/services/user_service'
import { makeQueryString } from '@/stdutils/query'

export const PageRouter = (props: { children: React.ReactNode }) => {
  const router = useRouter()
  const liff = useLiff()
  const userSession = useUserSession()
  const getMyUserQuery = useQuery(getMyUser, userSession.query({}), {
    // アプリ起動時とオンボ状態変更時にのみフェッチする（画面遷移の度に再フェッチしないようにする）
    // Infinity = refetchしない限り再フェッチしない
    staleTime: Infinity,
  })
  const userMe = useMemo(() => getMyUserQuery.data?.user, [getMyUserQuery.data])
  const error = useMemo(() => getMyUserQuery.error, [getMyUserQuery.error])
  const readonlySearchParams = useSearchParams()
  const returnTo = useMemo(() => readonlySearchParams.get('returnTo'), [readonlySearchParams])
  const isServiceAgreed = useMemo(
    () =>
      userMe != null &&
      userMe.serviceAgreements.some((agreement) => agreement.version === appConfig.serviceAgreementVersion),
    [userMe],
  )
  const isTutorialCompleted = useMemo(
    () =>
      userMe != null &&
      userMe.tutorialCompletions.some((completion) => completion.version === appConfig.tutorialVersion),
    [userMe],
  )
  const isProfileCompleted = useMemo(() => userMe != null && userMe.profile != null, [userMe])
  const serviceAgreementPagePath = '/mini/onboarding/service-agreement'
  const tutorialPagePath = '/mini/onboarding/welcome'
  const profilePagePath = '/mini/onboarding/profile'
  const defaultPagePath = '/mini/home'
  const exceptionPagePath = '/mini/account'
  const [isTargetPage, setIsTargetPage] = useState(false)

  useEffect(() => {
    if (userSession.isLoggedIn && error != null && error.code === Code.NotFound) {
      userSession.signOut().then(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500))
        liff.closeWindow()
      })
    }
  }, [error, liff, userSession])

  useEffect(() => {
    const queryString = makeQueryString({
      returnTo: window.location.pathname + window.location.search + window.location.hash,
    })
    switch (true) {
      case userMe == null:
        return
      case window.location.pathname === exceptionPagePath:
        break
      case !isServiceAgreed:
        if (window.location.pathname !== serviceAgreementPagePath)
          return router.replace(`${serviceAgreementPagePath}?${queryString}`)
        break
      case !isTutorialCompleted:
        if (window.location.pathname !== tutorialPagePath) return router.replace(`${tutorialPagePath}?${queryString}`)
        break
      case !isProfileCompleted:
        if (window.location.pathname !== profilePagePath) return router.replace(`${profilePagePath}?${queryString}`)
        break
      case [serviceAgreementPagePath, tutorialPagePath, profilePagePath].includes(window.location.pathname):
        // 各画面の最後でgetMyUserQuery.refetch()することでuserMeを更新しここで検知して次のページへ遷移させる
        return router.replace(returnTo ?? defaultPagePath)
    }
    setIsTargetPage(true)
  }, [isProfileCompleted, isServiceAgreed, isTutorialCompleted, returnTo, router, userMe])

  return isTargetPage ? props.children : <></>
}
