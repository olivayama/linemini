'use client'

import React from 'react'

import Image from 'next/image'

import { useLiff } from '@/providers/liff-provider'

export const WaitLiffInit = (props: { children: React.ReactNode }) => {
  const liff = useLiff()

  return !liff.initialized ? (
    <div className="grid h-full w-full place-items-center">
      <div className="grid w-[30%] max-w-[150px] place-items-center gap-8">
        <Image
          src="/mini/assets/images/logos/app-logo.png"
          layout="responsive"
          width={284}
          height={351}
          alt="app logo"
          unoptimized
          priority={true}
        />
        <div className="i-lucide-loader-circle h-10 w-10 animate-spin" />
      </div>
    </div>
  ) : (
    props.children
  )
}
