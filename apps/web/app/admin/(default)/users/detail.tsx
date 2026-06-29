'use client'

import React from 'react'

import { useQuery } from '@connectrpc/connect-query'
import { ColumnDef } from '@tanstack/react-table'

import { DataTable } from '@/components/ui/data-table'
import { ContentLoader } from '@/components/ui/loader'
import { prefectureCodeOptions, productSourceOptions, sexCodeOptions } from '@/components/user/user'
import { User, UserServiceAgreement, UserTutorialCompletion } from '@/gen/services/user/v1/user_pb'
import { getUserById } from '@/services/user_service'
import { dateOnlyToDateOpt } from '@/stdutils/date-only'
import { formatYMDOpt } from '@/stdutils/intl'

const userServiceAgreementColumns: ColumnDef<UserServiceAgreement>[] = [
  {
    accessorKey: 'version',
    header: 'バージョン',
  },
  {
    accessorKey: 'agreed_at',
    header: '同意日時',
    accessorFn: (row) => row.agreedAt?.toDate().toLocaleString(),
  },
]

const userTutorialCompletionColumns: ColumnDef<UserTutorialCompletion>[] = [
  {
    accessorKey: 'version',
    header: 'バージョン',
  },
  {
    accessorKey: 'completed_at',
    header: '完了日時',
    accessorFn: (row) => row.completedAt?.toDate().toLocaleString(),
  },
]

export const UserDetail: React.FC<{ userId?: string }> = (props) => {
  const userQuery = useQuery(
    getUserById,
    { userId: props.userId },
    {
      enabled: props.userId != null,
    },
  )

  if (userQuery.data?.user == null) {
    return <ContentLoader />
  } else {
    return <UserDetailImpl user={userQuery.data.user} />
  }
}

//TODO: デザイン
const UserDetailImpl: React.FC<{ user: User }> = (props) => {
  return (
    <>
      <div className="space-y-6 overflow-y-auto">
        <div className="space-y-2">
          <div className="text-lg font-bold">ユーザー情報</div>
          <div className="space-y-4 rounded-lg bg-popover p-4">
            <div className="space-y-2">
              <h3 className="text-gray-500">ID</h3>
              <p>{props.user.id}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-gray-500">お客様番号</h3>
              <p>{props.user.customerNumber}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-gray-500">登録日時</h3>
              <p>{props.user.signedUpAt?.toDate().toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-gray-500">リファラー</h3>
              <p>{props.user.referrer ?? '-'}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-gray-500">初回アクセスパス</h3>
              <p>{props.user.firstAccessPath}</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-lg font-bold">プロフィール情報</div>
          <div className="space-y-4 rounded-lg bg-popover p-4">
            {props.user.profile == null ? (
              '-'
            ) : (
              <>
                <div className="space-y-2">
                  <h3 className="text-gray-500">生年月日</h3>
                  <p>{formatYMDOpt(dateOnlyToDateOpt(props.user.profile?.birthday))}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-gray-500">性別</h3>
                  <p>
                    {sexCodeOptions.find((option) => option.value === props.user.profile?.sexCode?.toString())?.label}
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-gray-500">居住地（都道府県）</h3>
                  <p>
                    {
                      prefectureCodeOptions.find(
                        (option) => option.value === props.user.profile?.prefectureCode?.toString(),
                      )?.label
                    }
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-gray-500">どこで商品を知りましたか？</h3>
                  <p>
                    {
                      productSourceOptions.find(
                        (option) =>
                          option.value ===
                          props.user.profile?.initialQuestionnaireAnswers?.answers.find(
                            (answer) => answer.question === 'product_source',
                          )?.answer[0],
                      )?.label
                    }
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-lg font-bold">サービス同意履歴</div>
          <DataTable columns={userServiceAgreementColumns} data={props.user.serviceAgreements} />
        </div>
        <div className="space-y-2">
          <div className="text-lg font-bold">チュートリアル完了履歴</div>
          <DataTable columns={userTutorialCompletionColumns} data={props.user.tutorialCompletions} />
        </div>
      </div>
    </>
  )
}
