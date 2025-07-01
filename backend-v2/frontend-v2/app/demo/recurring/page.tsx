'use client'

import { useState, useEffect } from 'react'
import { useDemoMode } from '@/components/demo/DemoModeProvider'
import DemoWrapper from '@/components/demo/DemoWrapper'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { format, addDays, addWeeks, addMonths } from 'date-fns'
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  UserGroupIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

interface DemoRecurringPattern {
  id: number
  client_name: string
  pattern_type: string
  preferred_time: string
  duration_minutes: number
  start_date: string
  service_name: string
  price: number
  is_active: boolean
  created_at: string
  next_appointment?: string
  total_appointments?: number
  total_revenue?: number
}

const DEMO_PATTERNS: DemoRecurringPattern[] = [
  {
    id: 1,
    client_name: 'Marcus Johnson',
    pattern_type: 'weekly',
    preferred_time: '10:00',
    duration_minutes: 45,
    start_date: '2024-01-15',
    service_name: 'Haircut & Beard Trim',
    price: 65,
    is_active: true,
    created_at: '2024-01-10',
    next_appointment: '2025-07-07',
    total_appointments: 24,
    total_revenue: 1560
  },
  {
    id: 2,
    client_name: 'David Thompson',
    pattern_type: 'biweekly',
    preferred_time: '14:30',
    duration_minutes: 30,
    start_date: '2024-02-01',
    service_name: 'Haircut',
    price: 45,
    is_active: true,
    created_at: '2024-01-28',
    next_appointment: '2025-07-03',
    total_appointments: 13,
    total_revenue: 585
  },
  {
    id: 3,
    client_name: 'Alex Rivera',
    pattern_type: 'monthly',
    preferred_time: '11:00',
    duration_minutes: 60,
    start_date: '2024-03-10',
    service_name: 'Full Service Package',
    price: 85,
    is_active: false,
    created_at: '2024-03-05',
    next_appointment: undefined,
    total_appointments: 4,
    total_revenue: 340
  }
]

const PATTERN_TYPES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' }
]

const DEMO_SERVICES = [
  { id: 'haircut', name: 'Haircut', price: 45, duration: 30 },
  { id: 'beard', name: 'Beard Trim', price: 25, duration: 20 },
  { id: 'combo', name: 'Haircut & Beard Trim', price: 65, duration: 45 },
  { id: 'full', name: 'Full Service Package', price: 85, duration: 60 }
]

