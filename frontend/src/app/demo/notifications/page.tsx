'use client'

import { NotificationDemo } from '@/components/demo/NotificationDemo'

export default function NotificationDemoPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Real-Time Notifications</h1>
          <p className="text-gray-600 mt-2">
            Experience the power of WebSocket-based real-time notifications in the 6FB Platform
          </p>
        </div>
        
        <NotificationDemo />
      </div>
    </div>
  )
}