export type DomainErrorCode =
  | 'InvalidArgument'
  | 'EntityNotFound'
  | 'EntityAlreadyExists'
  | 'PermissionDenied'
  | 'ResourceExhausted'
  | 'FailedPrecondition'
  | 'OutOfRange'
  | 'OperationNotImplemented'
  | 'Internal'
  | 'EntityRefsInvariantViolation'
  | 'FailedToAcquireLock'
  | 'Unavailable'
  | 'Unauthenticated'

export class DomainError extends Error {
  static {
    this.prototype.name = 'DomainError'
  }

  public readonly code: DomainErrorCode

  constructor(message: DomainErrorCode, options?: ErrorOptions) {
    super(message, options)
    this.code = message
  }
}