export default function DemoRecurringPage() {
  const { mockData, user } = useDemoMode()
  const [patterns, setPatterns] = useState<DemoRecurringPattern[]>(DEMO_PATTERNS)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPattern, setNewPattern] = useState({
    client_name: '',
    pattern_type: 'weekly',
    preferred_time: '10:00',
    service_name: 'Haircut',
    start_date: format(new Date(), 'yyyy-MM-dd')
  })

  // Calculate total metrics from demo patterns
  const totalActivePatterns = patterns.filter(p => p.is_active).length
  const totalMonthlyRevenue = patterns
    .filter(p => p.is_active)
    .reduce((sum, p) => {
      const multiplier = p.pattern_type === 'weekly' ? 4 : p.pattern_type === 'biweekly' ? 2 : 1
      return sum + (p.price * multiplier)
    }, 0)
  
  const totalClients = patterns.length
  const averageValue = totalClients > 0 ? (totalMonthlyRevenue / totalClients).toFixed(0) : '0'

  const handleCreatePattern = () => {
    const selectedService = DEMO_SERVICES.find(s => s.name === newPattern.service_name)
    if (!selectedService) return

    const newId = Math.max(...patterns.map(p => p.id)) + 1
    const pattern: DemoRecurringPattern = {
      id: newId,
      client_name: newPattern.client_name,
      pattern_type: newPattern.pattern_type,
      preferred_time: newPattern.preferred_time,
      duration_minutes: selectedService.duration,
      start_date: newPattern.start_date,
      service_name: newPattern.service_name,
      price: selectedService.price,
      is_active: true,
      created_at: new Date().toISOString(),
      next_appointment: calculateNextAppointment(newPattern.start_date, newPattern.pattern_type),
      total_appointments: 0,
      total_revenue: 0
    }

    setPatterns([...patterns, pattern])
    setShowCreateForm(false)
    setNewPattern({
      client_name: '',
      pattern_type: 'weekly',
      preferred_time: '10:00',
      service_name: 'Haircut',
      start_date: format(new Date(), 'yyyy-MM-dd')
    })
  }

  const calculateNextAppointment = (startDate: string, patternType: string) => {
    const start = new Date(startDate)
    const now = new Date()
    
    let next = new Date(start)
    while (next < now) {
      if (patternType === 'weekly') {
        next = addWeeks(next, 1)
      } else if (patternType === 'biweekly') {
        next = addWeeks(next, 2)
      } else {
        next = addMonths(next, 1)
      }
    }
    
    return format(next, 'yyyy-MM-dd')
  }

  const togglePatternStatus = (id: number) => {
    setPatterns(patterns.map(p => 
      p.id === id ? { ...p, is_active: !p.is_active } : p
    ))
  }

  const deletePattern = (id: number) => {
    setPatterns(patterns.filter(p => p.id !== id))
  }

  const getPatternDescription = (pattern: DemoRecurringPattern) => {
    const frequency = pattern.pattern_type === 'weekly' ? 'Every week' : 
                     pattern.pattern_type === 'biweekly' ? 'Every 2 weeks' : 'Every month'
    return `${frequency} at ${pattern.preferred_time}`
  }

  const demoFeatures = [
    'Set up recurring appointment patterns for regular clients',
    'See projected monthly revenue from recurring bookings',
    'Manage active and inactive patterns',
    'Track total appointments and revenue per client'
  ]

  return (
    <DemoWrapper
      title="Recurring Appointments"
      description="Automate scheduling for your regular clients and build predictable revenue"
      demoFeatures={demoFeatures}
    >
      <div className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Patterns</p>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {totalActivePatterns}
                  </div>
                </div>
                <CalendarDaysIcon className="w-8 h-8 text-primary-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Revenue</p>
                  <div className="text-2xl font-bold text-green-600">
                    ${totalMonthlyRevenue}
                  </div>
                </div>
                <CurrencyDollarIcon className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Recurring Clients</p>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {totalClients}
                  </div>
                </div>
                <UserGroupIcon className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Client Value</p>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${averageValue}
                  </div>
                </div>
                <ClockIcon className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Impact Banner */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
                💰 Recurring Revenue Impact
              </h3>
              <p className="text-green-700 dark:text-green-400 mb-4">
                Your active recurring patterns generate <strong>${totalMonthlyRevenue}/month</strong> in predictable revenue
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
                  <div className="font-semibold">${totalMonthlyRevenue * 12}</div>
                  <div className="text-green-600 dark:text-green-400">Annual Revenue</div>
                </div>
                <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
                  <div className="font-semibold">{Math.round(totalMonthlyRevenue / totalActivePatterns * 4)} appointments</div>
                  <div className="text-green-600 dark:text-green-400">Per Month</div>
                </div>
                <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
                  <div className="font-semibold">{((totalActivePatterns / (totalActivePatterns + 10)) * 100).toFixed(0)}%</div>
                  <div className="text-green-600 dark:text-green-400">Schedule Utilization</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Recurring Patterns
          </h2>
          <Button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Create Pattern
          </Button>
        </div>

        {/* Create Pattern Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create Recurring Pattern</CardTitle>
              <CardDescription>Set up automatic scheduling for a regular client</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="client_name">Client Name</Label>
                    <Input
                      id="client_name"
                      value={newPattern.client_name}
                      onChange={(e) => setNewPattern(prev => ({ ...prev, client_name: e.target.value }))}
                      placeholder="Enter client name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pattern_type">Frequency</Label>
                    <select
                      id="pattern_type"
                      value={newPattern.pattern_type}
                      onChange={(e) => setNewPattern(prev => ({ ...prev, pattern_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {PATTERN_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="preferred_time">Preferred Time</Label>
                    <Input
                      id="preferred_time"
                      type="time"
                      value={newPattern.preferred_time}
                      onChange={(e) => setNewPattern(prev => ({ ...prev, preferred_time: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="service_name">Service</Label>
                    <select
                      id="service_name"
                      value={newPattern.service_name}
                      onChange={(e) => setNewPattern(prev => ({ ...prev, service_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {DEMO_SERVICES.map(service => (
                        <option key={service.id} value={service.name}>
                          {service.name} - ${service.price}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={newPattern.start_date}
                      onChange={(e) => setNewPattern(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button onClick={handleCreatePattern} disabled={!newPattern.client_name}>
                      Create Pattern
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Patterns List */}
        <div className="space-y-4">
          {patterns.map((pattern) => (
            <Card key={pattern.id} className={pattern.is_active ? '' : 'opacity-60'}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {pattern.client_name}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        pattern.is_active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {pattern.is_active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 mb-2">
                      {pattern.service_name} • {getPatternDescription(pattern)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Price:</span>
                        <span className="ml-1 font-medium">${pattern.price}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Next:</span>
                        <span className="ml-1 font-medium">
                          {pattern.next_appointment ? format(new Date(pattern.next_appointment), 'MMM d') : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Appts:</span>
                        <span className="ml-1 font-medium">{pattern.total_appointments}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Revenue:</span>
                        <span className="ml-1 font-medium">${pattern.total_revenue}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePatternStatus(pattern.id)}
                    >
                      {pattern.is_active ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                      {pattern.is_active ? 'Pause' : 'Resume'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deletePattern(pattern.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {patterns.length === 0 && (
          <Card className="text-center">
            <CardContent className="p-12">
              <CalendarDaysIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No recurring patterns yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Create your first recurring pattern to automate scheduling for regular clients
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                Create Your First Pattern
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DemoWrapper>
  )
}