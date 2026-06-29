import crypto from 'crypto'

export const generateCustomerNumber = (): string => {
  // yymmddをひっくり返したもの6桁とランダム10桁を合わせた16桁の文字列を生成
  const today = new Date()
  const ddmmyy = today.toISOString().slice(2, 10).replace(/-/g, '').split('').reverse().join('').slice(0, 6)
  const random = crypto.randomInt(0, 10000000000).toString().padStart(10, '0')
  return `${ddmmyy}${random}`
}
