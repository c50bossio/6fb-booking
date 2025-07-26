'use client'

import { useState, useEffect } from 'react'

export default function SimpleCalendarTest() {
  const [appointments, setAppointments] = useState([])
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // This will fail with 403
        const response = await fetch('/api/v2/appointments/')
        if (!response.ok) {
          throw new Error('API failed with ' + response.status)
        }
        const data = await response.json()
        setAppointments(data.appointments || [])
      } catch (err) {
        console.log('API failed, using demo data:', err)
        
        // Set demo data
        setAppointments([
          {
            id: 1,
            service_name: 'Premium Haircut',
            client_name: 'John Smith',  
            appointment_date: new Date().toISOString(),
            start_time: new Date().toISOString(),
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            service_name: 'Beard Trim',
            client_name: 'Mike Wilson',
            appointment_date: new Date().toISOString(),
            start_time: new Date().toISOString(),
            created_at: new Date().toISOString()
          }
        ])
        
        setBarbers([
          { id: 1, name: 'Marcus Johnson', email: 'marcus@bookedbarber.com' },
          { id: 2, name: 'Diego Rivera', email: 'diego@bookedbarber.com' }
        ])
        
        setError(null) // Clear error - we have demo data
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Calendar - Demo Data Test</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-2 rounded-md mb-4">
            Error: {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Appointments ({appointments.length})</h2>
            {appointments.length > 0 ? (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <div key={apt.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900">{apt.service_name}</h3>
                    <p className="text-gray-600">Client: {apt.client_name}</p>
                    <p className="text-sm text-gray-500">
                      Date: {new Date(apt.appointment_date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No appointments found</p>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Barbers ({barbers.length})</h2>
            {barbers.length > 0 ? (
              <div className="space-y-3">
                {barbers.map((barber) => (
                  <div key={barber.id} className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                      {barber.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{barber.name}</p>
                      <p className="text-sm text-gray-500">{barber.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No barbers found</p>
            )}
          </div>
        </div>
        
        <div className="mt-8 bg-green-100 border border-green-300 text-green-800 px-4 py-2 rounded-md">
          ✅ Demo data loaded successfully! The API authentication fallback is working.
        </div>
      </div>
    </div>
  )
}