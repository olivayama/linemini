import React from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CustomerNumberInputProps {
  customerNumberValue: string
  handleCustomerNumberChange: React.ChangeEventHandler<HTMLInputElement>
}

const CustomerNumberInput: React.FC<CustomerNumberInputProps> = ({
  customerNumberValue,
  handleCustomerNumberChange,
}) => {
  return (
    <>
      <Label htmlFor="customerNumber" className="text-sm">
        お客様番号
      </Label>
      <Input
        id="customerNumber"
        type="text"
        value={customerNumberValue}
        onChange={handleCustomerNumberChange}
        placeholder=""
      />
    </>
  )
}

export default CustomerNumberInput
