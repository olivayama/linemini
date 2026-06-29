'use client'

import { BottomNavigation } from '@/components/bottom-navigation'
import { cn } from '@/components/utils'

export const BottomNavigationLayout: React.FC<{ children: React.ReactNode; className?: string }> = (props) => {
  return (
    <div className={cn('grid h-full grid-rows-[1fr_auto]', props.className)}>
      <div className="overflow-y-scroll">{props.children}</div>
      <BottomNavigation />
    </div>
  )
}
