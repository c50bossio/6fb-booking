'use client'

import { useState } from 'react'
import {
  PayoutScheduleConfig,
  PayoutAnalyticsDashboard,
  PayoutStatusTracker,
  ManualPayoutTrigger,
  PayoutNotificationSettings,
  PayoutCalendarView,
  BarberPayoutDashboard
} from '@/components/payouts'
import {
  BanknotesIcon,
  ChartBarIcon,
  ArrowPathIcon,
  CogIcon,
  BellIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline'

type TabType = 'overview' | 'schedule' | 'status' | 'manual' | 'notifications' | 'calendar' | 'barber'

export default function PayoutManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [isBarberView, setIsBarberView] = useState(false)

  const tabs = [
    { id: 'overview', name: 'Analytics', icon: ChartBarIcon },
    { id: 'status', name: 'Live Status', icon: ArrowPathIcon },
    { id: 'manual', name: 'Manual Trigger', icon: BanknotesIcon },
    { id: 'schedule', name: 'Schedule', icon: CogIcon },
    { id: 'calendar', name: 'Calendar', icon: CalendarIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'barber', name: 'Barber View', icon: UserIcon }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Payout Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center cursor-pointer">
                <span className="mr-2 text-sm text-gray-600">Admin View</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isBarberView}
                    onChange={(e) => {
                      setIsBarberView(e.target.checked)
                      setActiveTab(e.target.checked ? 'barber' : 'overview')
                    }}
                    className="sr-only"
                  />
                  <div className={`block w-14 h-8 rounded-full ${isBarberView ? 'bg-violet-600' : 'bg-gray-300'}`}></div>
                  <div className={`absolute left-1 top-1 w-6 h-6 rounded-full bg-white transition-transform ${isBarberView ? 'translate-x-6' : ''}`}></div>
                </div>
                <span className="ml-2 text-sm text-gray-600">Barber View</span>
              </label>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              const isBarberTab = tab.id === 'barber'

              // Show different tabs based on view mode
              if (isBarberView && !isBarberTab) return null
              if (!isBarberView && isBarberTab) return null

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`
                    flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                    ${isActive
                      ? 'border-violet-600 text-violet-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview/Analytics Tab */}
        {activeTab === 'overview' && <PayoutAnalyticsDashboard />}

        {/* Live Status Tab */}
        {activeTab === 'status' && <PayoutStatusTracker />}

        {/* Manual Trigger Tab */}
        {activeTab === 'manual' && <ManualPayoutTrigger />}

        {/* Schedule Configuration Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <PayoutScheduleConfig />
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule Preview</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Next Scheduled Payout</p>
                    <p className="text-sm text-gray-600">Thursday, June 26, 2024 at 10:00 AM</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">$3,456</p>
                    <p className="text-sm text-gray-600">3 barbers</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Following Payout</p>
                    <p className="text-sm text-gray-600">Thursday, July 3, 2024 at 10:00 AM</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Estimated</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && <PayoutCalendarView />}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && <PayoutNotificationSettings />}

        {/* Barber View Tab */}
        {activeTab === 'barber' && <BarberPayoutDashboard />}
      </main>
    </div>
  )
}
