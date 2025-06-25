'use client'

import React, { useState } from 'react'

// Simple demo appointments
const demoAppointments = [
  {
    id: '1',
    title: 'Premium Haircut',
    client: 'John Smith',
    time: '9:00 AM - 10:00 AM',
    status: 'confirmed'
  },
  {
    id: '2',
    title: 'Beard Trim',
    client: 'Mike Johnson',
    time: '10:30 AM - 11:00 AM',
    status: 'pending'
  },
  {
    id: '3',
    title: 'Hair & Beard',
    client: 'David Lee',
    time: '2:00 PM - 3:00 PM',
    status: 'confirmed'
  }
]

export default function SimpleCalendarDemo() {
  const [appointments] = useState(demoAppointments)
  const [draggedItem, setDraggedItem] = useState(null)

  const handleDragStart = (e, appointment) => {
    setDraggedItem(appointment)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    if (draggedItem) {
      console.log('Dropped:', draggedItem)
      // In real app, this would update the appointment time
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Simple Calendar Demo</h1>
          <p className="text-gray-400">
            Drag and drop appointments to see the functionality
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Appointments List */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Today\'s Appointments</h2>
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, appointment)}
                  onDragEnd={handleDragEnd}
                  className={`
                    bg-gray-800 p-4 rounded-lg border border-gray-700 cursor-grab
                    hover:border-violet-500 transition-all duration-200
                    ${draggedItem?.id === appointment.id ? 'opacity-50' : ''}
                  `}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-white">{appointment.title}</h3>
                    <span className={`
                      px-2 py-1 text-xs rounded
                      ${appointment.status === 'confirmed' 
                        ? 'bg-green-900 text-green-300' 
                        : 'bg-yellow-900 text-yellow-300'}
                    `}>
                      {appointment.status}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">{appointment.client}</p>
                  <p className="text-gray-500 text-sm">{appointment.time}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Drop Zone */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Drop Zone</h2>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg p-8 min-h-[400px] flex items-center justify-center"
            >
              <p className="text-gray-500 text-center">
                {draggedItem 
                  ? `Drop ${draggedItem.title} here`
                  : 'Drag appointments here to reschedule'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">Demo Features</h3>
          <ul className="space-y-2 text-gray-300">
            <li>✅ Basic drag and drop functionality</li>
            <li>✅ Visual feedback during drag</li>
            <li>✅ No authentication required</li>
            <li>✅ Works without backend connection</li>
          </ul>
          
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              This is a simplified demo. The full calendar demo at{' '}
              <a href="/enhanced-calendar-demo" className="text-violet-400 hover:text-violet-300">
                /enhanced-calendar-demo
              </a>{' '}
              includes advanced features like smart scheduling and conflict detection.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}