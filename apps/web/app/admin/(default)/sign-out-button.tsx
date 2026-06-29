'use client'

import { useAdminSession } from '@/components/admin/session/use-admin-session'
import { Button } from '@/components/ui/button'

export const AdminSignOutButton: React.FC = () => {
  const adminSession = useAdminSession()
  return (
    <Button
      type="button"
      variant="ghost"
      className="flex items-center gap-2"
      onClick={() => adminSession.signOut({ redirectTo: '/admin/sign-in' })}
    >
      ログアウト
      <span className="size-4 i-lucide-log-out" />
    </Button>
  )
}
