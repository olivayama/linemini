'use client'

import React, { ReactNode, createContext, useCallback, useContext, useRef, useState } from 'react'

type AudioContextType = {
  isAudioEnabled: boolean
  toggleAudio: (enabled: boolean) => void
  playSfx: (sfxKey: string) => void
}

export const AudioContext = createContext<AudioContextType>({
  isAudioEnabled: false,
  toggleAudio: () => undefined,
  playSfx: () => undefined,
})

export const AudioProvider: React.FC<{
  bgm: string // 外からBGMファイルを指定
  sfx: Record<string, string> // sfxKeyと効果音ファイルのマッピング
  children: ReactNode
}> = ({ bgm, sfx, children }) => {
  const bgmRef = useRef<HTMLAudioElement>(null)
  const sfxRef = useRef<HTMLAudioElement>(null)
  const [isAudioEnabled, setIsAudioEnabled] = useState(false)

  // 再生エラーをキャッチする共通関数
  const playAudio = useCallback((audioElement: HTMLAudioElement, src: string) => {
    audioElement.src = src
    audioElement.currentTime = 0
    audioElement.play().catch((error) => {
      console.error('オーディオの再生に失敗しました:', error)
    })
  }, [])

  // オーディオのON/OFF切り替え
  const toggleAudio = useCallback(
    (enabled: boolean) => {
      setIsAudioEnabled(enabled)
      const bgmElement = bgmRef.current
      if (bgmElement != null) {
        enabled ? playAudio(bgmElement, bgm) : bgmElement.pause()
      }
    },
    [bgm, playAudio],
  )

  // 効果音（SFX）を再生
  const playSfx = useCallback(
    (sfxKey: string) => {
      if (!isAudioEnabled) return // オーディオが無効なら再生しない

      const sfxSrc = sfx[sfxKey]
      if (sfxSrc != null && sfxRef.current != null) {
        playAudio(sfxRef.current, sfxSrc)
      }
    },
    [isAudioEnabled, sfx, playAudio],
  )

  return (
    <AudioContext.Provider value={{ isAudioEnabled, toggleAudio, playSfx }}>
      <audio ref={bgmRef} loop />
      <audio ref={sfxRef} />
      {children}
    </AudioContext.Provider>
  )
}

export const useAudio = () => useContext(AudioContext)
