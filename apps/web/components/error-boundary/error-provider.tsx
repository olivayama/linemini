'use client'

import React, { ReactNode, createContext, useContext, useState } from 'react'

import { ErrorBoundary, FallbackProps } from 'react-error-boundary'

import { ButtonType, ErrorFallback } from '@/components/error-boundary/error-fallback'

interface ErrorContextType {
  triggerError: (error: Error, options: { title?: string; buttonType?: ButtonType }) => void
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined)

export const useError = () => {
  const context = useContext(ErrorContext)
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider')
  }
  return context
}

export const ErrorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [error, setError] = useState<Error | null>(null)
  const [title, setTitle] = useState<string | undefined>(undefined)
  const [buttonType, setButtonType] = useState<ButtonType | undefined>(undefined)

  const triggerError = (error: Error, options: { title?: string; buttonType?: ButtonType }) => {
    setError(error)
    setTitle(options.title)
    setButtonType(options.buttonType)
  }

  const errorHandler = (error: Error, info: { componentStack: string }) => {
    // エラーのログをここで記録したり、通知したりできます
    console.error('エラーが発生しました:', error, info)
    setError(null) // Reset the error state after catching it
  }

  return (
    <ErrorContext.Provider value={{ triggerError }}>
      <ErrorBoundary
        FallbackComponent={(props: FallbackProps) => <ErrorFallback options={{ title, buttonType }} {...props} />}
        onError={errorHandler}
        onReset={() => setError(null)}
      >
        {error != null ? <ThrowError error={error} /> : children}
      </ErrorBoundary>
    </ErrorContext.Provider>
  )
}

const ThrowError: React.FC<{ error: Error }> = ({ error }) => {
  throw error
}
