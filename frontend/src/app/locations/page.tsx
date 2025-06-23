'use client'

import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import {
  BuildingLibraryIcon,
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

interface Location {
  id: string
  name: string
  address: string
  phone: string
  hours: string
  status: 'active' | 'inactive'
  barbersCount: number
}

const mockLocations: Location[] = [
  {
    id: '1',
    name: 'Downtown Barbershop',
    address: '123 Main St, Downtown, NY 10001',
    phone: '(555) 123-4567',
    hours: 'Mon-Sat: 9AM-8PM, Sun: 10AM-6PM',
    status: 'active',
    barbersCount: 5
  },
  {
    id: '2',
    name: 'Uptown Cuts',
    address: '456 Broadway Ave, Uptown, NY 10002',
    phone: '(555) 987-6543',
    hours: 'Mon-Fri: 8AM-9PM, Sat-Sun: 9AM-7PM',
    status: 'active',
    barbersCount: 3
  },
  {
    id: '3',
    name: 'Westside Barber Co.',
    address: '789 West End Ave, Westside, NY 10003',
    phone: '(555) 456-7890',
    hours: 'Tue-Sat: 10AM-7PM, Sun-Mon: Closed',
    status: 'inactive',
    barbersCount: 2
  }
]

export default function LocationsPage() {
  const { theme } = useTheme()
  const [locations, setLocations] = useState(mockLocations)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)

  const handleEditLocation = (locationId: string) => {
    setSelectedLocation(locationId)
    // TODO: Open edit modal
  }

  const handleDeleteLocation = (locationId: string) => {
    setLocations(locations.filter(location => location.id !== locationId))
  }

  const handleAddLocation = () => {
    // TODO: Open add location modal
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
              <BuildingLibraryIcon className={`h-6 w-6 ${theme === 'dark' ? 'text-teal-400' : 'text-teal-600'}`} />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Locations
              </h1>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage your barbershop locations
              </p>
            </div>
          </div>

          <button
            onClick={handleAddLocation}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-teal-600 hover:bg-teal-700 text-white'
                : 'bg-teal-600 hover:bg-teal-700 text-white'
            }`}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Location
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Locations
                </p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {locations.length}
                </p>
              </div>
              <BuildingLibraryIcon className={`h-8 w-8 ${theme === 'dark' ? 'text-teal-400' : 'text-teal-600'}`} />
            </div>
          </div>

          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Active Locations
                </p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {locations.filter(l => l.status === 'active').length}
                </p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </div>

          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Barbers
                </p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {locations.reduce((sum, location) => sum + location.barbersCount, 0)}
                </p>
              </div>
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Locations List */}
        <div className={`rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
          <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              All Locations
            </h2>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {locations.map((location) => (
              <div
                key={location.id}
                className={`p-6 hover:bg-opacity-50 transition-colors ${
                  theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {location.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        location.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {location.status}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1">
                      <div className="flex items-center space-x-2">
                        <MapPinIcon className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {location.address}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <PhoneIcon className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {location.phone}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <ClockIcon className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {location.hours}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {location.barbersCount} barbers
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleEditLocation(location.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === 'dark'
                          ? 'text-gray-400 hover:text-white hover:bg-slate-700'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteLocation(location.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === 'dark'
                          ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                          : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                      }`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
