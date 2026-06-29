import React, { useMemo } from 'react'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface YearMonthSelectProps {
  yearMonthValue: string
  handleYearMonthChange: (value: string) => void
}

const generateMonthOptions = () => {
  const options: { value: string; label: string }[] = [{ value: 'all', label: '指定なし' }]
  const now = new Date()
  const startDate = new Date(2025, 8)

  let current = new Date(now.getFullYear(), now.getMonth())

  while (current >= startDate) {
    const year = current.getFullYear()
    const month = current.getMonth() + 1
    const value = `${year}-${month.toString().padStart(2, '0')}`
    const label = `${year}年${month}月`
    options.push({ value, label })
    current = new Date(year, month - 2)
  }

  return options
}

const YearMonthSelect: React.FC<YearMonthSelectProps> = ({ yearMonthValue, handleYearMonthChange }) => {
  const monthOptions = useMemo(() => generateMonthOptions(), [])

  return (
    <>
      <Label htmlFor="yearMonth" className="text-sm">
        年月
      </Label>
      <Select value={yearMonthValue} onValueChange={handleYearMonthChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="年月を選択" />
        </SelectTrigger>
        <SelectContent>
          {monthOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )
}

export default YearMonthSelect
