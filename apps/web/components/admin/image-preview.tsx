import React from 'react'

import { cn } from '../utils'

export const AdminImagePreview = React.forwardRef<
  HTMLButtonElement,
  Omit<React.ComponentProps<'button'>, 'children'> & {
    src: string
    adminName?: string
  }
>(({ className, src, adminName, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn('flex flex-col justify-stretch overflow-hidden border bg-white', className)}
      type="button"
      style={{
        backgroundImage: `linear-gradient(45deg, #e9e9e9 25%, transparent 25%), linear-gradient(-45deg, #e9e9e9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e9e9e9 75%), linear-gradient(-45deg, transparent 75%, #e9e9e9 75%)`,
        backgroundSize: '16px 16px',
        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
      }}
      {...props}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} className="aspect-square h-full w-full object-contain" alt="" />
      {adminName != null && <div className="w-full border bg-input p-2 text-xs">{adminName}</div>}
    </button>
  )
})
AdminImagePreview.displayName = 'AdminImagePreview'
