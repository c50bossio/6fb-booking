// Calendar accessibility hooks
import { useEffect, useRef, useState } from 'react'

export const useCalendarAccessibility = () => {
  const [announcements, setAnnouncements] = useState<string[]>([])
  const announcementRef = useRef<HTMLDivElement>(null)

  const announce = (message: string) => {
    setAnnouncements(prev => [...prev, message])
    
    // Clear announcement after a delay
    setTimeout(() => {
      setAnnouncements(prev => prev.slice(1))
    }, 3000)
  }

  const focusDate = (dateElement: HTMLElement | null) => {
    if (dateElement) {
      dateElement.focus()
    }
  }

  const getDateAnnouncement = (date: Date, hasAppointments?: boolean) => {
    const dateString = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    
    if (hasAppointments) {
      return `${dateString}, has appointments`
    }
    
    return dateString
  }

  return {
    announce,
    focusDate,
    getDateAnnouncement,
    announcements,
    announcementRef
  }
}