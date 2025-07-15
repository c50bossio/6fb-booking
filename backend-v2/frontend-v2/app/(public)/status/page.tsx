'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ServerIcon,
  CreditCardIcon,
  BellIcon,
  CalendarDaysIcon,
  WifiIcon,
  ShieldCheckIcon,
  ArrowTopRightOnSquareIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { LogoFull } from '@/components/ui/Logo'

// Note: metadata removed due to 'use client' directive
// This page is client-side rendered for real-time status updates

interface ServiceStatus {
  id: string
  name: string
  description: string
  status: 'operational' | 'degraded' | 'outage'
  uptime: number
  responseTime: number
  icon: React.ComponentType<any>
  lastIncident?: string
}

interface HistoricalData {
  date: string
  uptime: number
  incidents: number
}

interface Incident {
  id: string
  title: string
  description: string
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
  severity: 'minor' | 'major' | 'critical'
  startTime: string
  resolvedTime?: string
  updates: {
    time: string
    message: string
    status: string
  }[]
}

interface MaintenanceWindow {
  id: string
  title: string
  description: string
  scheduledStart: string
  scheduledEnd: string
  status: 'scheduled' | 'in-progress' | 'completed'
  affectedServices: string[]
}

const SystemStatusPage = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [lastUpdated, setLastUpdated] = useState(new Date())

  // Mock data - in production, this would come from your monitoring APIs
  const services: ServiceStatus[] = [
    {
      id: 'api',
      name: 'API Services',
      description: 'Core booking and business logic APIs',
      status: 'operational',
      uptime: 99.97,
      responseTime: 145,
      icon: ServerIcon
    },
    {
      id: 'database',
      name: 'Database',
      description: 'PostgreSQL database cluster',
      status: 'operational',
      uptime: 99.99,
      responseTime: 12,
      icon: ShieldCheckIcon
    },
    {
      id: 'payments',
      name: 'Payment Processing',
      description: 'Stripe payment gateway integration',
      status: 'operational',
      uptime: 99.95,
      responseTime: 230,
      icon: CreditCardIcon
    },
    {
      id: 'notifications',
      name: 'SMS & Email',
      description: 'Twilio SMS and SendGrid email services',
      status: 'degraded',
      uptime: 98.2,
      responseTime: 850,
      icon: BellIcon,
      lastIncident: '2 hours ago'
    },
    {
      id: 'calendar',
      name: 'Calendar Sync',
      description: 'Google Calendar integration services',
      status: 'operational',
      uptime: 99.8,
      responseTime: 320,
      icon: CalendarDaysIcon
    },
    {
      id: 'cdn',
      name: 'Content Delivery',
      description: 'Static assets and media delivery',
      status: 'operational',
      uptime: 99.98,
      responseTime: 89,
      icon: WifiIcon
    }
  ]

  const historicalData: HistoricalData[] = [
    { date: '2025-01-15', uptime: 99.97, incidents: 0 },
    { date: '2025-01-14', uptime: 99.95, incidents: 1 },
    { date: '2025-01-13', uptime: 100.0, incidents: 0 },
    { date: '2025-01-12', uptime: 99.98, incidents: 0 },
    { date: '2025-01-11', uptime: 99.92, incidents: 1 },
    { date: '2025-01-10', uptime: 100.0, incidents: 0 },
    { date: '2025-01-09', uptime: 99.99, incidents: 0 },
    { date: '2025-01-08', uptime: 99.96, incidents: 0 },
    { date: '2025-01-07', uptime: 99.98, incidents: 0 },
    { date: '2025-01-06', uptime: 99.94, incidents: 1 },
    { date: '2025-01-05', uptime: 100.0, incidents: 0 },
    { date: '2025-01-04', uptime: 99.97, incidents: 0 },
    { date: '2025-01-03', uptime: 99.95, incidents: 0 },
    { date: '2025-01-02', uptime: 99.99, incidents: 0 },
    { date: '2025-01-01', uptime: 100.0, incidents: 0 },
    { date: '2024-12-31', uptime: 99.98, incidents: 0 },
    { date: '2024-12-30', uptime: 99.96, incidents: 1 },
    { date: '2024-12-29', uptime: 100.0, incidents: 0 },
    { date: '2024-12-28', uptime: 99.97, incidents: 0 },
    { date: '2024-12-27', uptime: 99.99, incidents: 0 },
    { date: '2024-12-26', uptime: 99.95, incidents: 0 },
    { date: '2024-12-25', uptime: 100.0, incidents: 0 },
    { date: '2024-12-24', uptime: 99.98, incidents: 0 },
    { date: '2024-12-23', uptime: 99.96, incidents: 1 },
    { date: '2024-12-22', uptime: 99.99, incidents: 0 },
    { date: '2024-12-21', uptime: 100.0, incidents: 0 },
    { date: '2024-12-20', uptime: 99.97, incidents: 0 },
    { date: '2024-12-19', uptime: 99.95, incidents: 0 },
    { date: '2024-12-18', uptime: 99.98, incidents: 0 },
    { date: '2024-12-17', uptime: 99.99, incidents: 0 }
  ]

  const incidents: Incident[] = [
    {
      id: '1',
      title: 'SMS Delivery Delays',
      description: 'Some SMS notifications are experiencing delivery delays due to carrier issues.',
      status: 'monitoring',
      severity: 'minor',
      startTime: '2025-01-15T14:30:00Z',
      updates: [
        {
          time: '2025-01-15T16:45:00Z',
          message: 'We are monitoring the situation and working with our SMS provider to resolve delivery delays.',
          status: 'monitoring'
        },
        {
          time: '2025-01-15T14:30:00Z',
          message: 'We have identified SMS delivery delays affecting approximately 15% of notifications.',
          status: 'identified'
        }
      ]
    }
  ]

  const maintenanceWindows: MaintenanceWindow[] = [
    {
      id: '1',
      title: 'Database Performance Optimization',
      description: 'Scheduled maintenance to optimize database performance and apply security updates.',
      scheduledStart: '2025-01-20T03:00:00Z',
      scheduledEnd: '2025-01-20T05:00:00Z',
      status: 'scheduled',
      affectedServices: ['api', 'database', 'calendar']
    }
  ]

  const overallUptime = services.reduce((acc, service) => acc + service.uptime, 0) / services.length
  const operationalServices = services.filter(s => s.status === 'operational').length
  const degradedServices = services.filter(s => s.status === 'degraded').length
  const outageServices = services.filter(s => s.status === 'outage').length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-600 dark:text-green-400'
      case 'degraded': return 'text-yellow-600 dark:text-yellow-400'
      case 'outage': return 'text-red-600 dark:text-red-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircleIcon className="w-5 h-5" />
      case 'degraded': return <ExclamationTriangleIcon className="w-5 h-5" />
      case 'outage': return <XCircleIcon className="w-5 h-5" />
      default: return <InformationCircleIcon className="w-5 h-5" />
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'degraded': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      case 'outage': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      default: return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }

  // Auto-update timestamp every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <LogoFull variant="auto" size="sm" href="/" />
              <div className="hidden sm:block w-px h-6 bg-gray-300 dark:bg-gray-700"></div>
              <div className="flex items-center space-x-2">
                <ChartBarIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h1 className="hidden sm:block text-lg font-semibold text-gray-900 dark:text-white">
                  System Status
                </h1>
              </div>
            </div>
            <nav className="flex items-center space-x-4">
              <Link 
                href="/" 
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                ← Back to Home
              </Link>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">
                  Get Started
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Status Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            {outageServices > 0 ? (
              <>
                <XCircleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                <h1 className="text-3xl font-bold text-red-600 dark:text-red-400">
                  Service Disruption
                </h1>
              </>
            ) : degradedServices > 0 ? (
              <>
                <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                <h1 className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  Partial Outage
                </h1>
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                <h1 className="text-3xl font-bold text-green-600 dark:text-green-400">
                  All Systems Operational
                </h1>
              </>
            )}
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-6 max-w-3xl mx-auto">
            Current status of BookedBarber platform services and infrastructure
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <ClockIcon className="w-4 h-4" />
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overall Uptime</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {overallUptime.toFixed(2)}%
                </p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Operational</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {operationalServices}
                </p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Degraded</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {degradedServices}
                </p>
              </div>
              <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Incidents</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {incidents.filter(i => i.status !== 'resolved').length}
                </p>
              </div>
              <InformationCircleIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Service Status' },
              { id: 'history', label: 'Uptime History' },
              { id: 'incidents', label: 'Active Incidents' },
              { id: 'maintenance', label: 'Maintenance' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Service Components
            </h2>
            
            {services.map((service) => (
              <div
                key={service.id}
                className={`rounded-lg border p-6 ${getStatusBg(service.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <service.icon className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {service.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {service.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`flex items-center space-x-2 ${getStatusColor(service.status)}`}>
                      {getStatusIcon(service.status)}
                      <span className="font-medium capitalize">{service.status}</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {service.uptime}% uptime
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {service.responseTime}ms avg response
                    </div>
                    {service.lastIncident && (
                      <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                        Last incident: {service.lastIncident}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              30-Day Uptime History
            </h2>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Overall Platform Uptime
                </h3>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  99.96%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Last 30 days average
                </p>
              </div>

              {/* Visual uptime bar chart */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Daily Uptime</h4>
                <div className="grid grid-cols-15 gap-1">
                  {historicalData.slice(-30).map((day, index) => (
                    <div
                      key={index}
                      className="group relative"
                      title={`${formatDate(day.date)}: ${day.uptime}% uptime, ${day.incidents} incidents`}
                    >
                      <div
                        className={`h-8 rounded-sm ${
                          day.uptime >= 99.5
                            ? 'bg-green-500'
                            : day.uptime >= 95
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ opacity: Math.max(0.3, day.uptime / 100) }}
                      />
                      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        {formatDate(day.date)}<br />
                        {day.uptime}% uptime<br />
                        {day.incidents} incidents
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>30 days ago</span>
                  <span>Today</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center space-x-6 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">99.5%+ uptime</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-sm"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">95-99.5% uptime</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">&lt;95% uptime</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'incidents' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Active Incidents
            </h2>

            {incidents.length === 0 ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-8 text-center">
                <CheckCircleIcon className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                  No Active Incidents
                </h3>
                <p className="text-green-700 dark:text-green-300">
                  All systems are currently operating normally. No ongoing incidents to report.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {incidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              incident.severity === 'critical'
                                ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
                                : incident.severity === 'major'
                                ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200'
                                : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200'
                            }`}
                          >
                            {incident.severity.toUpperCase()}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              incident.status === 'resolved'
                                ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
                                : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
                            }`}
                          >
                            {incident.status.toUpperCase()}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          {incident.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          {incident.description}
                        </p>
                      </div>
                      <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                        <p>Started: {formatDateTime(incident.startTime)}</p>
                        {incident.resolvedTime && (
                          <p>Resolved: {formatDateTime(incident.resolvedTime)}</p>
                        )}
                      </div>
                    </div>

                    {/* Incident Updates */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">Updates</h4>
                      <div className="space-y-3">
                        {incident.updates.map((update, index) => (
                          <div key={index} className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0"></div>
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {update.message}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {formatDateTime(update.time)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Scheduled Maintenance
            </h2>

            {maintenanceWindows.length === 0 ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center">
                <CalendarDaysIcon className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  No Scheduled Maintenance
                </h3>
                <p className="text-blue-700 dark:text-blue-300">
                  There are currently no scheduled maintenance windows. We'll notify you in advance of any planned maintenance.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {maintenanceWindows.map((maintenance) => (
                  <div
                    key={maintenance.id}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              maintenance.status === 'completed'
                                ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
                                : maintenance.status === 'in-progress'
                                ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200'
                                : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
                            }`}
                          >
                            {maintenance.status.toUpperCase().replace('-', ' ')}
                          </span>
                          <CalendarDaysIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          {maintenance.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          {maintenance.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                            Affected services:
                          </span>
                          {maintenance.affectedServices.map((serviceId) => {
                            const service = services.find(s => s.id === serviceId)
                            return (
                              <span
                                key={serviceId}
                                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm"
                              >
                                {service?.name || serviceId}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                        <p>Start: {formatDateTime(maintenance.scheduledStart)}</p>
                        <p>End: {formatDateTime(maintenance.scheduledEnd)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Subscribe to Updates */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-8 text-center text-white mt-12">
          <h2 className="text-2xl font-bold mb-4">
            Stay Updated
          </h2>
          <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
            Get notified about service updates, maintenance windows, and incidents. 
            Subscribe to our status page for real-time notifications.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="mailto:support@bookedbarber.com?subject=Status%20Updates%20Subscription">
              <Button size="lg" className="bg-white text-primary-700 hover:bg-gray-100">
                Subscribe to Updates
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-primary-700">
                Contact Support
              </Button>
            </Link>
          </div>
        </div>

        {/* Additional Resources */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <InformationCircleIcon className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Service Documentation
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Learn more about our platform architecture and service dependencies.
            </p>
            <Link 
              href="/documentation" 
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center"
            >
              View Documentation
              <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <BellIcon className="w-8 h-8 text-green-600 dark:text-green-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Incident History
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Review past incidents and our response times for transparency.
            </p>
            <button 
              onClick={() => setActiveTab('incidents')}
              className="text-sm font-medium text-green-600 dark:text-green-400 hover:underline inline-flex items-center"
            >
              View Incident History
              <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-1" />
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <ChartBarIcon className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Performance Metrics
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Detailed performance metrics and SLA information for Enterprise customers.
            </p>
            <Link 
              href="/contact" 
              className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center"
            >
              Contact Sales
              <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SystemStatusPage