'use client'

import React from 'react'

interface ScreenReaderAnnouncementsProps {
  message?: string
  priority?: 'polite' | 'assertive'
}

export const ScreenReaderAnnouncements: React.FC<ScreenReaderAnnouncementsProps> = ({
  message,
  priority = 'polite'
}) => {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
      aria-relevant="additions text"
    >
      {message}
    </div>
  )
}

// Hook to use in components
export function useAnnouncement() {
  const [announcement, setAnnouncement] = React.useState<{
    message: string
    priority: 'polite' | 'assertive'
  } | null>(null)

  const announce = React.useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement({ message, priority })
    
    // Clear after a delay to allow screen readers to process
    setTimeout(() => {
      setAnnouncement(null)
    }, 1000)
  }, [])

  return {
    announcement,
    announce,
    AnnouncementComponent: () => (
      <ScreenReaderAnnouncements 
        message={announcement?.message} 
        priority={announcement?.priority}
      />
    )
  }
}