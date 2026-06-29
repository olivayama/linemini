import React from 'react'

import Link from 'next/link'

import { Code, ConnectError } from '@connectrpc/connect'

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { Button } from './ui/button'

export const ConnectErrorDialog: React.FC<{ error: ConnectError | null; topPage: string; onReload?: () => void }> = (
  props,
) => {
  return (
    <Dialog open={props.error != null}>
      <DialogContent hideCloseButton className="">
        <DialogHeader>
          <DialogTitle>{title(props.error)}</DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <FooterContent error={props.error} topPage={props.topPage} onReload={props.onReload} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const title = (error: ConnectError | null) => {
  switch (error?.code) {
    case null:
    case undefined:
      return undefined
    case Code.NotFound:
      return 'ページが見つかりません'
    default:
      return 'エラーが発生しました'
  }
}

export const FooterContent: React.FC<{ error: ConnectError | null; topPage: string; onReload?: () => void }> = (
  props,
) => {
  switch (props.error?.code) {
    case null:
    case undefined:
      return undefined
    case Code.NotFound:
      return (
        <Button variant="secondary">
          <Link href={props.topPage}>トップに戻る</Link>
        </Button>
      )
    default:
      return (
        <Button variant="secondary" onClick={() => (props.onReload != null ? props.onReload() : location.reload())}>
          再読み込み
        </Button>
      )
  }
}
