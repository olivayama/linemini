'use client'

import React from 'react'

import Link from 'next/link'

import { useQuery } from '@connectrpc/connect-query'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { getImageById, getImageTagById } from '@/gen/services/image/v1/image_service-ImageService_connectquery'
import { getUserById } from '@/services/user_service'

import { ContentLoader } from '../ui/loader'

type BreadcrumbNav = { text?: string; href: string }

export const AdminBreadcrumbs = ({ items }: { items: BreadcrumbNav[] }) => {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {items.length === 0 ? (
            <BreadcrumbPage>HOME</BreadcrumbPage>
          ) : (
            <>
              <BreadcrumbLink asChild>
                <Link href="/admin">HOME</Link>
              </BreadcrumbLink>
            </>
          )}
        </BreadcrumbItem>
        {items.length !== 0 && <BreadcrumbSeparator />}
        {items.map((item, index, items) => (
          <React.Fragment key={index}>
            <BreadcrumbItem>
              {index === items.length - 1 ? (
                <BreadcrumbPage>{item.text}</BreadcrumbPage>
              ) : (
                <>
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.text ?? <ContentLoader />}</Link>
                  </BreadcrumbLink>
                </>
              )}
            </BreadcrumbItem>
            {index !== items.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

// TODO: DSL 化したい

export const AdminBreadcrumbsIndex: React.FC<{ next?: BreadcrumbNav[] }> = (props) => {
  return <AdminBreadcrumbs items={[]} />
}

// User

export const AdminBreadcrumbsUserIndex: React.FC<{ next?: BreadcrumbNav[] }> = (props) => {
  return <AdminBreadcrumbs items={[{ text: 'ユーザー一覧', href: '/admin/users' }, ...(props.next ?? [])]} />
}

export const AdminBreadcrumbsUser: React.FC<{ userId: string }> = (props) => {
  const user = useQuery(getUserById, { userId: props.userId })
  return (
    <AdminBreadcrumbsUserIndex
      next={[
        {
          text: user.data?.user?.customerNumber,
          href: `/admin/users/${props.userId}`,
        },
      ]}
    />
  )
}

// Image

export const AdminBreadcrumbsImageIndex: React.FC<{ next?: BreadcrumbNav[] }> = (props) => {
  return <AdminBreadcrumbs items={[{ text: '画像一覧', href: '/admin/images' }, ...(props.next ?? [])]} />
}

export const AdminBreadcrumbsImageNew: React.FC = () => {
  return <AdminBreadcrumbsImageIndex next={[{ text: '画像アップロード', href: '/admin/images/new' }]} />
}

export const AdminBreadcrumbImage: React.FC<{ imageId: string }> = (props) => {
  const image = useQuery(getImageById, { imageId: props.imageId })
  return (
    <AdminBreadcrumbsImageIndex
      next={[
        {
          text: image.data?.image?.adminName,
          href: `/admin/images/${props.imageId}`,
        },
      ]}
    />
  )
}

// ImageTags

export const AdminBreadcrumbsImageTagIndex: React.FC<{ next?: BreadcrumbNav[] }> = (props) => {
  return <AdminBreadcrumbs items={[{ text: '画像タグ一覧', href: '/admin/image-tags' }, ...(props.next ?? [])]} />
}

export const AdminBreadcrumbsImageTagNew: React.FC = () => {
  return <AdminBreadcrumbsImageTagIndex next={[{ text: '新規作成', href: '/admin/image-tags/new' }]} />
}

export const AdminBreadcrumbImageTag: React.FC<{ imageTagId: string }> = (props) => {
  const imageTag = useQuery(getImageTagById, { imageTagId: props.imageTagId })
  return (
    <AdminBreadcrumbsImageTagIndex
      next={[
        {
          text: imageTag.data?.imageTag?.adminName,
          href: `/admin/image-tags/${props.imageTagId}`,
        },
      ]}
    />
  )
}
