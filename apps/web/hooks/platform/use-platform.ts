'use client'

import { useEffect, useState } from 'react'

import { getPlatform } from '.'
import { type Platform, UNKNOWN_PLATFORM } from './parse'

/**
 * ハイドレーション安全なプラットフォーム取得フック。
 * 初回レンダーは SSR と一致させるため既定値（UNKNOWN_PLATFORM）を返し、
 * マウント後の effect で実値へ更新する。描画分岐に使う場合はこれを用いる。
 */
export const usePlatform = (): Platform => {
  const [platform, setPlatform] = useState<Platform>(UNKNOWN_PLATFORM)
  useEffect(() => {
    setPlatform(getPlatform())
  }, [])
  return platform
}
