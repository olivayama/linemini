import Link from 'next/link'

import { AdminBreadcrumbsImageTagIndex } from '@/components/admin/breadcrumbs'
import { AdminPageContainer } from '@/components/admin/page-container'
import { AdminPageHeader, AdminPageHeaderTitle } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'

import { ImageTagDataTable } from './data-table'

export default function AdminImageTagIndexPage() {
  return (
    <AdminPageContainer>
      <AdminPageHeader breadcrumbs={<AdminBreadcrumbsImageTagIndex />}>
        <AdminPageHeaderTitle>画像タグ一覧</AdminPageHeaderTitle>
        <Button type="button" className="rounded-full" asChild>
          <Link href="/admin/image-tags/new">新規作成</Link>
        </Button>
      </AdminPageHeader>
      <ImageTagDataTable />
    </AdminPageContainer>
  )
}
