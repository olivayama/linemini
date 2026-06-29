import 'server-only'

import { type AppEnv, appConfig } from '@/app/config'

// 管理画面アクティベーションキー (docs/rules/refs/apps/web/admin-protection.md)
// 監査対応案件のみ、保護したい env のキーを 16 文字英数字 (^[a-z0-9]{16}$) で設定する
// キーを設定した env はリポジトリ直下の README.md の Admin セクションにアクティベーション URL を追記する
const adminUrlKeyByEnv: Partial<Record<AppEnv, string>> = {
  // stg: 'xxxxxxxxxxxxxxxx',
  // prd: 'xxxxxxxxxxxxxxxx',
}

export const appConfigServer = {
  adminUrlKey: adminUrlKeyByEnv[appConfig.appEnv],
} as const
