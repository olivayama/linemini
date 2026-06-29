'use client'

import React from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface BasicDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  primaryText?: string
  onPrimary?: () => void
  primaryVariant?: 'default' | 'destructive'
  // セカンダリボタンのプロパティ
  secondaryText?: string
  onSecondary?: () => void
  showSecondary?: boolean
}

export const BasicDialog: React.FC<BasicDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  primaryText = 'OK',
  onPrimary,
  primaryVariant = 'default',
  secondaryText = 'キャンセル',
  onSecondary,
  showSecondary = false,
}) => {
  const handlePrimary = () => {
    onPrimary?.()
    onOpenChange(false)
  }

  const handleSecondary = () => {
    onSecondary?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl" hideCloseButton>
        <DialogHeader className="flex place-items-center">
          <DialogTitle className="inline-block text-left text-lg font-semibold">{title}</DialogTitle>
          {description != null && description !== '' && (
            <DialogDescription className="inline-block text-left text-sm">{description}</DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className={showSecondary ? 'grid w-full grid-cols-2 gap-2' : ''}>
          {showSecondary && (
            <DialogClose asChild>
              <Button variant="secondary" className="min-w-[100px]" onClick={handleSecondary}>
                {secondaryText}
              </Button>
            </DialogClose>
          )}
          <DialogClose asChild>
            <Button variant={primaryVariant} className="min-w-[100px]" onClick={handlePrimary}>
              {primaryText}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
