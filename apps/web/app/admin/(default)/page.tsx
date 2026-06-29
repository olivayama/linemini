import { AdminBreadcrumbsIndex } from '@/components/admin/breadcrumbs'
import { AdminPageContainer } from '@/components/admin/page-container'
import { AdminPageHeader, AdminPageHeaderTitle } from '@/components/admin/page-header'

export default function AdminIndexPage() {
  return (
    <AdminPageContainer>
      <AdminPageHeader breadcrumbs={<AdminBreadcrumbsIndex />}>
        <AdminPageHeaderTitle>HOME</AdminPageHeaderTitle>
      </AdminPageHeader>
    </AdminPageContainer>
  )
}
