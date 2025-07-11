'use client'

import React, { useState, useEffect } from 'react'

interface CurrentTimeIndicatorProps {
  startHour: number
  slotDuration: number
}

export const CurrentTimeIndicator = React.memo(function CurrentTimeIndicator({ 
  startHour, 
  slotDuration 
}: CurrentTimeIndicatorProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [])
  
  const top = ((currentTime.getHours() * 60 + currentTime.getMinutes() - startHour * 60) / slotDuration) * 40
  
  return (
    <div
      className="absolute left-0 right-0 h-0.5 bg-red-500 z-10 calendar-today-indicator"
      style={{ top: `${top}px` }}
    >
      <div className="absolute -left-2 -top-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
    </div>
  )
})

CurrentTimeIndicator.displayName = 'CurrentTimeIndicator'