'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import { SubmitHandler, useForm } from 'react-hook-form'
import { z } from 'zod'

import { appConfig } from '@/app/config'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { useLiff } from '@/providers/liff-provider'
import { useUserSession } from '@/providers/user-session-provider'

const formSchema = z.object({
  agree: z.literal(true),
})
export const AgreeForm: React.FC = () => {
  const { signIn } = useUserSession()
  const liff = useLiff()
  const router = useRouter()
  const readonlySearchParams = useSearchParams()
  const referrer = readonlySearchParams.get('referrer')
  const firstAccessPath = readonlySearchParams.get('firstAccessPath')
  const returnTo = readonlySearchParams.get('returnTo')

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      agree: undefined,
    },
  })

  const handleSubmit: SubmitHandler<z.infer<typeof formSchema>> = async (data) => {
    // signUp & agreement
    if (!liff.initialized) return
    const token = liff.getIDToken()
    if (token == null) return
    const signInStatusCode = await signIn({
      type: 'line',
      token,
      signUpParams: {
        referrer: referrer ?? undefined,
        firstAccessPath: firstAccessPath ?? window.location.pathname + window.location.search + window.location.hash,
        serviceAgreementVersion: appConfig.serviceAgreementVersion,
      },
    })
    if (signInStatusCode !== 200) return

    router.replace(returnTo ?? '/mini/home')
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
