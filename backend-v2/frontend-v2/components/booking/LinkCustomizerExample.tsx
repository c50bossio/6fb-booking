'use client'

import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { ShareBookingModal } from './index'
import { ServiceInfo, BarberInfo } from '@/types/booking-links'

// Example component demonstrating how to use the LinkCustomizer
const LinkCustomizerExample: React.FC = () => {
  const [showShareModal, setShowShareModal] = useState(false)

  // Example services data
  const services: ServiceInfo[] = [
    { id: 1, name: 'Haircut', slug: 'haircut', duration: 30, price: 30, category: 'hair', isActive: true },
    { id: 2, name: 'Shave', slug: 'shave', duration: 20, price: 20, category: 'shave', isActive: true },
    { id: 3, name: 'Haircut & Shave', slug: 'haircut-shave', duration: 45, price: 45, category: 'combo', isActive: true },
    { id: 4, name: 'Beard Trim', slug: 'beard-trim', duration: 15, price: 15, category: 'beard', isActive: true },
  ]

  // Example barbers data
  const barbers: BarberInfo[] = [
    { 
      id: 1, 
      name: 'Marcus Johnson', 
      slug: 'marcus', 
      email: 'marcus@6fb.com', 
      isActive: true, 
      services: [1, 2, 3, 4], 
      timezone: 'America/New_York' 
    },
    { 
      id: 2, 
      name: 'David Smith', 
      slug: 'david', 
      email: 'david@6fb.com', 
      isActive: true, 
      services: [1, 3], 
      timezone: 'America/New_York' 
    },
    { 
      id: 3, 
      name: 'James Wilson', 
      slug: 'james', 
      email: 'james@6fb.com', 
      isActive: true, 
      services: [1, 2, 4], 
      timezone: 'America/New_York' 
    },
  ]

  return (
    <div className="p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-8">Link Customizer Demo</h1>
        
        <div className="text-center">
          <Button
            onClick={() => setShowShareModal(true)}
            variant="primary"
            size="lg"
          >
            Open Share Booking Modal
          </Button>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Features Available:</h2>
          <ul className="space-y-2 text-sm">
            <li>• Set Appointment Parameters - Full configuration</li>
            <li>• Get immediately - Quick link generation</li>
            <li>• Service selection with multiple options</li>
            <li>• Barber/employee filtering</li>
            <li>• Date and time range constraints</li>
            <li>• Advanced booking settings</li>
            <li>• Campaign tracking parameters</li>
            <li>• Real-time URL preview</li>
            <li>• Copy to clipboard functionality</li>
          </ul>
        </div>
      </div>

      <ShareBookingModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        bookingUrl="https://book.6fb.com/demo-business"
        businessName="Demo Barber Shop"
        services={services}
        barbers={barbers}
      />
    </div>
  )
}

export default LinkCustomizerExample