import React, { useMemo } from 'react'

import DOMPurify from 'dompurify'

import { cn } from '@/components/utils'

export const SanitizedHTML: React.FC<{
  htmlContent: string | undefined
  className?: string
}> = ({ htmlContent, className }) => {
  const sanitizedHTML = useMemo(
    () =>
      DOMPurify.sanitize(htmlContent ?? '', {
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'width', 'height', 'style', 'target'],
      }),
    [htmlContent],
  )
  return <div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} className={cn('sanitized-html', className)} />
}
