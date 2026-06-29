'use client'

import React, { useCallback } from 'react'

import { useRouter } from 'next/navigation'

import { appConfig } from '@/app/config'
// import { useError } from '@/components/error-boundary/error-provider'
import { SimpleList } from '@/components/simple-list'
import { SimpleListSectionProps } from '@/components/simple-list/simple-list-section'
import { toast } from '@/components/ui/use-toast'
import { useLiff } from '@/providers/liff-provider'

export const MoreList: React.FC = () => {
  // const { triggerError } = useError()
  const router = useRouter()
  const liff = useLiff()

  const addShortcutOnHomeScreen = useCallback(async () => {
    try {
      await liff.createShortcutOnHomeScreen({ url: appConfig.liffUrl })
      console.log('ホーム画面にショートカットが追加されました')
    } catch (error) {
      // triggerError(new Error('ボタン操作でエラーが発生しました'))
      // triggerError(error as Error, { title: 'ボタン操作でエラーが発生しました', buttonType: 'home' })
      toast({ title: '追加できませんでした' })
      console.error('ホーム画面にショートカットを追加できませんでした', error)
    }
  }, [liff])

  const sections: SimpleListSectionProps[] = [
    {
      items: [
        {
          title: 'プロフィール',
          icon: 'user',
          onClick: () => router.push('/mini/users/me/profile'),
        },
        {
          title: 'このアプリをホーム画面に追加',
          icon: 'smartphone',
          accessoryIcon: 'plusSquare',
          onClick: addShortcutOnHomeScreen,
        },
      ],
    },
    {
      title: 'ヘルプ',
      items: [
        {
          title: 'ガイド',
          icon: 'guide',
          onClick: () => router.push('/mini/guide'),
        },
        {
          title: 'よくある質問',
          icon: 'help',
          onClick: () => router.push('/mini/faq'),
        },
        {
          title: 'お問い合わせ',
          icon: 'mail',
          onClick: () => router.push('/mini/contact'),
        },
      ],
    },
    {
      title: 'サービス',
      items: [
        {
          title: 'xxxbrandnamexxx公式サイト',
          icon: 'web',
          accessoryIcon: 'externalLink',
          onClick: () => window.open(appConfig.brand.officialSitesUrl, '_blank'),
        },
        {
          title: '利用規約',
          icon: 'terms',
          accessoryIcon: 'externalLink',
          onClick: () => window.open('/legal/terms', '_blank'),
        },
        {
          title: 'プライバシーポリシー',
          icon: 'privacy',
          accessoryIcon: 'externalLink',
          onClick: () => window.open('/legal/privacy', '_blank'),
        },
      ],
    },
  ]
  return <SimpleList sections={sections} className="pb-20" />
}
