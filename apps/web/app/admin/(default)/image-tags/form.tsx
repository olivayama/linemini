'use client'

import React from 'react'

import { useRouter } from 'next/navigation'

import { Code } from '@connectrpc/connect'
import { disableQuery, useMutation, useQuery } from '@connectrpc/connect-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useAdminSession } from '@/components/admin/session/use-admin-session'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormSection } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ContentLoader } from '@/components/ui/loader'
import { Switch } from '@/components/ui/switch'
import { ImageTag } from '@/gen/services/image/v1/image_pb'
import {
  createImageTag,
  getImageTagById,
  updateImageTag,
} from '@/gen/services/image/v1/image_service-ImageService_connectquery'

const formSchema = z.object({
  adminName: z
    .string()
    .min(1, { message: '管理名を入力してください' })
    .max(40, { message: '管理名は40文字以内で入力してください' }),
  isLocked: z.boolean(),
})

export const ImageTagForm: React.FC<{ imageTagId?: string }> = (props) => {
  const router = useRouter()
  const adminSession = useAdminSession()
  const getImageTagQuery = useQuery(
    getImageTagById,
    adminSession.isLoggedIn && props.imageTagId != null ? { imageTagId: props.imageTagId } : disableQuery,
  )

  if (props.imageTagId == null) {
    return <ImageTagFormImpl onSuccess={() => router.push('/admin/image-tags')} />
  } else {
    if (getImageTagQuery.data?.imageTag == null) {
      return <ContentLoader />
    } else {
      return (
        <ImageTagFormImpl
          imageTag={getImageTagQuery.data.imageTag}
          onSuccess={async () => {
            await getImageTagQuery.refetch()
            router.push('/admin/image-tags')
          }}
        />
      )
    }
  }
}

const ImageTagFormImpl: React.FC<{ imageTag?: ImageTag; onSuccess: () => void }> = (props) => {
  const createImageTagMutation = useMutation(createImageTag)
  const updateImageTagMutation = useMutation(updateImageTag)

  const form = useForm<z.infer<typeof formSchema>>({
    mode: 'onChange',
    resolver: zodResolver(formSchema),
    defaultValues:
      props.imageTag == null
        ? {
            isLocked: false,
          }
        : {
            ...props.imageTag,
          },
  })

  const { setError } = form

  const handleSubmit = React.useCallback(
    (values: z.infer<typeof formSchema>) => {
      if (props.imageTag == null) {
        createImageTagMutation.mutate(
          {
            imageTag: {
              ...values,
            },
          },
          {
            onSuccess: props.onSuccess,
            onError: (e) => {
              if (e.code === Code.AlreadyExists) {
                setError('adminName', {
                  type: 'manual',
                  message: '既に使用されています',
                })
              }

              console.error(e)
            },
          },
        )
      } else {
        updateImageTagMutation.mutate(
          {
            imageTag: {
              id: props.imageTag.id,
              ...values,
            },
          },
          {
            onSuccess: () => {
              props.onSuccess()
            },
            onError: (e) => {
              if (e.code === Code.AlreadyExists) {
                setError('adminName', {
                  type: 'manual',
                  message: '既に使用されています',
                })
              }

              console.error(e)
            },
          },
        )
      }
    },
    [createImageTagMutation, props, setError, updateImageTagMutation],
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 text-left">
        <FormSection>
          <FormField
            control={form.control}
            name="adminName"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>管理名</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isLocked"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="mt-0 font-bold">編集不可</FormLabel>
              </FormItem>
            )}
          />
        </FormSection>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={!form.formState.isValid}>
            {props.imageTag == null ? '作成' : '更新'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
