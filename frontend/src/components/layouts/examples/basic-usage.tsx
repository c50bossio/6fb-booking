/**
 * Basic Usage Examples for Layout Components
 *
 * This file demonstrates how to use the ConditionalLayout and DashboardLayout components
 * in various scenarios within the 6FB Booking application.
 */

'use client'

import React from 'react'
import { ConditionalLayout, DashboardLayout, useLayoutContext } from '../index'

// Example 1: Basic ConditionalLayout usage
export function BasicConditionalLayoutExample() {
  const user = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    role: 'admin'
  }

  const handleLogout = () => {
    console.log('Logging out...')
    // Implement logout logic
  }

  return (
    <ConditionalLayout
      user={user}
      onLogout={handleLogout}
      title="Six FB Booking"
      subtitle="Professional Barbershop Platform"
    >
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Welcome to Six FB Booking</h1>
        <p className="text-gray-600">
          This content will automatically be wrapped in the appropriate layout
          based on the current route.
        </p>
      </div>
    </ConditionalLayout>
  )
}

// Example 2: Dashboard-specific layout
export function DashboardLayoutExample() {
  const user = {
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@sixfb.com',
    role: 'manager'
  }

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Analytics', href: '/analytics' },
    { label: 'Revenue Report' }
  ]

  const handleSearch = (query: string) => {
    console.log('Searching for:', query)
    // Implement search logic
  }

  const handleNotification = () => {
    console.log('Notification clicked')
    // Implement notification logic
  }

  const customActions = (
    <div className="flex space-x-2">
      <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
        Export Report
      </button>
      <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
        Refresh Data
      </button>
    </div>
  )

  return (
    <DashboardLayout
      user={user}
      title="Revenue Analytics"
      subtitle="Monthly performance overview"
      breadcrumbs={breadcrumbs}
      actions={customActions}
      onSearch={handleSearch}
      onNotificationClick={handleNotification}
      searchPlaceholder="Search reports, clients, appointments..."
    >
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Total Revenue</h3>
            <p className="text-3xl font-bold text-teal-600">$12,540</p>
            <p className="text-sm text-gray-500">+12% from last month</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Appointments</h3>
            <p className="text-3xl font-bold text-blue-600">156</p>
            <p className="text-sm text-gray-500">+8% from last month</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">New Clients</h3>
            <p className="text-3xl font-bold text-green-600">23</p>
            <p className="text-sm text-gray-500">+15% from last month</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
          <div className="h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
            <p className="text-gray-500">Chart placeholder - integrate with your charting library</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

// Example 3: Using the layout context hook
export function LayoutAwareComponent() {
  const { isDashboard, isPublic, routeType, shouldShowSidebar } = useLayoutContext()

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="font-semibold mb-2">Layout Information</h3>
      <ul className="space-y-1 text-sm">
        <li>Route Type: <span className="font-mono">{routeType}</span></li>
        <li>Is Dashboard: <span className="font-mono">{isDashboard ? 'Yes' : 'No'}</span></li>
        <li>Is Public: <span className="font-mono">{isPublic ? 'Yes' : 'No'}</span></li>
        <li>Show Sidebar: <span className="font-mono">{shouldShowSidebar ? 'Yes' : 'No'}</span></li>
      </ul>
    </div>
  )
}

// Example 4: Conditional layout with custom dashboard props
export function CustomDashboardPropsExample() {
  return (
    <ConditionalLayout
      title="Custom Dashboard"
      dashboardLayoutProps={{
        title: "Override Dashboard Title",
        subtitle: "This title overrides the parent title for dashboard routes",
        showSearch: false,
        showNotifications: true,
        className: "custom-dashboard-content"
      }}
    >
      <div className="p-6">
        <LayoutAwareComponent />
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Dashboard Content</h2>
          <p className="text-gray-600">
            This content appears with custom dashboard layout settings
            when on a dashboard route, or with standard public layout
            when on a public route.
          </p>
        </div>
      </div>
    </ConditionalLayout>
  )
}

// Example 5: HOC usage
const SimplePageComponent = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Simple Page</h1>
    <p className="text-gray-600">
      This page is automatically wrapped with ConditionalLayout using the HOC.
    </p>
    <LayoutAwareComponent />
  </div>
)

export const HOCWrappedPage = withConditionalLayout(SimplePageComponent, {
  title: 'HOC Example',
  subtitle: 'Page wrapped with higher-order component'
})

// Example 6: Error handling demonstration
export function ErrorHandlingExample() {
  const [shouldError, setShouldError] = React.useState(false)

  if (shouldError) {
    throw new Error('Intentional error for testing error boundary')
  }

  return (
    <ConditionalLayout title="Error Handling Demo">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Error Handling Example</h1>
        <p className="text-gray-600 mb-4">
          The ConditionalLayout includes error boundaries to gracefully handle errors.
        </p>
        <button
          onClick={() => setShouldError(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Trigger Error (Test Error Boundary)
        </button>
      </div>
    </ConditionalLayout>
  )
}

// Example 7: Mobile responsive example
export function MobileResponsiveExample() {
  return (
    <ConditionalLayout
      title="Mobile Responsive Demo"
      subtitle="Test mobile responsiveness"
    >
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Mobile Responsive Layout</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold">Mobile First</h3>
            <p className="text-sm text-gray-600">
              Layout adapts to screen size
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold">Touch Optimized</h3>
            <p className="text-sm text-gray-600">
              Mobile-friendly interactions
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold">Responsive Sidebar</h3>
            <p className="text-sm text-gray-600">
              Collapsible on mobile devices
            </p>
          </div>
        </div>
      </div>
    </ConditionalLayout>
  )
}

// Export all examples for easy access
export const Examples = {
  BasicConditionalLayoutExample,
  DashboardLayoutExample,
  LayoutAwareComponent,
  CustomDashboardPropsExample,
  HOCWrappedPage,
  ErrorHandlingExample,
  MobileResponsiveExample
}
