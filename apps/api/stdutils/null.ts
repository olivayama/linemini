import { DomainError } from '@/domain/errors'

export const ensureNotNull = <T>(v: T | null | undefined): T => {
  if (v == null) {
    throw new DomainError('InvalidArgument')
  } else {
    return v
  }
}

export const isNotNull = <T>(v: T | null | undefined): v is T => {
  return v != null
}
