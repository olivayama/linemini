'use client'

import React from 'react'

import { Image } from '@/gen/services/image/v1/image_pb'

export type AdminImageSheetCallbackFn<T> = (image: T | undefined) => void

export type AdminImageSheetCallback =
  | {
      type: 'serialCodeCampaignBanner'
      fn: AdminImageSheetCallbackFn<Image>
    }
  | {
      type: 'serialCodeCampaignDetail'
      fn: AdminImageSheetCallbackFn<Image>
    }

export type AdminImageSheetContextType = {
  uploadOrSelectImage: (cb: AdminImageSheetCallback) => void
}

export const AdminImageSheetContext = React.createContext<AdminImageSheetContextType>({
  uploadOrSelectImage: () => {
    throw new Error('AdminImageSheetContext is not provided')
  },
})
