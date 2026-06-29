import { AdminBreadcrumbImageTag } from '@/components/admin/breadcrumbs'
import { AdminPageContainer } from '@/components/admin/page-container'
import { AdminPageHeader, AdminPageHeaderTitle } from '@/components/admin/page-header'

import { ImageTagForm } from '../form'

export default function AdminImageTagEditPage(props: { params: { imageTagId: string } }) {
  return (
    <AdminPageContainer scroll>
      <AdminPageHeader breadcrumbs={<AdminBreadcrumbImageTag {...props.params} />}>
        <AdminPageHeaderTitle>画像タグ編集</AdminPageHeaderTitle>
      </AdminPageHeader>
      <ImageTagForm imageTagId={props.params.imageTagId} />
    </AdminPageContainer>
  )
}
