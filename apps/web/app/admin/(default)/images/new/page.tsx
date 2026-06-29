import { AdminBreadcrumbsImageNew } from '@/components/admin/breadcrumbs'
import { AdminPageContainer } from '@/components/admin/page-container'
import { AdminPageHeader, AdminPageHeaderTitle } from '@/components/admin/page-header'

import { ImageForm } from '../form'

export default function AdminImageNewPage() {
  return (
    <AdminPageContainer scroll>
      <AdminPageHeader breadcrumbs={<AdminBreadcrumbsImageNew />}>
        <AdminPageHeaderTitle>画像アップロード</AdminPageHeaderTitle>
      </AdminPageHeader>
      <ImageForm />
    </AdminPageContainer>
  )
}
