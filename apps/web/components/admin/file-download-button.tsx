'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

import { Code, ConnectError, createPromiseClient } from '@connectrpc/connect'
import { useTransport } from '@connectrpc/connect-query'

import { appConfig } from '@/app/config'
import { Button, ButtonProps } from '@/components/ui/button'
import { ContentLoader } from '@/components/ui/loader'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/components/utils'

// バイナリチャンクのストリーム(stdutils.ExportCSVResponse 相当)のペイロード形状。
type StreamPayload =
  | { case: 'metadata'; value: { estimatedChunkCount: number } }
  | { case: 'chunk'; value: Uint8Array }
  | { case: undefined; value?: undefined }

interface FileDownloadButtonProps<TService extends Parameters<typeof createPromiseClient>[0]> extends ButtonProps {
  /** ファイル名のベース部分 */
  fileName: string
  /** ダウンロードファイルの拡張子 (例: 'csv') */
  extension: string
  /** Blob の MIME タイプ (例: 'text/csv') */
  mimeType: string
  /** ダウンロード対象の connect サービス */
  service: TService
  /** メタデータ+チャンクのストリームを返す RPC 呼び出し */
  streamMethod: (
    client: ReturnType<typeof createPromiseClient<TService>>,
    signal: AbortSignal,
  ) => AsyncIterable<{ csv?: { payload: StreamPayload } }>
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function FileDownloadButtonInner<TService extends Parameters<typeof createPromiseClient>[0]>(
  {
    fileName,
    extension,
    mimeType,
    service,
    streamMethod,
    className,
    children,
    ...props
  }: FileDownloadButtonProps<TService>,
  ref: React.ForwardedRef<HTMLButtonElement>,
) {
  const transport = useTransport()
  const [progress, setProgress] = useState<number | undefined>(undefined)
  const abortControllerRef = useRef<AbortController | undefined>(undefined)

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const handleDownload = useCallback(async () => {
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setProgress(0)
    const chunks: Uint8Array[] = []
    let estimatedChunkCount: number | undefined = undefined

    try {
      const client = createPromiseClient(service, transport)
      for await (const res of streamMethod(client, abortController.signal)) {
        const payload = res.csv?.payload
        if (payload == null) continue

        switch (payload.case) {
          case 'metadata':
            estimatedChunkCount = payload.value.estimatedChunkCount
            break
          case 'chunk':
            chunks.push(payload.value)
            if (estimatedChunkCount != null) {
              setProgress(Math.min(99, (chunks.length / estimatedChunkCount) * 100))
            }
            break
          default:
            break
        }
      }

      const blob = new Blob(chunks as BlobPart[], { type: mimeType })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')

      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      const date = `${year}${month}${day}${hours}${minutes}${seconds}`

      a.href = url
      a.download = `${appConfig.appEnv}-${fileName}-${date}.${extension}`
      a.click()
      window.URL.revokeObjectURL(url)

      setProgress(100)
      await sleep(500)
    } catch (error) {
      if (error instanceof ConnectError && error.code === Code.Canceled) {
        return
      }
      throw error
    } finally {
      setProgress(undefined)
    }
  }, [fileName, extension, mimeType, service, streamMethod, transport])

  return (
    <div className="relative">
      <Button
        {...props}
        className={cn('rounded-full', className)}
        ref={ref}
        disabled={progress != null}
        onClick={handleDownload}
      >
        {progress != null ? (
          <div className="flex items-center gap-2">
            <ContentLoader className="h-4 w-4" />
            ダウンロード中...
          </div>
        ) : (
          children ?? 'ダウンロード'
        )}
      </Button>
      {progress != null && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] space-y-2">
          <Progress value={progress} className="h-1" />
          <div className="text-center text-xs text-muted-foreground">{Math.floor(progress)}%</div>
        </div>
      )}
    </div>
  )
}

const FileDownloadButton = React.forwardRef(FileDownloadButtonInner) as <
  TService extends Parameters<typeof createPromiseClient>[0],
>(
  props: FileDownloadButtonProps<TService> & { ref?: React.ForwardedRef<HTMLButtonElement> },
) => React.ReactElement

export { FileDownloadButton }
