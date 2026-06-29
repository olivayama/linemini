import Link from 'next/link'

import { AdminBreadcrumbsImageIndex } from '@/components/admin/breadcrumbs'
import { AdminPageContainer } from '@/components/admin/page-container'
import { AdminPageHeader, AdminPageHeaderTitle } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'

import { ImageDataTable } from './data-table'

export default function AdminImageIndexPage() {
  return (
    <AdminPageContainer>
      <AdminPageHeader breadcrumbs={<AdminBreadcrumbsImageIndex />}>
        <AdminPageHeaderTitle>画像一覧</AdminPageHeaderTitle>
        <Button type="button" className="rounded-full" asChild>
          <Link href="/admin/images/new">画像アップロード</Link>
        </Button>
      </AdminPageHeader>
      <ImageDataTable />
    </AdminPageContainer>
  )
}
