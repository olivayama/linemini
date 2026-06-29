import { AdminBreadcrumbsImageTagNew } from '@/components/admin/breadcrumbs'
import { AdminPageContainer } from '@/components/admin/page-container'
import { AdminPageHeader, AdminPageHeaderTitle } from '@/components/admin/page-header'

import { ImageTagForm } from '../form'

export default function AdminImageTagNewPage() {
  return (
    <AdminPageContainer scroll>
      <AdminPageHeader breadcrumbs={<AdminBreadcrumbsImageTagNew />}>
        <AdminPageHeaderTitle>画像タグ作成</AdminPageHeaderTitle>
      </AdminPageHeader>
      <ImageTagForm />
    </AdminPageContainer>
  )
}
