'use client'

import React, { useCallback, useState } from 'react'

import { Icon } from './icons'
import { toast } from './ui/use-toast'
import { cn } from './utils'

export const CopyButton: React.FC<{ text: string }> = (props) => {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(props.text)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
    toast({ title: 'クリップボードへコピーしました' })
  }, [props.text])

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 rounded-lg px-2 py-1',
        isCopied ? 'bg-green-50 text-green-700' : 'bg-secondary',
      )}
      onClick={handleCopy}
    >
      <div className="text-sm font-medium">コピー</div>
      {isCopied ? <Icon i="check" className="h-4 w-4" /> : <Icon i="copy" className="h-4 w-4" />}
    </div>
  )
}
