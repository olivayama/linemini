'use client'

import React, { useMemo } from 'react'

import { useRouter } from 'next/navigation'

import { Code, ConnectError } from '@connectrpc/connect'
import { useMutation, useQuery } from '@connectrpc/connect-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { SubmitHandler, useForm } from 'react-hook-form'
import { z } from 'zod'

import { SelectWrapper } from '@/components/select-wrapper'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { toast } from '@/components/ui/use-toast'
import { prefectureCodeOptions, sexCodeOptions } from '@/components/user/user'
import { useUserSession } from '@/providers/user-session-provider'
import { getMyUser, setMyProfile } from '@/services/user_service'
import { dateOnlyToDateOpt } from '@/stdutils/date-only'
import { formatYMDOpt } from '@/stdutils/intl'

const requiredErrorMessage = '必須項目です'
const formSchema = z.object({
  prefectureCode: z.string().min(1, requiredErrorMessage),
})

export const ProfileForm: React.FC = () => {
  const router = useRouter()
  const userSession = useUserSession()
  const setMyProfileMutation = useMutation(setMyProfile)
  const getMyUserQuery = useQuery(getMyUser, userSession.query({}))
  const userMe = useMemo(() => getMyUserQuery.data?.user, [getMyUserQuery.data])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prefectureCode: userMe?.profile?.prefectureCode?.toString(),
    },
  })

  const handleSubmit: SubmitHandler<z.infer<typeof formSchema>> = async (data) => {
    try {
      if (userMe?.profile == null) return
      const userProfile = userMe.profile
      userProfile.prefectureCode = Number(data.prefectureCode)
      await setMyProfileMutation.mutateAsync({
        profile: userProfile,
      })

      await getMyUserQuery.refetch()
      toast({ title: 'プロフィールを更新しました' })
      router.push('/mini/more')
    } catch (e) {
      const title = (() => {
        if (!(e instanceof ConnectError)) {
          return 'エラーが発生しました'
        }
        switch (e.code) {
          case Code.NotFound:
            return 'アカウントが存在しません'
          case Code.Unauthenticated:
            return '認証に失敗しました'
          default:
            return e.message
        }
      })()
      toast({ title })
    }
  }

  return (
    <div className="h-full p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="h-full">
          <div className="grid h-full grid-rows-[1fr_auto] gap-4">
            <div className="grid content-start gap-6">
              <div>
                <div className="mb-1.5 flex place-items-center gap-2">
                  <div className="font-bold">生年月日</div>
                  <div className="text-xs text-muted-foreground">※変更不可</div>
                </div>
                <div>{formatYMDOpt(dateOnlyToDateOpt(userMe?.profile?.birthday))}</div>
              </div>

              <div>
                <div className="mb-1.5 flex place-items-center gap-2">
                  <div className="font-bold">性別</div>
                  <div className="text-xs text-muted-foreground">※変更不可</div>
                </div>
                <div>
                  {sexCodeOptions.find((option) => option.value === userMe?.profile?.sexCode?.toString())?.label}
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex place-items-center gap-2">
                  <div className="font-bold">居住地（都道府県）</div>
                </div>
                <SelectWrapper
                  control={form.control}
                  name="prefectureCode"
                  options={prefectureCodeOptions}
                  placeholder="選択してください"
                />
              </div>
            </div>

            <div className="flex justify-center gap-4 py-4">
              <Button className="min-w-[170px]" type="submit">
                保存
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
