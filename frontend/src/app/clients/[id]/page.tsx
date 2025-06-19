'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import axios from 'axios'
import {
  ArrowLeftIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  StarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  PencilIcon,
  ChatBubbleLeftIcon,
  HeartIcon,
  GiftIcon
} from '@heroicons/react/24/outline'

interface ClientProfile {
  id: string
  name: string
  email: string
  phone: string
  date_of_birth?: string
  total_visits: number
  total_spent: number
  average_ticket: number
  last_visit: string
  customer_type: string
  favorite_service?: string
  visit_frequency: number
  notes?: string
  tags?: string[]
  no_show_count: number
  cancellation_count: number
  referral_count: number
  sms_enabled: boolean
  email_enabled: boolean
  marketing_enabled: boolean
}

interface Visit {
  id: string
  date: string
  service_name: string
  barber_name: string
  amount: number
  duration: number
  status: string
  notes?: string
  tip_amount?: number
}

interface ClientStats {
  lifetime_value: number
  visit_pattern: string
  loyalty_score: number
  last_communication: string
  next_predicted_visit: string
  retention_risk: string
}

export default function ClientProfilePage() {
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<ClientProfile | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState('overview')
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    if (params.id) {
      fetchClientData(params.id as string)
    }
  }, [params.id])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchClientData = async (clientId: string) => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const headers = { Authorization: `Bearer ${token}` }

      const [clientRes, visitsRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/clients/${clientId}`, { headers }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/clients/${clientId}/visits`, { headers })
      ])

      const clientData = clientRes.data
      const visitsData = visitsRes.data.visits || []

      setClient(clientData)
      setVisits(visitsData)

      // Calculate advanced stats
      const stats: ClientStats = {
        lifetime_value: clientData.total_spent,
        visit_pattern: calculateVisitPattern(visitsData),
        loyalty_score: calculateLoyaltyScore(clientData, visitsData),
        last_communication: 'N/A', // This would come from communications API
        next_predicted_visit: predictNextVisit(visitsData, clientData.visit_frequency),
        retention_risk: assessRetentionRisk(clientData, visitsData)
      }
      setStats(stats)

    } catch (error) {
      console.error('Failed to fetch client data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateVisitPattern = (visits: Visit[]) => {
    if (visits.length < 2) return 'Insufficient data'
    const intervals = []
    for (let i = 1; i < visits.length; i++) {
      const diff = new Date(visits[i-1].date).getTime() - new Date(visits[i].date).getTime()
      intervals.push(Math.abs(diff) / (1000 * 60 * 60 * 24)) // days
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
    
    if (avgInterval < 14) return 'Weekly'
    if (avgInterval < 35) return 'Monthly'
    if (avgInterval < 70) return 'Bi-monthly'
    return 'Sporadic'
  }

  const calculateLoyaltyScore = (client: ClientProfile, visits: Visit[]) => {
    let score = 0
    score += Math.min(client.total_visits * 10, 50) // Max 50 points for visits
    score += Math.min(client.total_spent / 50, 30) // Max 30 points for spending
    score -= client.no_show_count * 5 // Penalty for no-shows
    score -= client.cancellation_count * 2 // Penalty for cancellations
    score += client.referral_count * 10 // Bonus for referrals
    return Math.max(0, Math.min(100, score))
  }

  const predictNextVisit = (visits: Visit[], frequency: number) => {
    if (visits.length === 0) return 'Unknown'
    const lastVisit = new Date(visits[0].date)
    const avgDays = 30 / frequency // frequency is visits per month
    const nextVisit = new Date(lastVisit.getTime() + (avgDays * 24 * 60 * 60 * 1000))
    return nextVisit.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const assessRetentionRisk = (client: ClientProfile, visits: Visit[]) => {
    if (client.customer_type === 'at_risk') return 'High'
    if (client.no_show_count > 2 || client.cancellation_count > 3) return 'Medium'
    if (visits.length > 0) {
      const daysSinceLastVisit = (Date.now() - new Date(visits[0].date).getTime()) / (1000 * 60 * 60 * 24)
      const expectedDays = 30 / client.visit_frequency
      if (daysSinceLastVisit > expectedDays * 2) return 'High'
      if (daysSinceLastVisit > expectedDays * 1.5) return 'Medium'
    }
    return 'Low'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCustomerTypeBadge = (type: string) => {
    const styles = {
      new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      returning: 'bg-green-500/20 text-green-400 border-green-500/30',
      vip: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      at_risk: 'bg-red-500/20 text-red-400 border-red-500/30'
    }

    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${styles[type as keyof typeof styles] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
        {type.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  const getRetentionRiskColor = (risk: string) => {
    switch (risk) {
      case 'High': return 'text-red-400'
      case 'Medium': return 'text-yellow-400'
      case 'Low': return 'text-green-400'
      default: return 'text-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading client profile...</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-300">Client not found</h3>
          <p className="mt-1 text-sm text-gray-500">The client you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <a
                href="/clients"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </a>
              <Image
                src="/6fb-logo.png"
                alt="6FB Logo"
                width={60}
                height={60}
                className="rounded-full"
              />
              <div>
                <h1 className="text-xl font-bold text-white">{client.name}</h1>
                <p className="text-xs text-gray-400">Client Profile & History</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit Profile
              </button>
              
              <div className="text-right">
                <p className="text-sm text-gray-400">
                  {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-lg font-semibold text-white">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Client Info Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
              <div className="text-center mb-6">
                <div className="w-24 h-24 rounded-full bg-gray-600 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">
                    {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white">{client.name}</h2>
                {getCustomerTypeBadge(client.customer_type)}
              </div>

              <div className="space-y-4">
                <div className="flex items-center text-gray-300">
                  <EnvelopeIcon className="h-5 w-5 mr-3 text-gray-400" />
                  <span className="text-sm">{client.email}</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <PhoneIcon className="h-5 w-5 mr-3 text-gray-400" />
                  <span className="text-sm">{client.phone}</span>
                </div>
                {client.date_of_birth && (
                  <div className="flex items-center text-gray-300">
                    <GiftIcon className="h-5 w-5 mr-3 text-gray-400" />
                    <span className="text-sm">{formatDate(client.date_of_birth)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Visits</span>
                  <span className="text-white font-semibold">{client.total_visits}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total Spent</span>
                  <span className="text-green-400 font-semibold">{formatCurrency(client.total_spent)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Average Ticket</span>
                  <span className="text-white font-semibold">{formatCurrency(client.average_ticket)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Visit Frequency</span>
                  <span className="text-white font-semibold">{client.visit_frequency}x/month</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Loyalty Score</span>
                  <span className="text-yellow-400 font-semibold">{stats?.loyalty_score}/100</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Retention Risk</span>
                  <span className={`font-semibold ${getRetentionRiskColor(stats?.retention_risk || 'Unknown')}`}>
                    {stats?.retention_risk}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 mb-6">
              <div className="border-b border-gray-700">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'overview', name: 'Overview', icon: UserIcon },
                    { id: 'history', name: 'Visit History', icon: CalendarIcon },
                    { id: 'communications', name: 'Communications', icon: ChatBubbleLeftIcon },
                    { id: 'loyalty', name: 'Loyalty', icon: HeartIcon }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                        activeTab === tab.id
                          ? 'border-green-500 text-green-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      <span>{tab.name}</span>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3">Client Insights</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-700 rounded-lg p-4">
                          <div className="text-sm text-gray-400">Visit Pattern</div>
                          <div className="text-lg font-semibold text-white">{stats?.visit_pattern}</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-4">
                          <div className="text-sm text-gray-400">Next Predicted Visit</div>
                          <div className="text-lg font-semibold text-white">{stats?.next_predicted_visit}</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-4">
                          <div className="text-sm text-gray-400">Favorite Service</div>
                          <div className="text-lg font-semibold text-white">{client.favorite_service || 'N/A'}</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-4">
                          <div className="text-sm text-gray-400">Last Visit</div>
                          <div className="text-lg font-semibold text-white">
                            {client.last_visit ? formatDate(client.last_visit) : 'Never'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {client.notes && (
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3">Notes</h4>
                        <div className="bg-gray-700 rounded-lg p-4">
                          <p className="text-gray-300">{client.notes}</p>
                        </div>
                      </div>
                    )}

                    {client.tags && client.tags.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {client.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'history' && (
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4">Visit History</h4>
                    {visits.length === 0 ? (
                      <div className="text-center py-8">
                        <CalendarIcon className="mx-auto h-12 w-12 text-gray-600" />
                        <h3 className="mt-2 text-sm font-medium text-gray-300">No visits yet</h3>
                        <p className="mt-1 text-sm text-gray-500">Visit history will appear here once the client books their first appointment.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {visits.map((visit) => (
                          <div key={visit.id} className="bg-gray-700 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-semibold text-white">{visit.service_name}</h5>
                                <p className="text-sm text-gray-400">with {visit.barber_name}</p>
                                <p className="text-xs text-gray-500">{formatDate(visit.date)}</p>
                                {visit.notes && (
                                  <p className="text-sm text-gray-300 mt-2">{visit.notes}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-semibold text-green-400">
                                  {formatCurrency(visit.amount)}
                                </div>
                                {visit.tip_amount && (
                                  <div className="text-sm text-yellow-400">
                                    +{formatCurrency(visit.tip_amount)} tip
                                  </div>
                                )}
                                <div className="text-xs text-gray-400">{visit.duration}min</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'communications' && (
                  <div className="text-center py-8">
                    <ChatBubbleLeftIcon className="mx-auto h-12 w-12 text-gray-600" />
                    <h3 className="mt-2 text-sm font-medium text-gray-300">Communication history</h3>
                    <p className="mt-1 text-sm text-gray-500">SMS and email communication history will appear here.</p>
                  </div>
                )}

                {activeTab === 'loyalty' && (
                  <div className="text-center py-8">
                    <HeartIcon className="mx-auto h-12 w-12 text-gray-600" />
                    <h3 className="mt-2 text-sm font-medium text-gray-300">Loyalty program</h3>
                    <p className="mt-1 text-sm text-gray-500">Loyalty points and rewards will be displayed here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}