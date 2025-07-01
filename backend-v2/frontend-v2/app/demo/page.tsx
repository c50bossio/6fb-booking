'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { useDemoMode } from '@/components/demo/DemoModeProvider'
import { 
  CalendarDaysIcon,
  ChartBarIcon,
  UserGroupIcon,
  BellIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  ClockIcon,
  SparklesIcon,
  ArrowRightIcon,
  PlayIcon
} from '@heroicons/react/24/outline'

export default function DemoPage() {
  const { resetData, mockData, user } = useDemoMode()

  // Calculate some stats from mock data
  const todayAppointments = mockData.appointments.filter(apt => {
    const aptDate = new Date(apt.start_time)
    const today = new Date()
    return aptDate.toDateString() === today.toDateString()
  }).length

  const weekRevenue = mockData.appointments
    .filter(apt => apt.status === 'completed')
    .reduce((sum, apt) => sum + apt.price, 0)

  const activeClients = mockData.clients.length
  const teamSize = mockData.barbers.length

  const demoFeatures = [
    {
      title: 'Calendar Management',
      description: 'Experience our intuitive calendar with day, week, and month views',
      icon: CalendarDaysIcon,
      href: '/demo/calendar',
      color: 'bg-blue-500',
      features: ['Drag & drop scheduling', 'Multiple view modes', 'Quick appointment creation']
    },
    {
      title: 'Analytics Dashboard',
      description: 'See powerful business insights with Six Figure Barber metrics',
      icon: ChartBarIcon,
      href: '/demo/analytics',
      color: 'bg-purple-500',
      features: ['Revenue tracking', 'Client retention metrics', 'Service performance']
    },
    {
      title: 'Recurring Appointments',
      description: 'Set up automated scheduling for regular clients',
      icon: ArrowPathIcon,
      href: '/demo/recurring',
      color: 'bg-green-500',
      features: ['Weekly/bi-weekly patterns', 'Auto-scheduling', 'Client preferences']
    },
    {
      title: 'Client Booking',
      description: 'Try the client-side booking experience',
      icon: UserGroupIcon,
      href: '/demo/book',
      color: 'bg-orange-500',
      features: ['Real-time availability', 'Service selection', 'Instant confirmation']
    },
    {
      title: 'Payment Processing',
      description: 'See how payments and payouts work',
      icon: CurrencyDollarIcon,
      href: '/demo/payments',
      color: 'bg-yellow-500',
      features: ['Stripe integration', 'Automatic payouts', 'Transaction history']
    },
    {
      title: 'Notifications',
      description: 'Explore automated client communications',
      icon: BellIcon,
      href: '/demo/notifications',
      color: 'bg-red-500',
      features: ['SMS reminders', 'Email confirmations', 'Custom templates']
    }
  ]

  const quickScenarios = [
    {
      title: 'Busy Monday Morning',
      description: 'See how to manage a fully booked schedule',
      icon: ClockIcon,
      action: () => {
        // Could implement scenario loading
        window.location.href = '/demo/calendar?scenario=busy-monday'
      }
    },
    {
      title: 'New Client Booking',
      description: 'Walk through the client booking experience',
      icon: UserGroupIcon,
      action: () => {
        window.location.href = '/demo/book'
      }
    },
    {
      title: 'Monthly Analytics',
      description: 'Review your business performance',
      icon: ChartBarIcon,
      action: () => {
        window.location.href = '/demo/analytics'
      }
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-white/20 backdrop-blur rounded-full">
                <SparklesIcon className="h-12 w-12" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Welcome to Your Demo Barbershop!
            </h1>
            <p className="text-xl text-purple-100 mb-8 max-w-3xl mx-auto">
              You're logged in as <span className="font-semibold">{user.first_name} {user.last_name}</span> - a successful barber with a thriving business
            </p>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-8">
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="text-3xl font-bold">{todayAppointments}</div>
                <div className="text-sm text-purple-200">Appointments Today</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="text-3xl font-bold">${weekRevenue.toLocaleString()}</div>
                <div className="text-sm text-purple-200">This Week's Revenue</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="text-3xl font-bold">{activeClients}</div>
                <div className="text-sm text-purple-200">Active Clients</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="text-3xl font-bold">{teamSize}</div>
                <div className="text-sm text-purple-200">Team Members</div>
              </div>
            </div>

            {/* What You Can Do */}
            <div className="bg-white/10 backdrop-blur rounded-lg p-6 max-w-3xl mx-auto mb-8 text-left">
              <h3 className="text-lg font-semibold mb-3">🎯 Feel Free to Explore Everything:</h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-green-300">✓</span>
                  <span className="font-semibold">Drag & drop appointments to reschedule</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-300">✓</span>
                  <span>Click any client to edit their information</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-300">✓</span>
                  <span>Create new bookings with real-time availability</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-300">✓</span>
                  <span>View detailed analytics and insights</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-300">✓</span>
                  <span>Manage recurring appointments</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-300">✓</span>
                  <span>Test payment processing (demo mode)</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/demo/calendar">
                <Button variant="secondary" size="lg" className="group">
                  <PlayIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  Start Exploring
                </Button>
              </Link>
              <button
                onClick={resetData}
                className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur border border-white/30 rounded-lg hover:bg-white/30 transition-colors"
              >
                <ArrowPathIcon className="w-5 h-5 mr-2" />
                Reset Demo Data
              </button>
              <Link href="/">
                <Button variant="outline" size="lg" className="!text-white !border-white/50 hover:!bg-white/10">
                  Back to Homepage
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Quick Start Scenarios
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {quickScenarios.map((scenario, index) => (
              <button
                key={index}
                onClick={scenario.action}
                className="flex items-start gap-4 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left group"
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <scenario.icon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {scenario.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {scenario.description}
                  </p>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors mt-1" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          Explore All Features
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {demoFeatures.map((feature, index) => (
            <Link
              key={index}
              href={feature.href}
              className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6">
                <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {feature.description}
                </p>
                <ul className="space-y-2">
                  {feature.features.map((item, idx) => (
                    <li key={idx} className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center text-purple-600 dark:text-purple-400 font-medium">
                  Try it now
                  <ArrowRightIcon className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Tips Section */}
      <div className="bg-purple-50 dark:bg-purple-900/10 border-t border-purple-200 dark:border-purple-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Demo Tips
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• All data is sample data - feel free to experiment!</li>
                <li>• Click "Reset Demo Data" anytime to start fresh</li>
                <li>• Try creating appointments, viewing analytics, and exploring all features</li>
                <li>• Ready to use the real thing? <Link href="/register" className="text-purple-600 dark:text-purple-400 hover:underline">Start your free trial</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}