'use client'

import React, { useCallback, useEffect, useState } from 'react'

import Image from 'next/image'

import { Code, ConnectError } from '@connectrpc/connect'
import { useMutation, useQuery } from '@connectrpc/connect-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { SubmitHandler, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Icon } from '@/components/icons'
import { SelectWrapper } from '@/components/select-wrapper'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from '@/components/ui/use-toast'
import {
  days,
  months,
  prefectureCodeOptions,
  productSourceOptions,
  sexCodeOptions,
  years,
} from '@/components/user/user'
import { cn } from '@/components/utils'
import { UserProfile } from '@/gen/services/user/v1/user_pb'
import { useUserSession } from '@/providers/user-session-provider'
import { getMyUser, setMyProfile } from '@/services/user_service'
import { dateOnlyToDateOpt } from '@/stdutils/date-only'
import { formatYMDOpt } from '@/stdutils/intl'

const requiredErrorMessage = '必須項目です'
const formSchema = z.object({
  year: z.string().length(4, requiredErrorMessage),
  month: z.string().min(1, requiredErrorMessage),
  day: z.string().min(1, requiredErrorMessage),
  sexCode: z.string().min(1, requiredErrorMessage),
  prefectureCode: z.string().min(1, requiredErrorMessage),
  productSource: z.string().min(1, requiredErrorMessage),
})

