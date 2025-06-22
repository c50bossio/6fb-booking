'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import ModernSidebar from '@/components/ModernSidebar'
import { useNavigation } from '@/components/NavigationProvider'

interface AppLayoutProps {
  children: ReactNode
}

// Routes that should not show the sidebar
const noSidebarRoutes = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth',
  '/oauth',
  '/demo'
]

// Routes that don't require authentication
const publicRoutes = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/',
  '/demo'
]

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const { user, logout, isLoading } = useAuth()
  const { isCollapsed } = useNavigation()

  // Check if current route should show sidebar
  const shouldShowSidebar = !noSidebarRoutes.some(route =>
    pathname.startsWith(route)
  )

  // Check if current route requires authentication
  const requiresAuth = !publicRoutes.some(route =>
    pathname === route || pathname.startsWith(route)
  )

  // Show loading screen while checking authentication
  if (isLoading && requiresAuth) {
    return (
      <div className="auth-loading dark">
        <div className="premium-card-dark p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  // If authentication is required but user is not logged in, the AuthProvider will handle redirect
  if (requiresAuth && !user && !isLoading) {
    return (
      <div className="auth-loading dark">
        <div className="premium-card-dark p-8 text-center">
          <p className="text-gray-300">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // Layout without sidebar (for public pages like login)
  if (!shouldShowSidebar) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-violet-900">
        {children}
      </div>
    )
  }

  // Main dashboard layout with sidebar
  return (
    <div className="min-h-screen bg-slate-900 layout-transition flex">
      {/* Fixed Sidebar */}
      <ModernSidebar user={user} onLogout={logout} />

      {/* Main Content Area */}
      <div className="min-h-screen flex flex-col flex-1 page-content">
        {/* Top Header Bar */}
        <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {getPageTitle(pathname)}
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                {getPageDescription(pathname)}
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* Quick Actions */}
              <div className="hidden md:flex items-center space-x-2">
                <button className="px-4 py-2 text-sm font-medium text-gray-300 bg-slate-700/50 rounded-lg border border-slate-600/50 hover:bg-slate-600/50 transition-colors">
                  Quick Actions
                </button>
                <button className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all transform hover:-translate-y-0.5">
                  New Appointment
                </button>
              </div>

              {/* Current Time */}
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-xs text-gray-400">
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
        <main className="flex-1 p-6 bg-gradient-to-br from-slate-900 to-slate-800/50 overflow-y-auto">
          <div className="max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

// Helper functions to get page title and description based on current route
function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/dashboard/appointments': 'Appointments',
    '/dashboard/calendar': 'Calendar',
    '/barbers': 'Barber Management',
    '/analytics': 'Analytics & Insights',
    '/payments': 'Payment Center',
    '/barber-payments': 'Payout Management',
    '/clients': 'Client Management',
    '/communications': 'Communications',
    '/locations': 'Location Management',
    '/settings': 'Settings'
  }

  return titles[pathname] || 'Dashboard'
}

function getPageDescription(pathname: string): string {
  const descriptions: Record<string, string> = {
    '/dashboard': 'Overview of your barbershop operations and key metrics',
    '/dashboard/appointments': 'Manage appointments and schedule',
    '/dashboard/calendar': 'View and manage your calendar appointments',
    '/barbers': 'Manage your team members and their payment accounts',
    '/analytics': 'Performance insights and business analytics',
    '/payments': 'Process payments and view transaction history',
    '/barber-payments': 'Manage revenue splits and automated payouts',
    '/clients': 'Client database and relationship management',
    '/communications': 'Messages, notifications, and client communication',
    '/locations': 'Manage multiple shop locations and settings',
    '/settings': 'System configuration and preferences'
  }

  return descriptions[pathname] || 'Manage your barbershop business efficiently'
}
