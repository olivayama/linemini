'use client'

import React from 'react'

import { useMutation, useQuery } from '@connectrpc/connect-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/components/utils'
import {
  listImageTags,
  listImages,
  tmpUploadImage,
} from '@/gen/services/image/v1/image_service-ImageService_connectquery'

import { AdminImagePreview } from '../image-preview'
import { Pagination } from '../pagination'
import { useAdminSession } from '../session/use-admin-session'
import { AdminImageSheetCallback, AdminImageSheetContext } from './image-sheet-context'

const PAGE_SIZE = 10
const IMAGE_TAG_ADMIN_NAMES = {
  serialCodeCampaignBanner: 'シリアルコードキャンペーン/バナー',
  serialCodeCampaignDetail: 'シリアルコードキャンペーン/詳細',
}
const SHEET_TITLES = {
  serialCodeCampaignBanner: 'シリアルコードキャンペーンバナー画像',
  serialCodeCampaignDetail: 'シリアルコードキャンペーン詳細画像',
}

export const formSchema = z.object({
  image: z.instanceof(File).refine((file) => file.size < 1000000, {
    message: '1MB以下のファイルを選択してください',
  }),
  adminName: z.string().min(1),
})

export const AdminImageSheetProvider: React.FC<{ children: React.ReactNode }> = (props) => {
  const adminSession = useAdminSession()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      adminName: '',
    },
  })
  const [isOpen, setIsOpen] = React.useState<boolean>(false)
  const [imageCallback, setImageCallback] = React.useState<AdminImageSheetCallback>()

  const imageTagsQuery = useQuery(listImageTags, adminSession.query({}))

  const defaultImageTagId = React.useMemo(() => {
    if (imageCallback != null) {
      return imageTagsQuery.data?.imageTags?.find((tag) => tag.adminName === IMAGE_TAG_ADMIN_NAMES[imageCallback.type])
        ?.id
    }
  }, [imageTagsQuery.data, imageCallback])
  const [selectedImageTagId, setSelectedImageTagId] = React.useState<string>()
  const imageTagId = React.useMemo(
    () => (selectedImageTagId === 'all' ? undefined : selectedImageTagId ?? defaultImageTagId),
    [selectedImageTagId, defaultImageTagId],
  )
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: PAGE_SIZE })

  const imagesQuery = useQuery(
    listImages,
    adminSession.query({
      imageTagId,
      paging: {
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
      },
    }),
  )
  const uploadImageMutation = useMutation(tmpUploadImage)

  const inputImage = form.watch('image')
  const inputImageURL = React.useMemo(() => {
    if (inputImage != null) {
      return URL.createObjectURL(inputImage)
    }
  }, [inputImage])

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      setIsOpen(open)
      if (!open) {
        setImageCallback(undefined)
        setSelectedImageTagId(undefined)
        setPagination({ pageIndex: 0, pageSize: PAGE_SIZE })
        if (inputImageURL != null) {
          URL.revokeObjectURL(inputImageURL)
        }
        form.reset()
      }
    },
    [form, inputImageURL],
  )

  const uploadOrSelectImage = React.useCallback(
    (cb: AdminImageSheetCallback) => {
      setImageCallback(cb)
      handleOpenChange(true)
    },
    [handleOpenChange],
  )

  const handleSubmit = React.useCallback(
    async (values: z.infer<typeof formSchema>) => {
      if (imageCallback == null || defaultImageTagId == null) return

      uploadImageMutation.mutate(
        {
          image: {
            adminName: values.adminName,
            image: new Uint8Array(await values.image.arrayBuffer()),
            // 絞り混み状態とは関係なく、開いたシートの種類で tag が決まる
            tagIds: [defaultImageTagId],
          },
        },
        {
          onSuccess: (res) => {
            imageCallback.fn(res.image)
            handleOpenChange(false)
          },
        },
      )
    },
    [defaultImageTagId, handleOpenChange, imageCallback, uploadImageMutation],
  )

  return (
    <AdminImageSheetContext.Provider
      value={{
        uploadOrSelectImage,
      }}
    >
      {props.children}
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent className="grid h-full grid-rows-sheet-content gap-4">
          <SheetHeader>
            <SheetTitle>{imageCallback == null ? '' : SHEET_TITLES[imageCallback.type]}</SheetTitle>
            <SheetDescription />
          </SheetHeader>
          <ScrollArea className="-mx-6 px-5 py-2">
            <div className="px-1">
              <div className="mb-4 text-base font-bold">新規画像追加</div>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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

                  <div className={cn('space-y-4', inputImage == null && 'hidden')}>
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

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {inputImageURL != null && <img src={inputImageURL} className="max-w-full object-contain" alt="" />}
                    {uploadImageMutation.error != null && (
                      <p className="mt-2 text-destructive">{uploadImageMutation.error.message}</p>
                    )}
                    <div className="flex justify-end">
                      <Button type="submit" disabled={!form.formState.isValid}>
                        アップロード
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
              <div className="mt-4">
                <div className="mb-4 text-base font-bold">登録画像</div>
                <p className="mb-4 text-sm text-muted-foreground">画像をクリックすると選択されます。</p>

                <div className="flex flex-col gap-2">
                  <Label>画像タグ</Label>
                  <Select
                    defaultValue={imageTagId}
                    onValueChange={(value) => {
                      setSelectedImageTagId(value)
                      setPagination({ pageIndex: 0, pageSize: PAGE_SIZE })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">未選択</SelectItem>
                      {imageTagsQuery.data?.imageTags.map((tag) => {
                        return (
                          <SelectItem key={tag.id} value={tag.id}>
                            {tag.adminName}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="m-2 flex items-end justify-between">
                  <div className="flex w-full justify-end text-sm">
                    全 {String(imagesQuery.data?.paging?.totalCount ?? 0)} 件
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-2">
                  {imagesQuery.data?.images?.map((image) => (
                    <AdminImagePreview
                      key={image.id}
                      src={image.imageUrl}
                      adminName={image.adminName}
                      onClick={() => {
                        if (imageCallback != null) {
                          imageCallback.fn(image)
                          handleOpenChange(false)
                        }
                      }}
                    />
                  ))}
                </div>

                <Pagination
                  totalCount={Number(imagesQuery.data?.paging?.totalCount ?? 0)}
                  pageSize={pagination.pageSize}
                  currentPage={pagination.pageIndex}
                  onPageChange={(pageIndex) => setPagination({ ...pagination, pageIndex })}
                />
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </AdminImageSheetContext.Provider>
  )
}
