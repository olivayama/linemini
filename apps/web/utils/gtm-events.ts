import { sendGTMEvent } from '@next/third-parties/google'

import { appConfig } from '@/app/config'

// 案件固有イベントを discriminated union で定義する（name + 必要なら固有のドメインデータ）。
// 案件ごとにこの union を埋める。
type GtmDataLayerEvent = { name: 'example_event'; example: { id: string; name: string } }
// | { name: '...'; ... }

export const sendGtmDataLayerEvent = (event: GtmDataLayerEvent) => {
  // 生のドメインデータ → GA4 送信形式へ加工する層。
  // GA4 はパラメータにネストを送れず値は最大 100 文字。ID 等は末尾数桁で識別性を保つ。
  let payload = {}
  switch (event.name) {
    case 'example_event':
      payload = { example: `${event.example.name}_${last4(event.example.id)}` }
      break
  }

  if (appConfig.appEnv === 'dev') {
    console.log('sendGTMEvent', {
      event: 'data_layer_event',
      data_layer_event_name: event.name,
      ...payload,
    })
  }

  sendGTMEvent({ event: 'data_layer_event', data_layer_event_name: event.name, ...payload })
}

const last4 = (str: string) => str.slice(-4)
