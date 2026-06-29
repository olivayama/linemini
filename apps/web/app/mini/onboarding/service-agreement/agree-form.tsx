'use client'

import React from 'react'

import Link from 'next/link'

import { Code, ConnectError } from '@connectrpc/connect'
import { useMutation, useQuery } from '@connectrpc/connect-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { SubmitHandler, useForm } from 'react-hook-form'
import { z } from 'zod'

import { appConfig } from '@/app/config'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { toast } from '@/components/ui/use-toast'
import { useUserSession } from '@/providers/user-session-provider'
import { agreeToService, getMyUser } from '@/services/user_service'

const formSchema = z.object({
  agree: z.literal(true),
})
export const AgreeForm: React.FC = () => {
  const agreeToServiceMutation = useMutation(agreeToService)
  const userSession = useUserSession()
  const getMyUserQuery = useQuery(getMyUser, userSession.query({}))

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      agree: undefined,
    },
  })

  const handleSubmit: SubmitHandler<z.infer<typeof formSchema>> = async (data) => {
    try {
      const result = await agreeToServiceMutation.mutateAsync({
        version: appConfig.serviceAgreementVersion,
      })
      const length = result.serviceAgreements.length
      const lastAgreement = length > 0 ? result.serviceAgreements[length - 1] : undefined
      console.log('lastAgreement', lastAgreement)

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
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid place-items-center gap-4">
          <FormField
            control={form.control}
            name="agree"
            render={({ field }) => (
              <FormItem className="flex space-x-2 space-y-0 py-4">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    <Link href={'/legal/terms'} target="_blank" className="text-link-foreground underline">
                      利用規約
                    </Link>
                    および
                    <Link href={'/legal/privacy'} target="_blank" className="text-link-foreground underline">
                      プライバシーポリシー
                    </Link>
                    に同意する
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />
          <Button type="submit" disabled={!form.watch('agree')} className="min-w-[170px]">
            進む
          </Button>
        </div>
      </form>
    </Form>
  )
}
