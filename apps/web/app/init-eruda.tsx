'use client'

import React from 'react'

import Script from 'next/script'

// eruda はモバイル向けデバッグコンソール（画面内 DevTools）。
// DevTools を繋げない LINE アプリ内 webview などで console / network / cookie 等を確認するために読み込む。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const eruda: any

export const InitEruda: React.FC<{ enabled: boolean }> = (props) => {
  return props.enabled ? (
    <Script
      src="https://unpkg.com/eruda@3.4.3/eruda.js"
      integrity="sha384-weDBY9jeIj4NqaiZF9f6PMAMMY4lIu+0CAI+TjBIE73RctCQOxDoEHltYnstRszI"
      crossOrigin="anonymous"
      onLoad={() => eruda.init()}
    />
  ) : (
    <></>
  )
}
