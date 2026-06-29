import { AdminBreadcrumbsUserIndex } from '@/components/admin/breadcrumbs'
import { AdminPageContainer } from '@/components/admin/page-container'
import { AdminPageHeader, AdminPageHeaderTitle } from '@/components/admin/page-header'

import { UserCsvDownloadButton } from './csv-download-button'
import { UserDataTable } from './data-table'

export default function AdminUserIndexPage() {
  return (
    <AdminPageContainer>
      <AdminPageHeader breadcrumbs={<AdminBreadcrumbsUserIndex />}>
        <AdminPageHeaderTitle>ユーザー一覧</AdminPageHeaderTitle>
        <UserCsvDownloadButton />
      </AdminPageHeader>
      <UserDataTable />
    </AdminPageContainer>
  )
}
