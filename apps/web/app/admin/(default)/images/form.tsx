'use client'

import React from 'react'

import { useRouter } from 'next/navigation'

import { disableQuery, useMutation, useQuery } from '@connectrpc/connect-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useAdminSession } from '@/components/admin/session/use-admin-session'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSection,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ContentLoader } from '@/components/ui/loader'
import { cn } from '@/components/utils'
import { Image } from '@/gen/services/image/v1/image_pb'
import {
  getImageById,
  listImageTags,
  tmpUploadImage,
  updateTmpUploadImage,
} from '@/gen/services/image/v1/image_service-ImageService_connectquery'

export const formSchema = z.object({
  imageTags: z.array(z.string()),
  image: z
    .instanceof(File)
    .refine((file) => file.size < 1000000, {
      message: '1MB以下のファイルを選択してください',
    })
    .optional(),
  adminName: z
    .string()
    .min(1, { message: '管理名を入力してください' })
    .max(40, { message: '管理名は40文字以内で入力してください' }),
})

export const ImageForm: React.FC<{ imageId?: string }> = (props) => {
  const router = useRouter()
  const adminSession = useAdminSession()
  const getImageQuery = useQuery(
    getImageById,
    adminSession.isLoggedIn && props.imageId != null ? { imageId: props.imageId } : disableQuery,
  )

  if (props.imageId == null) {
    return <ImageFormImpl onSuccess={() => router.push('/admin/images')} />
  } else {
    if (getImageQuery.data?.image == null) {
      return <ContentLoader />
    } else {
      return (
        <ImageFormImpl
          image={getImageQuery.data.image}
          onSuccess={async () => {
            await getImageQuery.refetch()
            router.push('/admin/images')
          }}
        />
      )
    }
  }
}

const ImageFormImpl: React.FC<{ image?: Image; onSuccess: () => void }> = (props) => {
  const adminSession = useAdminSession()

  const uploadImageMutation = useMutation(tmpUploadImage)
  const updateImageMutation = useMutation(updateTmpUploadImage)

  const imageTagsQuery = useQuery(listImageTags, adminSession.query({}))

  const form = useForm<z.infer<typeof formSchema>>({
    mode: 'onChange',
    resolver: zodResolver(formSchema),
    defaultValues:
      props.image == null
        ? {
            adminName: '',
            imageTags: [],
          }
        : {
            adminName: props.image.adminName,
            imageTags: props.image.tagIds,
          },
  })

  const inputImage = form.watch('image')

  const inputImageURL = React.useMemo(() => {
    if (inputImage != null) {
      return URL.createObjectURL(inputImage)
    }
  }, [inputImage])

  const handleSubmit = React.useCallback(
    async (values: z.infer<typeof formSchema>) => {
      const image = values.image != null ? new Uint8Array(await values.image.arrayBuffer()) : undefined
      if (props.image == null) {
        uploadImageMutation.mutate(
          {
            image: {
              adminName: values.adminName,
              image,
              tagIds: values.imageTags,
            },
          },
          {
            onSuccess: () => {
              if (inputImageURL != null) {
                URL.revokeObjectURL(inputImageURL)
              }
              props.onSuccess()
            },
          },
        )
      } else {
        updateImageMutation.mutate(
          {
            image: {
              id: props.image.id,
              adminName: values.adminName,
              image,
              tagIds: values.imageTags,
            },
            replaceImage: image != null,
          },
          {
            onSuccess: () => {
              if (inputImageURL != null) {
                URL.revokeObjectURL(inputImageURL)
              }
              props.onSuccess()
            },
          },
        )
      }
    },
    [inputImageURL, props, updateImageMutation, uploadImageMutation],
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormSection>
          <FormField
            control={form.control}
            name="image"
            render={({ field: { value, onChange, ...fieldProps } }) => (
              <FormItem>
                <FormLabel required>画像</FormLabel>
                <FormControl>
                  <Input
                    {...fieldProps}
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      if (event.target.files?.[0] != null) {
                        if (inputImageURL != null) {
                          URL.revokeObjectURL(inputImageURL)
                        }
                        const file = event.target.files[0]
                        form.setValue('image', file, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })
                        form.setValue('adminName', file.name, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
                <FormDescription>
                  最大ファイルサイズ: 1MB
                  <br />
                  形式: png
                </FormDescription>
              </FormItem>
            )}
          />

          {props.image != null && inputImageURL == null && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={props.image.imageUrl} className="max-w-full object-contain" alt="" />
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          {inputImageURL != null && <img src={inputImageURL} className="max-w-full object-contain" alt="" />}

          <div className={cn('space-y-4', inputImage == null && props.image == null && 'hidden')}>
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
          </div>
          <FormField
            control={form.control}
            name="imageTags"
            render={({ field }) => (
              <FormItem>
                <div className="flex justify-between">
                  <FormLabel>画像タグ</FormLabel>
                </div>
                <div className="grid w-[800px] grid-cols-3 gap-3 space-y-0">
                  {imageTagsQuery.data?.imageTags.map((tag, i) => {
                    return (
                      <FormItem className="mt-0 flex items-center gap-2 space-y-0" key={i}>
                        <FormControl>
                          <Checkbox
                            checked={field.value.includes(tag.id)}
                            onCheckedChange={(v) => {
                              if (v === 'indeterminate') {
                                return
                              }
                              const s = new Set(field.value)
                              if (v) {
                                s.add(tag.id)
                              } else {
                                s.delete(tag.id)
                              }
                              field.onChange(Array.from(s))
                            }}
                          />
                        </FormControl>
                        <FormLabel className="mt-0">{tag.adminName}</FormLabel>
                      </FormItem>
                    )
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          {uploadImageMutation.error != null && (
            <p className="mt-2 text-destructive">{uploadImageMutation.error.message}</p>
          )}
          {updateImageMutation.error != null && (
            <p className="mt-2 text-destructive">{updateImageMutation.error.message}</p>
          )}
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={!form.formState.isValid}>
              {props.image == null ? 'アップロード' : '更新'}
            </Button>
          </div>
        </FormSection>
      </form>
    </Form>
  )
}
