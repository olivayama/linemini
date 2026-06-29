'use client'

import React from 'react'

import Link from 'next/link'

import { Button } from '@/components/ui/button'

type ButtonProps = React.ComponentProps<typeof Button>
type LinkButtonProps = {
  href: string
  rel?: string | undefined
  target?: React.HTMLAttributeAnchorTarget | undefined
} & ButtonProps

// router.push()だと自動でprefetchされないため、Buttonの見た目でLink遷移したい場面で利用を想定
export const LinkButton: React.FC<LinkButtonProps> = ({ children, href, rel, target, ...props }) => {
  return (
    <Button asChild={!props.disabled} {...props}>
      {props.disabled ? (
        children
      ) : (
        <Link href={href} rel={rel} target={target}>
          {children}
        </Link>
      )}
    </Button>
  )
}
