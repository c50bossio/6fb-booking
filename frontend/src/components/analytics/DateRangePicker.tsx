'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import { format } from 'date-fns'

interface DateRangePickerProps {
  value: { from: Date; to: Date }
  onChange: (range: { from: Date; to: Date }) => void
  quickRanges?: Array<{
    label: string
    value: () => { from: Date; to: Date }
  }>
}

export function DateRangePicker({ value, onChange, quickRanges = [] }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2"
      >
        <Calendar className="h-4 w-4" />
        <span>
          {format(value.from, 'MMM dd, yyyy')} - {format(value.to, 'MMM dd, yyyy')}
        </span>
      </Button>

      {isOpen && (
        <Card className="absolute top-full mt-2 right-0 p-4 z-50 shadow-lg">
          <div className="space-y-2">
            {quickRanges.map((range, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  onChange(range.value())
                  setIsOpen(false)
                }}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}