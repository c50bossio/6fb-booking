'use client'

import React from 'react'
import { MultiStepRegistration, RegistrationData } from '@/components/registration'

export default function RegistrationDemo() {
  const handleComplete = (data: RegistrationData) => {
    console.log('Registration completed:', data)
    // In a real app, this would:
    // 1. Send data to the backend API
    // 2. Create the user account
    // 3. Start the trial
    // 4. Redirect to dashboard
    alert('Registration completed! Check console for data.')
  }

  const handleCancel = () => {
    console.log('Registration cancelled')
    // In a real app, this would redirect to the home page
    alert('Registration cancelled')
  }

  return (
    <div>
      <MultiStepRegistration
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </div>
  )
}