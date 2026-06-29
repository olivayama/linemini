import bcrypt from 'bcrypt'

export const hash = (input: string, options: { pepper: string }) => {
  const saltRounds = 10
  return bcrypt.hash(input + options.pepper, saltRounds)
}

export const compareHash = (input: string, hashed: string, options: { pepper: string }) => {
  return bcrypt.compare(input + options.pepper, hashed)
}
