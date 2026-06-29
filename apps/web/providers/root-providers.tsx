import React from 'react'

import { ConnectrpcProvider } from './connectrpc-provider'
import { SessionProvider } from './user-session-provider'

export const RootProviders: React.FC<{ children: React.ReactNode }> = (props) => {
  return (
    <SessionProvider>
      <ConnectrpcProvider>{props.children}</ConnectrpcProvider>
    </SessionProvider>
  )
}
