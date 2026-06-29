'use client'

import React from 'react'

import { useRouter } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

import { useAdminSession } from './use-admin-session'

const formSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
})

export const AdminSessionSignInForm: React.FC = () => {
  const router = useRouter()
  const adminSession = useAdminSession()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const handleSubmit = React.useCallback(
    async (values: z.infer<typeof formSchema>) => {
      if (await adminSession.signIn({ email: values.email, password: values.password })) {
        router.push('/admin')
      }
    },
    [adminSession, router],
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 text-left">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>メールアドレス</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            // TODO: エラー対応
            // <FormItem onChange={adminSession.clearSignInError}>
            <FormItem>
              <FormLabel required>パスワード</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* TODO: エラー対応 */}
        {/* {adminSession.signInError != null && <p className="mt-2 text-destructive">{adminSession.signInError}</p>} */}
        <Button type="submit" className="w-full" disabled={!form.formState.isValid}>
          ログイン
        </Button>
      </form>
    </Form>
  )
}
