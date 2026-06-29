'use client'

import React from 'react'

import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'

import { Label } from './ui/label'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'

export type RadioOption = {
  value: string
  label: string
}

export const RadioGroupWrapper: React.FC<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any
  name: string
  options: RadioOption[]
}> = ({ control, name, options }) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <FormItem>
        <FormControl>
          <RadioGroup {...field} onValueChange={field.onChange} name={name}>
            <div className="flex justify-start gap-6 py-4">
              {options.map((option) => (
                <div className="flex items-center space-x-2" key={option.value}>
                  <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />
                  <Label htmlFor={`${name}-${option.value}`} className="flex-auto">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
)
