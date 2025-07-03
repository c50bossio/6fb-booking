'use client'

import React from 'react'
import { Shield } from 'lucide-react'
import PrivacyDashboard from '@/components/PrivacyDashboard'

const PrivacySettingsPage = () => {
  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Privacy & Data Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your privacy preferences, cookie settings, and data rights.
        </p>
      </div>

      <PrivacyDashboard />
    </div>
  )
}

export default PrivacySettingsPage