'use client'

import React from 'react'

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

import { Checkbox } from './ui/checkbox'

export type CheckboxOption = {
  value: string
  label: string
}

export const CheckboxWrapper: React.FC<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any
  name: string
  options: CheckboxOption[]
}> = ({ control, name, options }) => (
  <FormField
    control={control}
    name={name}
    render={() => (
      <FormItem className="py-4">
        {options.map((option) => (
          <FormField
            key={option.value}
            control={control}
            name={name}
            render={({ field }) => {
              return (
                <FormItem key={option.value} className="flex flex-row items-center space-x-2 space-y-0 py-0.5">
                  <FormControl>
                    <Checkbox
                      checked={field.value?.includes(option.value)}
                      onCheckedChange={(checked: boolean) => {
                        return checked
                          ? field.onChange([...field.value, option.value])
                          : field.onChange(field.value?.filter((value: string) => value !== option.value))
                      }}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">{option.label}</FormLabel>
                </FormItem>
              )
            }}
          />
        ))}
        <FormMessage />
      </FormItem>
    )}
  />
)
