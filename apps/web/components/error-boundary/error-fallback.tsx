'use client'

import React from 'react'

import { useRouter } from 'next/navigation'

import { FallbackProps } from 'react-error-boundary'

import { Icon } from '@/components/icons'
import { Button } from '@/components/ui/button'

export type ButtonType = 'none' | 'back' | 'home'
interface ErrorFallbackProps extends FallbackProps {
  options: {
    title?: string
    buttonType?: ButtonType
  }
}
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  options: { title = 'エラーが発生しました', buttonType = 'none' },
}) => {
  const router = useRouter()
  return (
    <main className="h-full pb-ios-safe-area-bottom">
      <div className="grid h-full grid-rows-[1fr_auto] place-items-center gap-8 bg-white px-4 py-4">
        <div className="grid place-items-center gap-4">
          <Icon i="error" className="h-[100px] w-[100px] text-slate-300" />
          <div className="grid place-items-center gap-2">
            <div className="font-bold">{title}</div>
            <div className="break-words text-xs text-muted-foreground">{error.message}</div>
          </div>
        </div>
        <div>
          {buttonType === 'back' && (
            <div className="mt-8">
              <Button onClick={resetErrorBoundary}>戻る</Button>
            </div>
          )}
          {buttonType === 'home' && (
            <div className="mt-8">
              <Button
                onClick={() => {
                  router.replace('/mini/home')
                  setTimeout(resetErrorBoundary, 100)
                }}
              >
                ホームへ
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
