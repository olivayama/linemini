'use client'

import * as React from 'react'

import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { type VariantProps, cva } from 'class-variance-authority'
import { Check } from 'lucide-react'

import { cn } from '@/components/utils'

const checkboxVariants = cva(
  'peer h-4 w-4 shrink-0 rounded-sm border ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        secondary: 'border-secondary data-[state=checked]:bg-secondary data-[state=checked]:text-secondary-foreground',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
)

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
    VariantProps<typeof checkboxVariants> {}

const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ className, variant, ...props }, ref) => (
    <CheckboxPrimitive.Root ref={ref} className={cn(checkboxVariants({ variant, className }))} {...props}>
      <CheckboxPrimitive.Indicator className={cn('flex items-center justify-center text-current')}>
        <Check className="h-4 w-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  ),
)
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox, checkboxVariants }
