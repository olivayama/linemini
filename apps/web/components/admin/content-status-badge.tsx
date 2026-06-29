import { Badge } from '../ui/badge'
import { cn } from '../utils'

export const ContentStatusBadge: React.FC<{ content: { isDeactivated: boolean } }> = ({ content }) => {
  return (
    <Badge
      className={cn('flex h-9 w-20 items-center justify-center text-muted-foreground', {
        'bg-gray-200': content.isDeactivated,
        'bg-orange-50': !content.isDeactivated,
      })}
    >
      {content.isDeactivated ? '一時停止' : '公開中'}
    </Badge>
  )
}
