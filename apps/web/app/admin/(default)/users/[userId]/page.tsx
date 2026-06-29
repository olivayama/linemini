import { AdminBreadcrumbsUser } from '@/components/admin/breadcrumbs'
import { AdminPageContainer } from '@/components/admin/page-container'
import { AdminPageHeader, AdminPageHeaderTitle } from '@/components/admin/page-header'

import { UserDetail } from '../detail'

export default function AdminUserPage(props: { params: { userId: string } }) {
  return (
    <AdminPageContainer>
      <AdminPageHeader breadcrumbs={<AdminBreadcrumbsUser {...props.params} />}>
        <AdminPageHeaderTitle>ユーザー詳細</AdminPageHeaderTitle>
      </AdminPageHeader>
      <UserDetail userId={props.params.userId} />
    </AdminPageContainer>
  )
}
