import { cn } from '@/components/utils'

export const LayoutShell: React.FC<{ children: React.ReactNode }> = (props) => {
  return <div className={cn('grid h-full grid-rows-layout-shell')}>{props.children}</div>
}
