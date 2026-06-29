'use client'

import React from 'react'

import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/components/utils'

export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
  hidden?: boolean
}

export const SelectWrapper: React.FC<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any
  name: string
  options: SelectOption[]
  placeholder: string
  contentClassName?: string
}> = ({ control, name, options, placeholder, contentClassName }) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent className={cn('max-h-64', contentClassName)}>
              {options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={cn({ 'h-0 overflow-hidden p-0': option.hidden })}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
