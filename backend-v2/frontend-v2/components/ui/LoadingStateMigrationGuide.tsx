/**
 * Loading State Migration Guide
 * Practical examples for upgrading from generic loading states to Six Figure Barber branded components
 */

'use client'

import React from 'react'

// ==================================
// MIGRATION EXAMPLES
// ==================================
// This file provides practical migration examples showing how to upgrade
// existing loading states to premium Six Figure Barber branded components

// Import both old and new components for comparison
import { LoadingSpinner, LoadingSkeleton, LoadingButton } from '../LoadingStates'
import { 
  BrandedSpinner, 
  BrandedSkeleton,
  BrandedLoadingButton,
  SixFigureAvatarSkeleton,
  BarberProfileSkeleton,
  ServiceCardSkeleton,
  AppointmentCardSkeleton,
  AnalyticsCardSkeleton,
  DashboardStatsSkeleton,
  SixFigureCalendarSkeleton,
  PremiumLoadingOverlay
} from '../LoadingStates'

// ==================================
// MIGRATION PATTERNS
// ==================================

// 1. BASIC SPINNER MIGRATION
// OLD: Generic spinner
export const OldSpinnerExample = () => (
  <div className="p-4">
    <LoadingSpinner size="lg" variant="primary" label="Loading..." />
  </div>
)

// NEW: Six Figure Barber branded spinner
export const NewSpinnerExample = () => (
  <div className="p-4">
    <BrandedSpinner variant="premium" size="lg" label="Loading your Six Figure experience..." showLabel />
  </div>
)

// 2. BUTTON LOADING MIGRATION
// OLD: Basic loading button
export const OldButtonExample = ({ onClick }: { onClick: () => void }) => (
  <LoadingButton
    loading={false}
    onClick={onClick}
    className="bg-blue-500 text-white px-4 py-2 rounded"
  >
    Book Appointment
  </LoadingButton>
)

// NEW: Premium branded loading button
export const NewButtonExample = ({ onClick }: { onClick: () => void }) => (
  <BrandedLoadingButton
    loading={false}
    onClick={onClick}
    variant="premium"
    size="md"
  >
    Book Your Six Figure Session
  </BrandedLoadingButton>
)

// 3. SKELETON COMPONENT MIGRATION
// OLD: Generic skeleton
export const OldSkeletonExample = () => (
  <div className="space-y-4">
    <LoadingSkeleton className="h-4 w-32" />
    <LoadingSkeleton className="h-8 w-48" />
    <LoadingSkeleton className="h-4 w-24" />
  </div>
)

// NEW: Branded skeleton with premium styling
export const NewSkeletonExample = () => (
  <div className="space-y-4">
    <BrandedSkeleton variant="premium" className="h-4 w-32" />
    <BrandedSkeleton variant="luxury" className="h-8 w-48" />
    <BrandedSkeleton variant="executive" className="h-4 w-24" />
  </div>
)

// 4. BARBER PROFILE MIGRATION
// OLD: Manual skeleton composition
export const OldBarberProfileExample = () => (
  <div className="p-4 border rounded-lg space-y-4">
    <div className="flex items-center space-x-4">
      <LoadingSkeleton className="w-16 h-16 rounded-full" />
      <div className="space-y-2">
        <LoadingSkeleton className="h-6 w-32" />
        <LoadingSkeleton className="h-4 w-24" />
      </div>
    </div>
    <LoadingSkeleton className="h-4 w-full" />
    <LoadingSkeleton className="h-4 w-3/4" />
    <LoadingSkeleton className="h-10 w-full rounded" />
  </div>
)

// NEW: Specialized Six Figure Barber profile skeleton
export const NewBarberProfileExample = () => (
  <BarberProfileSkeleton variant="premium" />
)

// 5. SERVICE CARD MIGRATION
// OLD: Generic card skeleton
export const OldServiceCardExample = () => (
  <div className="p-4 border rounded-lg space-y-3">
    <div className="flex justify-between items-start">
      <LoadingSkeleton className="h-6 w-40" />
      <LoadingSkeleton className="w-8 h-8 rounded" />
    </div>
    <div className="flex justify-between">
      <LoadingSkeleton className="h-8 w-20" />
      <LoadingSkeleton className="h-5 w-16" />
    </div>
    <LoadingSkeleton className="h-4 w-full" />
    <LoadingSkeleton className="h-10 w-full rounded" />
  </div>
)

// NEW: Premium service card with luxury styling
export const NewServiceCardExample = () => (
  <ServiceCardSkeleton variant="luxury" />
)

