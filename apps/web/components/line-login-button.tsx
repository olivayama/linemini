// ref. https://developers.line.biz/ja/docs/line-login/login-button
import React from 'react'

import Image from 'next/image'

import { cn } from './utils'

export interface LineLoginButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const LineLoginButton = React.forwardRef<HTMLButtonElement, LineLoginButtonProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        className={cn(
          'group relative flex items-stretch overflow-hidden rounded-md bg-line-background font-bold text-line-foreground outline-none ring-offset-1 focus:ring-[2px] disabled:border disabled:border-line-disabled-border disabled:bg-line-disabled-background',
          className,
        )}
        {...props}
      >
        <span className="absolute inset-0 group-hover:bg-line-hover group-active:bg-line-active group-disabled:hidden" />
        <Image
          unoptimized
          width={40}
          height={40}
          src="/mini/assets/images/line-button/line-icon.png"
          alt="LINE"
          // invert-[0.88] が #1F1F1F になり、公式のガイドライン #1E1E1E (20%) に近い
          className="h-[40px] w-[40px] p-1 group-disabled:opacity-20 group-disabled:invert-[0.88] group-disabled:filter"
        />
        <span className="flex items-center border-l border-line-vertical px-8 text-sm text-line-foreground  group-disabled:border-line-disabled-vertical group-disabled:text-line-disabled-foreground">
          LINEでログイン
        </span>
      </button>
    )
  },
)

LineLoginButton.displayName = 'LineLoginButton'
