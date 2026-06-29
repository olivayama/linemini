'use client'

import React from 'react'

import { useLiff } from '@/providers/liff-provider'

import { LineLoginButton } from './line-login-button'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'

export const RequireSession: React.FC = () => {
  const liff = useLiff()
  const isRequiredLineLoginOnGeneralBrowser = true

  return (
    <>
      <Dialog open={liff.isInClient && liff.tokenError != null}>
        <DialogContent hideCloseButton className="bg-white text-[hsl(222.2,84%,4.9%)]">
          <DialogHeader>
            <DialogTitle>再読み込みが必要です</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={liff.login}>
              再読み込み
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={
          isRequiredLineLoginOnGeneralBrowser && !liff.isInClient && (liff.tokenError != null || !liff.isLoggedIn())
        }
      >
        <DialogContent hideCloseButton className="bg-white text-[hsl(222.2,84%,4.9%)]">
          <DialogHeader>
            <DialogTitle>LINEでログインが必要です</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <LineLoginButton onClick={liff.login} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
