import { AdminBreadcrumbImage } from '@/components/admin/breadcrumbs'
import { AdminPageContainer } from '@/components/admin/page-container'
import { AdminPageHeader, AdminPageHeaderTitle } from '@/components/admin/page-header'

import { ImageForm } from '../form'

export default function AdminImageEditPage(props: { params: { imageId: string } }) {
  return (
    <AdminPageContainer scroll>
      <AdminPageHeader breadcrumbs={<AdminBreadcrumbImage {...props.params} />}>
        <AdminPageHeaderTitle>画像編集</AdminPageHeaderTitle>
      </AdminPageHeader>
      <ImageForm imageId={props.params.imageId} />
    </AdminPageContainer>
  )
}
