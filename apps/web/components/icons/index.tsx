'use client'

import React from 'react'

import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

import { cn } from '@/components/utils'

/**
 * with custom size:
 *
 *   <Icon i="close" className="h-10 w-10" />
 *
 * with default alt text:
 *
 *   <Icon i="close" />
 *
 * with custom alt text:
 *
 *   <Icon i="chevronsUpDown" alt="Change team" />
 *
 * without alt text (There are no need for machine readability):
 *
 *   <Icon i="close" noAlt />
 *
 * without alt text (It is given by outside):
 *
 *   <button type="button" onClick={...}>
 *     Destroy
 *     <Icon i="close" noAlt />
 *   </button>
 */

const defaultClassName = 'h-5 w-5'
const defaultAlt = (i: string) => {
  const [head, ...tail] = i.split('')
  if (head == null) return ''
  return tail.reduce((acc, c) => acc + (c === c.toUpperCase() ? ' ' + c.toLowerCase() : c), head.toUpperCase())
}

export const iconClassNames = {
  home: 'i-lucide-home',
  calendar: 'i-lucide-calendar',
  gift: 'i-lucide-gift',
  user: 'i-lucide-user',
  smartphone: 'i-lucide-smartphone',
  guide: 'i-lucide-book-open',
  help: 'i-lucide-help-circle',
  terms: 'i-lucide-file-text',
  privacy: 'i-lucide-shield-check',
  externalLink: 'i-lucide-external-link',
  plusSquare: 'i-lucide-plus-square',

  MoreHorizontal: 'i-lucide-more-horizontal',
  progress: 'i-lucide-loader-circle',
  copy: 'i-lucide-copy',
  check: 'i-lucide-check',
  checkCircle: 'i-lucide-circle-check',
  x: 'i-lucide-x',
  search: 'i-lucide-search',
  trash: 'i-lucide-trash-2',
  plus: 'i-lucide-plus',
  minus: 'i-lucide-minus',
  clock: 'i-lucide-clock',

  tel: 'i-lucide-phone',
  mail: 'i-lucide-mail',
  web: 'i-lucide-globe',

  mapPin: 'i-lucide-map-pin',
  mapPinCheck: 'i-lucide-map-pin-check',
  mapPinOff: 'i-lucide-map-pin-off',

  chevronRight: 'i-lucide-chevron-right',
  chevronLeft: 'i-lucide-chevron-left',
  chevronUp: 'i-lucide-chevron-up',
  chevronDown: 'i-lucide-chevron-down',
  arrowLeftRight: 'i-lucide-arrow-left-right',
  arrowUpRight: 'i-lucide-arrow-up-right',

  info: 'i-lucide-info',
  warning: 'i-lucide-alert-triangle',
  error: 'i-lucide-alert-circle',
  lightbulb: 'i-lucide-lightbulb',

  // custom icon
  /*
  xxxxxx: 'i-custom-xxxxxx',
  */
}

export const Icon = ({
  className,
  i,
  alt,
  noAlt,
  ...props
}: {
  i: keyof typeof iconClassNames
  alt?: string
  noAlt?: boolean
} & React.ComponentProps<'span'>) => {
  const a = alt ?? defaultAlt(i)
  return (
    <>
      <span className={cn(defaultClassName, className, iconClassNames[i])} {...props} />
      {!noAlt && <VisuallyHidden>{a}</VisuallyHidden>}
    </>
  )
}
