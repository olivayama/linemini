// For null coalescing
// e.g. secret: process.env.SESSION_SECRET ?? throwError('SESSION_SECRET is required')
export const throwError = (msg: string): never => {
  throw new Error(msg)
}
