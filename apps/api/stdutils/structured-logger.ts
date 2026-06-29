import { getLogger } from '@/stdutils/log-context'

type StructuredLogLevel = 'info' | 'warn' | 'error'

export const log = (level: StructuredLogLevel, event: string, payload: Record<string, unknown>) => {
  const logger = getLogger()
  if (logger == null) return

  logger[level](
    {
      ...payload,
      event,
    },
    event,
  )
}
