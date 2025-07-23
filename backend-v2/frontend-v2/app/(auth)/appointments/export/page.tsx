'use client'

import React from 'react'
import { InfoIcon } from 'lucide-react'

// Temporarily simplified for staging deployment
export default function AppointmentsExportPage() {
  return (
    <div className="p-6">
      <div className="text-center">
        <InfoIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Appointments Export
        </h1>
        <p className="text-gray-600">
          Export functionality is currently being updated. Please check back soon.
        </p>
      </div>
    </div>
  )
}

// Original implementation temporarily disabled for staging deployment
// Will be restored after resolving component import issues