// 6. APPOINTMENT CARD MIGRATION
// OLD: Basic appointment placeholder
export const OldAppointmentExample = () => (
  <div className="p-2 bg-gray-100 rounded border space-y-1">
    <LoadingSkeleton className="h-3 w-16" />
    <LoadingSkeleton className="h-2 w-12" />
  </div>
)

// NEW: Premium appointment card with view-specific styling
export const NewAppointmentExample = () => (
  <AppointmentCardSkeleton variant="premium" viewType="week" />
)

// 7. ANALYTICS DASHBOARD MIGRATION
// OLD: Manual dashboard composition
export const OldDashboardExample = () => (
  <div className="grid grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="p-4 border rounded space-y-3">
        <div className="flex justify-between">
          <LoadingSkeleton className="h-4 w-24" />
          <LoadingSkeleton className="w-6 h-6" />
        </div>
        <LoadingSkeleton className="h-8 w-16" />
        <LoadingSkeleton className="h-3 w-20" />
      </div>
    ))}
  </div>
)

// NEW: Six Figure Barber analytics with sophisticated styling
export const NewDashboardExample = () => (
  <DashboardStatsSkeleton variant="executive" columns={3} />
)

// 8. FULL PAGE LOADING MIGRATION
// OLD: Basic page loader
export const OldPageLoadingExample = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-white">
    <div className="text-center">
      <LoadingSpinner size="xl" />
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
)

// NEW: Premium Six Figure Barber loading experience
export const NewPageLoadingExample = () => (
  <PremiumLoadingOverlay
    variant="premium"
    message="Preparing your Six Figure Barber experience..."
    showLogo={true}
  />
)

// 9. CALENDAR MIGRATION
// OLD: Basic calendar skeleton
export const OldCalendarExample = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center p-4 bg-gray-50 rounded">
      <LoadingSkeleton className="h-6 w-32" />
      <div className="flex space-x-2">
        <LoadingSkeleton className="w-8 h-8" />
        <LoadingSkeleton className="w-8 h-8" />
      </div>
    </div>
    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: 35 }).map((_, i) => (
        <LoadingSkeleton key={i} className="aspect-square" />
      ))}
    </div>
  </div>
)

// NEW: Premium Six Figure calendar with branded styling
export const NewCalendarExample = () => (
  <SixFigureCalendarSkeleton view="week" />
)

// ==================================
// QUICK MIGRATION REFERENCE
// ==================================

export const MigrationReference = () => (
  <div className="p-6 bg-gray-50 rounded-lg">
    <h3 className="text-lg font-semibold mb-4">Quick Migration Reference</h3>
    
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-red-600">❌ OLD (Generic)</h4>
          <code className="text-xs bg-white p-2 rounded block mt-1">
            {`<LoadingSpinner size="md" />`}
          </code>
        </div>
        <div>
          <h4 className="font-medium text-green-600">✅ NEW (Branded)</h4>
          <code className="text-xs bg-white p-2 rounded block mt-1">
            {`<BrandedSpinner variant="premium" size="md" />`}
          </code>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-red-600">❌ OLD</h4>
          <code className="text-xs bg-white p-2 rounded block mt-1">
            {`<LoadingSkeleton className="h-16 w-16 rounded-full" />`}
          </code>
        </div>
        <div>
          <h4 className="font-medium text-green-600">✅ NEW</h4>
          <code className="text-xs bg-white p-2 rounded block mt-1">
            {`<SixFigureAvatarSkeleton size="lg" variant="premium" />`}
          </code>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-red-600">❌ OLD</h4>
          <code className="text-xs bg-white p-2 rounded block mt-1">
            {`<LoadingButton loading={isLoading}>Submit</LoadingButton>`}
          </code>
        </div>
        <div>
          <h4 className="font-medium text-green-600">✅ NEW</h4>
          <code className="text-xs bg-white p-2 rounded block mt-1">
            {`<BrandedLoadingButton loading={isLoading} variant="premium">Submit</BrandedLoadingButton>`}
          </code>
        </div>
      </div>
    </div>

    <div className="mt-6 p-4 bg-primary-50 border border-primary-200 rounded">
      <h4 className="font-medium text-primary-800 mb-2">💡 Pro Tips</h4>
      <ul className="text-sm text-primary-700 space-y-1">
        <li>• Use `variant="premium"` for primary brand elements</li>
        <li>• Use `variant="luxury"` for high-value services and premium features</li>
        <li>• Use `variant="executive"` for professional dashboard components</li>
        <li>• Use specialized components (BarberProfileSkeleton, ServiceCardSkeleton) for better UX</li>
        <li>• Replace full-page loaders with PremiumLoadingOverlay for branded experience</li>
      </ul>
    </div>
  </div>
)

export default MigrationReference