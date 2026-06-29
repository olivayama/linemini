'use client'

import * as React from 'react'

import { PlainMessage } from '@bufbuild/protobuf'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/components/utils'
import { DateOnly } from '@/gen/stdutils/date_only_pb'
import { formatDateOnly } from '@/stdutils/date-only'
import { formatYMDHm } from '@/stdutils/intl'
import { mapOption } from '@/stdutils/option'

import { Input } from './input'

export const DatePicker = React.forwardRef<
  HTMLButtonElement,
  Omit<React.ComponentProps<typeof Button>, 'children'> & {
    dateOnly: PlainMessage<DateOnly> | undefined | null
    onSelect: (dateOnly: PlainMessage<DateOnly> | undefined) => void
  }
>(({ className, dateOnly, onSelect, ...props }, ref) => {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant={'outline'}
          className={cn(
            'flex w-[280px] justify-start text-left font-normal',
            dateOnly == null && 'text-muted-foreground',
            className,
          )}
          {...props}
        >
          <span className="i-lucide-calendar mr-2 h-4 w-4" />
          {mapOption(dateOnly, formatDateOnly) ?? <span>日付を選択</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={dateOnly == null ? undefined : new Date(dateOnly.year, dateOnly.month - 1, dateOnly.dayOfMonth)}
          onSelect={(date) => {
            if (date == null) {
              onSelect(undefined)
            } else {
              onSelect({
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                dayOfMonth: date.getDate(),
              })
            }
            setOpen(false)
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
})
DatePicker.displayName = 'DatePicker'

export const DateTimePicker = React.forwardRef<
  HTMLButtonElement,
  Omit<React.ComponentProps<typeof Button>, 'children'> & {
    date: Date | undefined | null
    defaultTime?: string
    onSelect: (dateOnly: Date | undefined) => void
  }
>(({ className, defaultTime, date, onSelect, ...props }, ref) => {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant={'outline'}
          className={cn(
            'flex w-[280px] justify-start text-left font-normal',
            date == null && 'text-muted-foreground',
            className,
          )}
          {...props}
        >
          <span className="i-lucide-calendar mr-2 h-4 w-4" />
          {mapOption(date, formatYMDHm) ?? <span>日時を選択</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date ?? undefined}
          onSelect={(selectedDate) => {
            if (selectedDate == null) {
              return
            }
            const currentTime = date == null ? undefined : new Date(date)
            const newDate = new Date(selectedDate)
            if (currentTime != null) {
              newDate.setHours(currentTime.getHours(), currentTime.getMinutes())
            }
            onSelect(newDate)
          }}
          initialFocus
        />
        <div className="flex items-center gap-2 px-4 py-2">
          <Input
            type="time"
            className="justify-center"
            disabled={date == null}
            value={
              date?.toLocaleTimeString([], {
                hourCycle: 'h23',
                hour: '2-digit',
                minute: '2-digit',
              }) ??
              defaultTime ??
              '00:00'
            }
            // take hours and minutes and update our Date object then change date object to our new value
            onChange={(selectedTime) => {
              if (date == null) {
                return
              }
              const currentTime = new Date(date)
              currentTime.setHours(
                parseInt(selectedTime.target.value.split(':')[0] ?? '0'),
                parseInt(selectedTime.target.value.split(':')[1] ?? '0'),
                0,
              )
              onSelect(currentTime)
            }}
          />
          <Button
            size="sm"
            className="flex-shrink-0 rounded-full"
            onClick={() => {
              setOpen(false)
            }}
          >
            <span className="size-5 i-lucide-check" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
})
DateTimePicker.displayName = 'DateTimePicker'
