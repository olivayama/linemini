import { AdministratorId, UserId } from './ids'

export interface DomainContext {
  now: Date
  adminSession?: { administratorId: AdministratorId }
  userSession?: { userId: UserId }
  isAdminSecretTokenValid: boolean
  isUser: boolean
  isAdmin: boolean
  maskAdminValue: <T>(v: T, mask: T) => T
  // 管理者の id を取得する関数
  requireAdministratorId: () => AdministratorId
  // リクエストしたユーザーの id を取得する関数
  requireUserId: () => UserId
  // リクエストしたユーザーの id を取得する関数
  // 管理者として認証している場合のみ、リクエスト中で指定した userId で上書きが可能
  requireOverridableUserId: (req: { userId?: string }) => UserId | undefined
  ensureUserAuthenticated: () => void
  ensureAdminAuthenticated: () => void
  ensureAuthenticated: () => void
}
