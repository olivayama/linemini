'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useRouter } from 'next/navigation'

import { Code, ConnectError } from '@connectrpc/connect'
import { useMutation, useQuery } from '@connectrpc/connect-query'

import { appConfig } from '@/app/config'
import { Icon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { useLiff } from '@/providers/liff-provider'
import { useUserSession } from '@/providers/user-session-provider'
import { deleteMyUser, getMyUser } from '@/services/user_service'

export const Account: React.FC<{
  lineUid: string | undefined
}> = ({ lineUid }) => {
  const { userId, signOut, query } = useUserSession()
  const liff = useLiff()
  const deleteMyUserMutation = useMutation(deleteMyUser)
  const getMyUserQuery = useQuery(getMyUser, query({}))
  const userMe = useMemo(() => getMyUserQuery.data?.user, [getMyUserQuery.data])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)
  const router = useRouter()
  const hasCheckedAppEnv = useRef(false)

  useEffect(() => {
    if (!hasCheckedAppEnv.current && appConfig.appEnv === 'prd') {
      router.replace('/mini/home')
    }
    hasCheckedAppEnv.current = true
  }, [router])

  const handleCopy = useCallback(async (userId: string) => {
    await navigator.clipboard.writeText(userId)
    toast({ title: 'クリップボードへコピーしました' })
  }, [])

  const handleAccountDelete = useCallback(async () => {
    setIsProcessing(true)
    try {
      await deleteMyUserMutation.mutateAsync({})
      await signOut()
      liff.logout()
      localStorage.clear()
      setIsDeleted(true)
    } catch (e) {
      const title = (() => {
        if (!(e instanceof ConnectError)) {
          return 'エラーが発生しました'
        }
        switch (e.code) {
          case Code.NotFound:
            return 'アカウントが存在しません'
          case Code.Unimplemented:
            return '無効な操作です'
          case Code.Internal:
            return '内部エラーが発生しました'
          case Code.Unauthenticated:
            return '認証に失敗しました'
          default:
            return e.message
        }
      })()
      toast({ title })

      if (e instanceof ConnectError && e.code === Code.NotFound) {
        await signOut()
        liff.logout()
        localStorage.clear()
        setIsDeleted(true)
      }
    } finally {
      setIsProcessing(false)
      await new Promise((resolve) => setTimeout(resolve, 500))
      liff.closeWindow()
    }
  }, [deleteMyUserMutation, liff, signOut])

  return appConfig.appEnv === 'prd' ? (
    <main />
  ) : (
    <main className="grid h-full place-content-center">
      {(() => {
        if (isDeleted) {
          return <p>アカウントを削除しました</p>
        }
        if (userId == null || isProcessing) {
          return <Icon i="progress" className="h-4 w-4 animate-spin" />
        }
        return (
          <div className="grid gap-12">
            <div>
              ユーザーID:
              <div className="flex gap-4">
                {userId}
                <button type="button" onClick={() => handleCopy(userId)}>
                  <Icon i="copy" className="block h-4 w-4" />
                </button>
              </div>
            </div>
            <div>
              お客様番号:
              <div className="flex gap-4">
                {userMe?.customerNumber}
                <button type="button" onClick={() => handleCopy(userMe?.customerNumber ?? '')}>
                  <Icon i="copy" className="block h-4 w-4" />
                </button>
              </div>
            </div>
            <div>
              LINE Uid:
              <div className="flex gap-4">
                {lineUid ?? '取得中...'}
                <button type="button" onClick={() => handleCopy(lineUid ?? '')}>
                  <Icon i="copy" className="block h-4 w-4" />
                </button>
              </div>
            </div>
            <div>
              liff open id token:
              <div className="flex gap-4">
                ********
                <button type="button" onClick={() => handleCopy(liff.getIDToken() ?? '')}>
                  <Icon i="copy" className="block h-4 w-4" />
                </button>
              </div>
            </div>
            <Button variant="destructive" onClick={handleAccountDelete}>
              アカウントを削除する
            </Button>
          </div>
        )
      })()}
    </main>
  )
}
