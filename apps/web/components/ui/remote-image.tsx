import React from 'react'

import { ImageOffIcon } from 'lucide-react'

import { cn } from '../utils'
import { ContentLoader } from './loader'

export const RemoteImage: React.FC<{
  src: string | undefined
  isLoading: boolean
  className?: string
  objectContain?: boolean
}> = ({ isLoading, className, src, objectContain }) => {
  const [error, setError] = React.useState(false)
  return isLoading ? (
    <div className={cn('flex items-center justify-center bg-muted', className)}>
      <ContentLoader />
    </div>
  ) : error || src == null ? (
    <div className={cn('flex items-center justify-center bg-muted', className)}>
      <ImageOffIcon className="h-5 w-5 text-input" />
    </div>
  ) : (
    // NOTE: アップロードされた画像に対する optimization の機能は作ってないので next/image である必要がない
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={cn(objectContain ? 'object-contain' : 'object-cover', className)}
      src={src}
      alt=""
      onError={() => setError(true)}
    />
  )
}
