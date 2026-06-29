import * as React from 'react'

import { Slot } from '@radix-ui/react-slot'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@/components/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // shadcn standard
        // default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        // destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        // outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        // secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        // ghost: 'hover:bg-accent hover:text-accent-foreground',
        // link: 'text-primary underline-offset-4 hover:underline',

        // pj custom
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        tertiary: 'bg-orange-100 text-muted-foreground hover:bg-orange-100/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        'in-table': 'bg-muted text-foreground hover:bg-muted/80',
        selected: '!bg-orange-600 text-white hover:!bg-orange-500',
        strong: '!bg-orange-600 text-white hover:!bg-orange-500',
      },
      size: {
        // shadcn standard
        // default: 'h-10 px-4 py-2',
        // sm: 'h-9 rounded-md px-3',
        // lg: 'h-11 rounded-md px-8',
        // icon: 'h-10 w-10',

        // pj custom
        xs: 'h-9 px-3',
        sm: 'h-10 px-4',
        default: 'h-11 px-5',
        lg: 'h-12 px-6',
        xl: 'h-[52px] px-7',
        xxl: 'h-14 px-8',
        'icon-xs': 'h-9 w-9',
        'icon-sm': 'h-10 w-10',
        icon: 'h-11 w-11',
      },
      // カスタマイズ
      // 改行設定のvariantを追加
      //   - デフォルトでは改行しない (nowrap)
      //   - 改行を許可する場合は、`wrap` を opt-in で指定する
      // 改行 (`wrap`) を用意している理由：
      // 1行内に収まるようにデザインしても、スマートフォン端末のアクセシビリティ機能で拡大表示すると文字がボタンからはみ出して読めなくなるため
      wrap: {
        wrap: 'whitespace-normal min-h-max [overflow-wrap:anywhere] text-left',
        nowrap: 'whitespace-nowrap',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      // カスタマイズ：wrapのvariantを追加。改行は opt-in なのでデフォルトは nowrap
      wrap: 'nowrap',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  // カスタマイズ：wrapのvariantを追加
  ({ className, variant, size, wrap, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'

    // カスタマイズ
    // <button> が <form> の中にある場合、明示的に指定しない場合 "submit" ボタンとして扱われる
    // 戻るボタンなどを配置したい場合に困るので明示的に指定する
    if (Comp === 'button' && props.type == null) {
      props.type = 'button'
    }

    return <Comp className={cn(buttonVariants({ variant, size, wrap, className }))} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