export const ProfileForm: React.FC = () => {
  const userSession = useUserSession()
  const getMyUserQuery = useQuery(getMyUser, userSession.query({}))
  const [userProfile, setUserProfile] = useState<UserProfile | undefined>(undefined)
  const [step, setStep] = useState(1)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      year: '',
      month: '',
      day: '',
      sexCode: '',
      prefectureCode: '',
      productSource: '',
    },
  })

  const handleNextPage = useCallback(() => {
    if (step < 2) {
      setStep(step + 1)
    }
  }, [step])

  const handleBackPage = useCallback(() => {
    if (step > 1) {
      setStep(step - 1)
    }
  }, [step])

  const setMyProfileMutation = useMutation(setMyProfile)
  const postProfile = useCallback(async () => {
    try {
      await setMyProfileMutation.mutateAsync({
        profile: userProfile,
      })

      // user情報を更新してpage-routerに検知させ遷移を発火させる
      await getMyUserQuery.refetch()
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
  }, [setMyProfileMutation, userProfile, getMyUserQuery])

  const handleConfirm: SubmitHandler<z.infer<typeof formSchema>> = useCallback((data) => {
    const userProfile = new UserProfile({
      birthday: {
        year: Number(data.year),
        month: Number(data.month),
        dayOfMonth: Number(data.day),
      },
      sexCode: Number(data.sexCode),
      prefectureCode: Number(data.prefectureCode),
      initialQuestionnaireAnswers: {
        answers: [
          {
            question: 'product_source',
            answer: [data.productSource],
          },
        ],
      },
    })
    setUserProfile(userProfile)
  }, [])

  const handleDialogClose = useCallback(() => {
    setUserProfile(undefined)
  }, [])

  const handleDialogPost = useCallback(() => {
    postProfile()
  }, [postProfile])

  // 1 ページ目
  const [isPageOneValid, setIsPageOneValid] = useState(false)

  /**
   * 引数からDateを返す
   * 2024年2月31日などを入力しても2024年3月2日として返却することに注意
   * 日付の有効性は別途 isValidDate 関数で検証する
   * @param year
   * @param month
   * @param day
   * @returns Date
   */
  const makeDate = useCallback((year: number, month: number, day: number): Date | null => {
    if ([year, month, day].some(Number.isNaN)) {
      return null
    }
    return new Date(year, month - 1, day)
  }, [])

  const isValidDate = useCallback(
    (year: number, month: number, day: number): boolean => {
      const date = makeDate(year, month, day)
      return date?.getFullYear() === year && date?.getMonth() === month - 1 && date?.getDate() === day
    },
    [makeDate],
  )

  const watchedYear = form.watch('year')
  const watchedMonth = form.watch('month')
  const watchedDay = form.watch('day')
  const watchedSexCode = form.watch('sexCode')
  const watchedPrefectureCode = form.watch('prefectureCode')
  useEffect(() => {
    const year = parseInt(watchedYear)
    const month = parseInt(watchedMonth)
    const day = parseInt(watchedDay)
    const sexCode = watchedSexCode
    const prefectureCode = watchedPrefectureCode
    setIsPageOneValid(isValidDate(year, month, day) && sexCode !== '' && prefectureCode !== '')
  }, [watchedYear, watchedMonth, watchedDay, watchedSexCode, watchedPrefectureCode, isPageOneValid, isValidDate])

  return (
    <div className="grid h-full grid-rows-[auto_1fr] gap-4 px-4 pt-4">
      <div className="grid place-items-center gap-4">
        <Image
          width={70}
          height={86.5}
          unoptimized
          priority={true}
          src="/mini/assets/images/logos/app-logo.png"
          alt="app logo"
        />
        <p className="text-center">
          サービスの利用にあたって
          <br />
          簡単なアンケートにお答えください。
        </p>
        <span className="rounded bg-muted px-2 py-1 text-center font-bold">{step}/2</span>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleConfirm)} className="h-full">
          <div className={cn('grid h-full grid-rows-[1fr_auto] gap-4', { hidden: step !== 1 })}>
            <div className="grid content-start gap-6">
              <div>
                <div className="mb-1.5">
                  <div className="font-bold">生年月日</div>
                  <div className="mt-2 text-xs text-muted-foreground">※生年月日は一度登録すると変更できません。</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <SelectWrapper control={form.control} name="year" options={years} placeholder="年" />
                  <SelectWrapper control={form.control} name="month" options={months} placeholder="月" />
                  <SelectWrapper control={form.control} name="day" options={days} placeholder="日" />
                </div>
              </div>

              <div>
                <div className="mb-1.5">
                  <div className="font-bold">性別</div>
                  <div className="mt-2 text-xs text-muted-foreground">※性別は一度登録すると変更できません。</div>
                </div>
                <FormField
                  control={form.control}
                  name="sexCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup {...field} onValueChange={field.onChange} name="sex_code">
                          <div className="flex justify-start gap-6">
                            {sexCodeOptions.map((option) => (
                              <div className="flex items-center space-x-2" key={option.value}>
                                <RadioGroupItem value={option.value} id={`sexCode-${option.value}`} />
                                <Label htmlFor={`sexCode-${option.value}`} className="flex-auto py-4">
                                  {option.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <div className="mb-1.5 font-bold">居住地（都道府県）</div>
                <SelectWrapper
                  control={form.control}
                  name="prefectureCode"
                  options={prefectureCodeOptions}
                  placeholder="選択してください"
                />
              </div>
            </div>

            <div className="flex justify-center gap-4 pb-8 pt-4">
              <Button className="min-w-[170px]" onClick={() => handleNextPage()} disabled={!isPageOneValid}>
                次へ
              </Button>
            </div>
          </div>

          <div className={cn('grid h-full grid-rows-[1fr_auto] gap-4', { hidden: step !== 2 })}>
            <div className="grid content-start gap-6">
              <div>
                <div className="mb-1.5 font-bold">どこで商品を知りましたか？</div>
                <SelectWrapper
                  control={form.control}
                  name="productSource"
                  options={productSourceOptions}
                  placeholder="選択してください"
                  contentClassName="max-h-80"
                />
              </div>
            </div>

            <div className="flex w-full justify-center gap-4 pb-8 pt-4">
              <Button variant="secondary" className="w-1/2" onClick={() => handleBackPage()}>
                戻る
              </Button>
              <Button type="submit" className="w-1/2">
                登録する
              </Button>
            </div>
          </div>
        </form>
      </Form>

      <Dialog open={userProfile !== undefined}>
        <DialogContent hideCloseButton>
          <DialogHeader>
            <div className="grid place-items-center">
              <Icon i="warning" className="mb-4 h-12 w-12" />
              <DialogTitle className="font-bold">入力情報を確定しますか？</DialogTitle>
            </div>
            <DialogDescription className="text-left text-sm">
              「生年月日」と「性別」は一度登録すると変更できません。入力した情報が正しいことを確認してください。
            </DialogDescription>
          </DialogHeader>
          <div className="grid place-items-center gap-2">
            <div className="w-full rounded-lg bg-muted">
              <div className="flex items-center justify-between p-4">
                <span className="font-bold">生年月日</span>
                <span>{formatYMDOpt(dateOnlyToDateOpt(userProfile?.birthday))}</span>
              </div>
              <div className="px-4">
                <hr className="w-full border-t-2 border-dotted border-border" />
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="font-bold">性別</span>
                <span>{sexCodeOptions.find((option) => option.value === userProfile?.sexCode?.toString())?.label}</span>
              </div>
            </div>
            <div className="text-left text-xs text-muted-foreground">
              ※正しくない場合、アカウントの利用が制限される可能性があります。
            </div>
          </div>
          <DialogFooter>
            <div className="flex w-full justify-center gap-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => handleDialogClose()}>
                修正する
              </Button>
              <Button type="submit" className="flex-1" onClick={() => handleDialogPost()}>
                確定する
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
