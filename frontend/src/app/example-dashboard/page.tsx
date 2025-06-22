'use client'

import { useState, useEffect } from 'react'
import { 
  PlusIcon,
  CalendarIcon,
  ChartBarIcon,
  CreditCardIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import DashboardLayout from '@/components/DashboardLayout'

interface User {
  first_name: string
  last_name: string
  email: string
  role: string
}

export default function ExampleDashboardPage() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Demo user for example
    const demoUser = {
      first_name: 'Demo',
      last_name: 'User',
      email: 'demo@6fb.com',
      role: 'admin'
    }
    setUser(demoUser)
  }, [])

  const handleLogout = () => {
    // Handle logout logic
    console.log('Logging out...')
  }

  // Custom actions for the header
  const headerActions = (
    <>
      <button className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 hover:border-white/20 transition-all duration-200">
        Export Data
      </button>
      <button className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-lg shadow-lg transition-all duration-200 flex items-center space-x-2">
        <PlusIcon className="h-4 w-4" />
        <span>New Appointment</span>
      </button>
    </>
  )

  // Breadcrumbs example
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Examples', href: '/examples' },
    { label: 'Dashboard Layout Demo' }
  ]

  return (
    <DashboardLayout
      title="Dashboard Layout Example"
      subtitle="Demonstrating the new dashboard layout component"
      user={user}
      onLogout={handleLogout}
      actions={headerActions}
      breadcrumbs={breadcrumbs}
      className="p-6"
    >
      {/* Page Content */}
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="glass-card-dark p-8 rounded-xl">
          <h2 className="text-2xl font-bold text-white mb-4">
            Welcome to the New Dashboard Layout! 👋
          </h2>
          <p className="text-gray-300 mb-6">
            This demonstrates the new DashboardLayout component that provides:
          </p>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
              <span>Responsive sidebar with collapse functionality</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
              <span>Top header with search, notifications, and custom actions</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
              <span>Breadcrumb navigation support</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
              <span>Mobile-first responsive design</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
              <span>Consistent matte dark theme</span>
            </li>
          </ul>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card-dark p-6 rounded-xl hover:bg-white/10 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-medium text-violet-400 bg-violet-500/20 px-2 py-1 rounded-full">
                +12%
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Appointments</h3>
            <p className="text-3xl font-bold text-white mb-2">24</p>
            <p className="text-sm text-gray-400">Today's bookings</p>
          </div>

          <div className="glass-card-dark p-6 rounded-xl hover:bg-white/10 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
                <CreditCardIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">
                +8%
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Revenue</h3>
            <p className="text-3xl font-bold text-white mb-2">$3,240</p>
            <p className="text-sm text-gray-400">This week</p>
          </div>

          <div className="glass-card-dark p-6 rounded-xl hover:bg-white/10 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-medium text-blue-400 bg-blue-500/20 px-2 py-1 rounded-full">
                Active
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Barbers</h3>
            <p className="text-3xl font-bold text-white mb-2">6</p>
            <p className="text-sm text-gray-400">Team members</p>
          </div>

          <div className="glass-card-dark p-6 rounded-xl hover:bg-white/10 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-medium text-amber-400 bg-amber-500/20 px-2 py-1 rounded-full">
                +15%
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Growth</h3>
            <p className="text-3xl font-bold text-white mb-2">94%</p>
            <p className="text-sm text-gray-400">Client retention</p>
          </div>
        </div>

        {/* Content Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div className="glass-card-dark p-6 rounded-xl">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {[
                { action: 'New appointment booked', time: '2 minutes ago', user: 'John Doe' },
                { action: 'Payment processed', time: '15 minutes ago', user: 'Jane Smith' },
                { action: 'Barber checked in', time: '1 hour ago', user: 'Mike Johnson' },
                { action: 'Review submitted', time: '2 hours ago', user: 'Sarah Wilson' }
              ].map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm text-white">{activity.action}</p>
                    <p className="text-xs text-gray-400">{activity.user} • {activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card-dark p-6 rounded-xl">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Book Appointment', icon: CalendarIcon, color: 'from-violet-500 to-purple-600' },
                { label: 'Add Barber', icon: UserGroupIcon, color: 'from-blue-500 to-indigo-600' },
                { label: 'View Analytics', icon: ChartBarIcon, color: 'from-emerald-500 to-green-600' },
                { label: 'Process Payment', icon: CreditCardIcon, color: 'from-amber-500 to-orange-600' }
              ].map((action, index) => {
                const Icon = action.icon
                return (
                  <button 
                    key={index}
                    className="p-4 rounded-lg hover:bg-white/10 transition-all duration-200 text-left group"
                  >
                    <div className={`p-2 bg-gradient-to-br ${action.color} rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors">
                      {action.label}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Feature Showcase */}
        <div className="glass-card-dark p-8 rounded-xl">
          <h3 className="text-xl font-bold text-white mb-6">Layout Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">📱</span>
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Mobile First</h4>
              <p className="text-sm text-gray-400">
                Fully responsive design that works perfectly on all devices
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Fast & Smooth</h4>
              <p className="text-sm text-gray-400">
                Optimized animations and transitions for a premium feel
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🎨</span>
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Professional</h4>
              <p className="text-sm text-gray-400">
                Consistent matte dark theme with premium glass morphism
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}