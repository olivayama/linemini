'use client'

import React from 'react'

import { disableQuery } from '@connectrpc/connect-query'

export type AdminSession = {
  isLoading: boolean
  isLoggedIn: boolean
  accessToken?: string
  statusCode?: number
}

export type AdminSessionContextType = AdminSession & {
  init: () => Promise<number>
  signIn: (payload: { email: string; password: string }) => Promise<boolean>
  signOut: (opts?: { redirectTo?: string }) => Promise<void>
  query: <Q extends {}>(q: Q) => Q | typeof disableQuery
}

export const AdminSessionContext = React.createContext<AdminSessionContextType>({
  isLoading: true,
  isLoggedIn: false,
  statusCode: undefined,
  accessToken: undefined,
  init: async () => 0,
  signIn: async () => false,
  signOut: async () => {},
  query: () => disableQuery,
})
