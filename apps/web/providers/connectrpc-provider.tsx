'use client'

import React, { useMemo } from 'react'

import { Code, ConnectError } from '@connectrpc/connect'
import { TransportProvider } from '@connectrpc/connect-query'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useAdminSession } from '@/components/admin/session/use-admin-session'
import { createConnectTransportAdminWeb, createConnectTransportUserWeb } from '@/stdutils/connect'

import { useUserSession } from './user-session-provider'

export const ConnectrpcProvider: React.FC<{ isAdmin?: boolean; children: React.ReactNode }> = (props) => {
  const userSession = useUserSession()
  const adminSession = useAdminSession()
  const transport = useMemo(
    () =>
      props.isAdmin
        ? createConnectTransportAdminWeb({ token: adminSession.accessToken })
        : createConnectTransportUserWeb({ token: userSession.accessToken }),
    [adminSession.accessToken, props.isAdmin, userSession.accessToken],
  )

  const [queryClient] = React.useState(() => {
    console.log('QueryClient')
    return new QueryClient({
      defaultOptions: {
        queries: {
          retry: (failureCount, error) => {
            return (
              failureCount < 3 &&
              (!(error instanceof ConnectError) ||
                (error.code !== Code.InvalidArgument &&
                  error.code !== Code.NotFound &&
                  error.code !== Code.Unauthenticated &&
                  error.code !== Code.PermissionDenied))
            )
          },
        },
      },
      mutationCache: new MutationCache({
        onError: async (error) => {
          if (error instanceof ConnectError) {
            if (error.code === Code.Unauthenticated) {
              if (props.isAdmin) await adminSession.signOut()
              else await userSession.signOut()
            } else {
              console.error('Global error handler', error)
            }
          }
        },
      }),
      queryCache: new QueryCache({
        onError: async (error) => {
          if (error instanceof ConnectError) {
            if (error.code === Code.Unauthenticated) {
              if (props.isAdmin) await adminSession.signOut()
              else await userSession.signOut()
            } else {
              console.error('Global error handler', error)
            }
          }
        },
      }),
    })
  })

  return (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
    </TransportProvider>
  )
}
