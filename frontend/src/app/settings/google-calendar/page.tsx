'use client'

import React from 'react'
import GoogleCalendarSettings from '@/components/settings/GoogleCalendarSettings'

export default function GoogleCalendarSettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Google Calendar Integration
        </h1>
        <GoogleCalendarSettings />
      </div>
    </div>
  )
}
