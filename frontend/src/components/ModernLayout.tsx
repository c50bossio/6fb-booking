'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import ModernSidebar from './ModernSidebar'
import {
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon,
  CreditCardIcon,
  PlusIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'

interface LayoutProps {
  children: ReactNode
  requireAuth?: boolean
  showSidebar?: boolean
}

interface User {
  first_name: string
  last_name: string
  email: string
  role: string
}

export default function ModernLayout({
  children,
  requireAuth = true,
  showSidebar = true
}: LayoutProps) {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    if (requireAuth) {
      const token = localStorage.getItem('access_token')
      const userData = localStorage.getItem('user')

      if (!token || !userData) {
        router.push('/login')
        return
      }

      try {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
      } catch (err) {
        console.error('Failed to parse user data:', err)
        router.push('/login')
        return
      }
    }

    setLoading(false)
  }, [router, mounted, requireAuth])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return null
  }

  // Show loading screen while checking auth
  if (loading && requireAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="premium-card-modern p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Layout without sidebar (for login, landing page, etc.)
  if (!showSidebar) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50">
        {children}
      </div>
    )
  }

  // Main dashboard layout with sidebar
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <ModernSidebar user={user} onLogout={handleLogout} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {getPageTitle(pathname)}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {getPageDescription(pathname)}
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* Quick Actions */}
              <div className="hidden md:flex items-center space-x-2 relative">
                <div className="relative">
                  <button
                    onClick={() => setShowQuickActions(!showQuickActions)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center space-x-2"
                  >
                    <span>Quick Actions</span>
                    <ChevronDownIcon className="h-4 w-4" />
                  </button>

                  {/* Quick Actions Dropdown */}
                  {showQuickActions && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowQuickActions(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              router.push('/dashboard/appointments')
                              setShowQuickActions(false)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <CalendarIcon className="h-4 w-4" />
                            <span>View Appointments</span>
                          </button>
                          <button
                            onClick={() => {
                              router.push('/barbers')
                              setShowQuickActions(false)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <UserGroupIcon className="h-4 w-4" />
                            <span>Manage Barbers</span>
                          </button>
                          <button
                            onClick={() => {
                              router.push('/analytics')
                              setShowQuickActions(false)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <ChartBarIcon className="h-4 w-4" />
                            <span>View Analytics</span>
                          </button>
                          <button
                            onClick={() => {
                              router.push('/payments')
                              setShowQuickActions(false)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <CreditCardIcon className="h-4 w-4" />
                            <span>Payment Center</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => router.push('/dashboard/appointments/new')}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all flex items-center space-x-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>New Appointment</span>
                </button>
              </div>

              {/* Current Time */}
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date().toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 bg-gradient-to-br from-slate-50 to-gray-100/50">
          {children}
        </main>
      </div>
    </div>
  )
}

// Helper functions to get page title and description based on current route
function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/appointments': 'Appointments',
    '/dashboard/appointments': 'Appointments',
    '/dashboard/calendar': 'Calendar',
    '/barbers': 'Barber Management',
    '/analytics': 'Analytics & Insights',
    '/payments': 'Payment Center',
    '/payouts': 'Payout Management',
    '/barber-payments': 'Payout Management',
    '/clients': 'Client Management',
    '/notifications': 'Notifications',
    '/communications': 'Communications',
    '/locations': 'Location Management',
    '/settings': 'Settings'
  }

  return titles[pathname] || 'Dashboard'
}

function getPageDescription(pathname: string): string {
  const descriptions: Record<string, string> = {
    '/dashboard': 'Overview of your barbershop operations and key metrics',
    '/appointments': 'Manage appointments and schedule',
    '/dashboard/appointments': 'Manage appointments and schedule',
    '/dashboard/calendar': 'View and manage your calendar appointments',
    '/barbers': 'Manage your team members and their payment accounts',
    '/analytics': 'Performance insights and business analytics',
    '/payments': 'Process payments and view transaction history',
    '/payouts': 'Manage revenue splits and automated payouts',
    '/barber-payments': 'Manage revenue splits and automated payouts',
    '/clients': 'Client database and relationship management',
    '/notifications': 'System notifications and alerts',
    '/communications': 'Messages, notifications, and client communication',
    '/locations': 'Manage multiple shop locations and settings',
    '/settings': 'System configuration and preferences'
  }

  return descriptions[pathname] || 'Manage your barbershop business efficiently'
}
