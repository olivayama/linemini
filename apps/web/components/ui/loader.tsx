import React from 'react'

import { LoaderCircleIcon } from 'lucide-react'

import { cn } from '../utils'

export const ContentLoader = React.forwardRef<SVGSVGElement, React.ComponentProps<typeof LoaderCircleIcon>>(
  ({ className, ...props }, ref) => (
    <LoaderCircleIcon className={cn('h-5 w-5 animate-spin text-input', className)} ref={ref} {...props} />
  ),
)
ContentLoader.displayName = 'ContentLoader'

// https://developers.line.biz/ja/docs/line-mini-app/design/loading-icon/
export const MiniPageLoader: React.FC = React.forwardRef<SVGSVGElement, React.ComponentProps<typeof LoaderCircleIcon>>(
  ({ className, ...props }, ref) => (
    <div className="absolute inset-0 grid place-content-center">
      <LoaderCircleIcon className={cn('h-[30px] w-[30px] animate-spin text-primary', className)} ref={ref} {...props} />
    </div>
  ),
)
MiniPageLoader.displayName = 'MiniPageLoader'

// https://developers.line.biz/ja/docs/line-mini-app/design/loading-icon/
export const AdminPageLoader: React.FC = React.forwardRef<SVGSVGElement, React.ComponentProps<typeof LoaderCircleIcon>>(
  ({ className, ...props }, ref) => (
    <div className="absolute inset-0 grid place-content-center">
      <LoaderCircleIcon className={cn('h-10 w-10 animate-spin text-primary', className)} ref={ref} {...props} />
    </div>
  ),
)
AdminPageLoader.displayName = 'AdminPageLoader'
