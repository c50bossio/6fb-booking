'use client'

import React, { useState } from 'react'
import { 
  HierarchicalBreadcrumb, 
  EnterpriseBreadcrumb,
  LocationSelector,
  CompactLocationSelector,
  type Location 
} from './index'

// Example usage component showing how to integrate the navigation components
export function NavigationExample() {
  // Sample data
  const sampleLocations: Location[] = [
    {
      id: '1',
      name: 'Downtown Barbershop',
      address: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      phoneNumber: '(212) 555-0100',
      email: 'downtown@sixfb.com',
      isActive: true,
      stats: {
        activeBarbers: 8,
        todayBookings: 45,
        weekRevenue: 12500,
        occupancyRate: 85
      },
      enterpriseId: 'ent-1',
      enterpriseName: 'Six Figure Barber NYC'
    },
    {
      id: '2',
      name: 'Midtown Location',
      address: '456 Park Avenue',
      city: 'New York',
      state: 'NY',
      zipCode: '10022',
      phoneNumber: '(212) 555-0200',
      email: 'midtown@sixfb.com',
      isActive: true,
      stats: {
        activeBarbers: 6,
        todayBookings: 38,
        weekRevenue: 9800,
        occupancyRate: 75
      },
      enterpriseId: 'ent-1',
      enterpriseName: 'Six Figure Barber NYC'
    },
    {
      id: '3',
      name: 'Brooklyn Shop',
      address: '789 Atlantic Ave',
      city: 'Brooklyn',
      state: 'NY',
      zipCode: '11201',
      phoneNumber: '(718) 555-0300',
      email: 'brooklyn@sixfb.com',
      isActive: true,
      stats: {
        activeBarbers: 5,
        todayBookings: 28,
        weekRevenue: 7200,
        occupancyRate: 65
      },
      enterpriseId: 'ent-1',
      enterpriseName: 'Six Figure Barber NYC'
    },
    {
      id: '4',
      name: 'LA Premium Cuts',
      address: '321 Sunset Blvd',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90028',
      phoneNumber: '(323) 555-0400',
      email: 'la@sixfb.com',
      isActive: true,
      stats: {
        activeBarbers: 10,
        todayBookings: 52,
        weekRevenue: 15000,
        occupancyRate: 90
      },
      enterpriseId: 'ent-2',
      enterpriseName: 'Six Figure Barber West Coast'
    },
    {
      id: '5',
      name: 'Miami Beach Location',
      address: '555 Ocean Drive',
      city: 'Miami Beach',
      state: 'FL',
      zipCode: '33139',
      phoneNumber: '(305) 555-0500',
      email: 'miami@sixfb.com',
      isActive: false,
      stats: {
        activeBarbers: 0,
        todayBookings: 0,
        weekRevenue: 0,
        occupancyRate: 0
      }
    }
  ]

  const [selectedLocation, setSelectedLocation] = useState<Location>(sampleLocations[0])

  return (
    <div className="space-y-8 p-6">
      {/* Example 1: Basic Breadcrumb */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Basic Breadcrumb Navigation
        </h3>
        <HierarchicalBreadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Locations', href: '/dashboard/locations' },
            { label: 'Downtown Barbershop', href: '/dashboard/locations/1' },
            { label: 'Analytics' }
          ]}
        />
      </div>

      {/* Example 2: Enterprise Breadcrumb */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Enterprise Hierarchy Breadcrumb
        </h3>
        <EnterpriseBreadcrumb
          enterprise={{ id: 'ent-1', name: 'Six Figure Barber NYC' }}
          location={{ id: '1', name: 'Downtown Barbershop' }}
          barber={{ id: 'barber-1', name: 'John Smith' }}
          currentPage="Schedule"
        />
      </div>

      {/* Example 3: Location Selector with Stats */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Location Selector with Statistics
        </h3>
        <div className="max-w-md">
          <LocationSelector
            locations={sampleLocations}
            currentLocationId={selectedLocation.id}
            onLocationChange={setSelectedLocation}
            groupByEnterprise={true}
          />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Selected: {selectedLocation.name} ({selectedLocation.city}, {selectedLocation.state})
        </p>
      </div>

      {/* Example 4: Compact Location Selector */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Compact Location Selector (for headers)
        </h3>
        <div className="max-w-xs">
          <CompactLocationSelector
            locations={sampleLocations}
            currentLocationId={selectedLocation.id}
            onLocationChange={setSelectedLocation}
            searchable={false}
          />
        </div>
      </div>

      {/* Example 5: Integration Example - Header with Navigation */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Integrated Header Example
        </h3>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <EnterpriseBreadcrumb
                enterprise={{ id: 'ent-1', name: 'Six Figure Barber NYC' }}
                location={{ id: selectedLocation.id, name: selectedLocation.name }}
                currentPage="Dashboard"
              />
            </div>
            <div className="ml-4">
              <CompactLocationSelector
                locations={sampleLocations}
                currentLocationId={selectedLocation.id}
                onLocationChange={setSelectedLocation}
              />
            </div>
          </div>
          <div className="text-gray-600 dark:text-gray-400 text-sm">
            This shows how the breadcrumb and location selector can work together in a header
          </div>
        </div>
      </div>
    </div>
  )
}