import React from 'react'

export const AdminPageHeader: React.FC<{ children: React.ReactNode; breadcrumbs: React.ReactNode }> = (props) => {
  return (
    <div className="flex flex-col gap-4">
      {props.breadcrumbs}
      {/* NOTE: Button を含む場合と含まない場合で高さが変わらないようにするため、高さを指定する */}
      <div className="flex h-10 items-center justify-between">{props.children}</div>
    </div>
  )
}

export const AdminPageHeaderTitle: React.FC<{ children: React.ReactNode }> = (props) => {
  return <h2 className="text-2xl font-bold">{props.children}</h2>
}
