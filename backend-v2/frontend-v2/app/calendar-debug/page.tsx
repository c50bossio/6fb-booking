'use client'

import { useState } from 'react'
import CalendarMonthView from '@/components/CalendarMonthView'

export default function CalendarDebugPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Calendar Debug</h1>
      
      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm">This is a debug version without error boundaries or other features.</p>
        <p className="text-sm">Selected date: {selectedDate?.toLocaleDateString()}</p>
      </div>
      
      <CalendarMonthView
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        appointments={[]}
        selectedBarberId="all"
      />
    </div>
  )
}