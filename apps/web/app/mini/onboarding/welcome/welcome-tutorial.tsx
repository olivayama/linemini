'use client'

import React, { useCallback } from 'react'

import { Code, ConnectError } from '@connectrpc/connect'
import { useMutation, useQuery } from '@connectrpc/connect-query'

import { appConfig } from '@/app/config'
import { Tutorial } from '@/components/tutorial'
import { toast } from '@/components/ui/use-toast'
import { useUserSession } from '@/providers/user-session-provider'
import { completeTutorial, getMyUser } from '@/services/user_service'

export const WelcomeTutorial: React.FC = () => {
  const completeTutorialMutation = useMutation(completeTutorial)
  const userSession = useUserSession()
  const getMyUserQuery = useQuery(getMyUser, userSession.query({}))

  const handleCompleteTutorial = useCallback(async () => {
    try {
      // completeTutorial　APIで完了処理をして、完了状態を取得する
      const result = await completeTutorialMutation.mutateAsync({
        version: appConfig.tutorialVersion,
      })
      const length = result.tutorialCompletions.length
      const lastCompletion = length > 0 ? result.tutorialCompletions[length - 1] : undefined
      console.log('lastCompletion', lastCompletion)

      // user情報を更新してpage-routerに検知させ遷移を発火させる
      await getMyUserQuery.refetch()
    } catch (e) {
      const title = (() => {
        if (!(e instanceof ConnectError)) {
          return 'エラーが発生しました'
        }
        switch (e.code) {
          case Code.Unauthenticated:
            return '認証に失敗しました'
          default:
            return e.message
        }
      })()
      toast({ title })
    }
  }, [completeTutorialMutation, getMyUserQuery])

  return <Tutorial completeButtonText="はじめる" onCompleteTutorial={handleCompleteTutorial} />
}
