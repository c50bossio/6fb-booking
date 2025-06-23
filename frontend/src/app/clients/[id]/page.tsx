'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import axios from 'axios'
import {
  ArrowLeftIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  StarIcon,
  ClockIcon,
  TagIcon,
  DocumentTextIcon,
  ChatBubbleLeftIcon,
  PencilIcon,
  ExclamationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import ModernLayout from '@/components/ModernLayout'
import ClientModal from '@/components/modals/ClientModal'
import ClientMessageModal from '@/components/modals/ClientMessageModal'

interface ClientDetails extends Client {
  date_of_birth?: string
}

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  total_visits: number
  total_spent: number
  last_visit_date: string | null
  customer_type: string
  favorite_service?: string
  average_ticket: number
  visit_frequency_days: number | null
  notes?: string
  tags?: string[]
  no_show_count: number
  cancellation_count: number
  referral_count: number
  sms_enabled: boolean
  email_enabled: boolean
  marketing_enabled: boolean
  created_at: string
}

interface Appointment {
  id: string
  date: string
  time: string
  service: string
  barber: string
  cost: number
  status: string
  notes?: string
}

interface ClientHistory {
  appointments: Appointment[]
  total_appointments: number
  total_spent: number
  services_breakdown: Record<string, number>
  average_rating?: number
  last_review?: {
    rating: number
    comment: string
    date: string
  }
}

export default function ClientProfilePage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<ClientDetails | null>(null)
  const [history, setHistory] = useState<ClientHistory | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'notes'>('overview')

  useEffect(() => {
    if (clientId) {
      fetchClientData()
      fetchClientHistory()
    }
  }, [clientId])

  const fetchClientData = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const headers = { Authorization: `Bearer ${token}` }
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/clients/${clientId}`,
        { headers }
      )
      
      setClient(response.data)
    } catch (error) {
      console.error('Failed to fetch client:', error)
      // Use mock data for now
      setClient({
        id: clientId,
        first_name: 'John',
        last_name: 'Smith',
        email: 'john@example.com',
        phone: '(555) 123-4567',
        date_of_birth: '1990-05-15',
        total_visits: 15,
        total_spent: 1200,
        last_visit_date: '2024-06-20',
        customer_type: 'vip',
        favorite_service: 'Premium Fade',
        average_ticket: 80,
        visit_frequency_days: 14,
        no_show_count: 0,
        cancellation_count: 1,
        referral_count: 3,
        tags: ['VIP', 'Regular', 'Morning'],
        notes: 'Prefers early morning appointments. Always asks for Marcus. Allergic to certain hair products.',
        sms_enabled: true,
        email_enabled: true,
        marketing_enabled: true,
        created_at: '2023-01-15T10:00:00Z'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchClientHistory = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const headers = { Authorization: `Bearer ${token}` }
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/clients/${clientId}/history`,
        { headers }
      )
      
      setHistory(response.data)
    } catch (error) {
      console.error('Failed to fetch client history:', error)
      // Use mock data
      setHistory({
        appointments: [
          {
            id: '1',
            date: '2024-06-20',
            time: '10:00',
            service: 'Premium Fade',
            barber: 'Marcus Williams',
            cost: 85,
            status: 'completed',
            notes: 'Great cut as always'
          },
          {
            id: '2',
            date: '2024-06-06',
            time: '09:30',
            service: 'Premium Fade + Beard',
            barber: 'Marcus Williams',
            cost: 105,
            status: 'completed'
          },
          {
            id: '3',
            date: '2024-05-23',
            time: '10:00',
            service: 'Premium Fade',
            barber: 'Marcus Williams',
            cost: 85,
            status: 'completed'
          }
        ],
        total_appointments: 15,
        total_spent: 1200,
        services_breakdown: {
          'Premium Fade': 10,
          'Premium Fade + Beard': 3,
          'Beard Trim': 2
        },
        average_rating: 4.8,
        last_review: {
          rating: 5,
          comment: 'Marcus is the best! Always consistent and professional.',
          date: '2024-06-20'
        }
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getCustomerTypeBadge = (type: string) => {
    const styles = {
      new: 'bg-blue-100 text-blue-800 border-blue-200',
      returning: 'bg-green-100 text-green-800 border-green-200',
      vip: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      at_risk: 'bg-red-100 text-red-800 border-red-200'
    }

    const labels = {
      new: 'New',
      returning: 'Returning',
      vip: 'VIP',
      at_risk: 'At Risk'
    }

    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${styles[type as keyof typeof styles] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {labels[type as keyof typeof labels] || type.toUpperCase()}
      </span>
    )
  }

  const handleUpdateVIPStatus = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const headers = { Authorization: `Bearer ${token}` }
      
      const newVipStatus = client?.customer_type !== 'vip'
      
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/clients/${clientId}/vip-status`,
        {
          is_vip: newVipStatus,
          custom_rate: newVipStatus ? 10 : null, // 10% discount for VIP
          vip_benefits: newVipStatus ? {
            priority_booking: true,
            discount_percentage: 10,
            free_beard_trim: true
          } : null
        },
        { headers }
      )
      
      alert(`Client ${newVipStatus ? 'marked as VIP' : 'VIP status removed'} successfully!`)
      fetchClientData()
    } catch (error) {
      console.error('Failed to update VIP status:', error)
      alert('Failed to update VIP status. Please try again.')
    }
  }

  if (loading) {
    return (
      <ModernLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
        </div>
      </ModernLayout>
    )
  }

  if (!client) {
    return (
      <ModernLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Client not found</h3>
          <button
            onClick={() => router.push('/clients')}
            className="mt-4 text-violet-600 hover:text-violet-700"
          >
            Back to clients
          </button>
        </div>
      </ModernLayout>
    )
  }

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/clients')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{client.first_name} {client.last_name}</h1>
              <div className="flex items-center space-x-3 mt-1">
                {getCustomerTypeBadge(client.customer_type)}
                <span className="text-sm text-gray-500">Member since {formatDate(client.created_at)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMessageModalOpen(true)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <ChatBubbleLeftIcon className="h-5 w-5" />
              <span>Send Message</span>
            </button>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium hover:from-violet-700 hover:to-purple-700 transition-all flex items-center space-x-2"
            >
              <PencilIcon className="h-5 w-5" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Appointment History
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'notes'
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Notes & Tags
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contact Information */}
            <div className="premium-card-modern p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{client.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <PhoneIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{client.phone}</p>
                  </div>
                </div>
                {client.date_of_birth && (
                  <div className="flex items-center space-x-3">
                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Birthday</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(client.date_of_birth)}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Communication Preferences</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">SMS</span>
                    {client.sms_enabled ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <ExclamationCircleIcon className="h-5 w-5 text-gray-300" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Email</span>
                    {client.email_enabled ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <ExclamationCircleIcon className="h-5 w-5 text-gray-300" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Marketing</span>
                    {client.marketing_enabled ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <ExclamationCircleIcon className="h-5 w-5 text-gray-300" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="premium-card-modern p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Total Visits</p>
                  <p className="text-2xl font-bold text-gray-900">{client.total_visits}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Spent</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(client.total_spent)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Average Ticket</p>
                  <p className="text-xl font-semibold text-gray-900">{formatCurrency(client.average_ticket)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Visit Frequency</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {client.visit_frequency_days ? `Every ${client.visit_frequency_days} days` : 'First visit'}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{client.no_show_count}</p>
                    <p className="text-xs text-gray-500">No Shows</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{client.cancellation_count}</p>
                    <p className="text-xs text-gray-500">Cancellations</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{client.referral_count}</p>
                    <p className="text-xs text-gray-500">Referrals</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="premium-card-modern p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push(`/dashboard/appointments/new?client=${clientId}`)}
                  className="w-full px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  Book Appointment
                </button>
                <button
                  onClick={handleUpdateVIPStatus}
                  className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {client.customer_type === 'vip' ? 'Remove VIP Status' : 'Mark as VIP'}
                </button>
                {client.favorite_service && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500 mb-1">Favorite Service</p>
                    <p className="text-sm font-medium text-gray-900">{client.favorite_service}</p>
                  </div>
                )}
              </div>
              
              {history?.average_rating && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-2">Average Rating</p>
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <StarSolid
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.floor(history.average_rating || 0)
                            ? 'text-yellow-400'
                            : 'text-gray-200'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      {history.average_rating.toFixed(1)}
                    </span>
                  </div>
                  {history.last_review && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500">Latest Review</p>
                      <p className="text-sm text-gray-700 italic mt-1">"{history.last_review.comment}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && history && (
          <div className="premium-card-modern overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200/50">
              <h3 className="text-lg font-semibold text-gray-900">
                Appointment History ({history.total_appointments} total)
              </h3>
            </div>
            
            {history.appointments.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Book the first appointment for this client.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Barber
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {history.appointments.map((appointment) => (
                      <tr key={appointment.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(appointment.date)}</div>
                          <div className="text-xs text-gray-500">{appointment.time}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{appointment.service}</div>
                          {appointment.notes && (
                            <div className="text-xs text-gray-500">{appointment.notes}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {appointment.barber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">
                          {formatCurrency(appointment.cost)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            appointment.status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : appointment.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {appointment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {history.services_breakdown && Object.keys(history.services_breakdown).length > 0 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Service Breakdown</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(history.services_breakdown).map(([service, count]) => (
                    <div key={service}>
                      <p className="text-sm font-medium text-gray-900">{service}</p>
                      <p className="text-xs text-gray-500">{count} appointments</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="premium-card-modern p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
              {client.notes ? (
                <div className="prose prose-sm text-gray-700">
                  <p className="whitespace-pre-wrap">{client.notes}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No notes added yet.</p>
              )}
            </div>
            
            <div className="premium-card-modern p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
              {client.tags && client.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {client.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center space-x-1"
                    >
                      <TagIcon className="h-3 w-3" />
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No tags added yet.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <ClientModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          fetchClientData()
          setIsEditModalOpen(false)
        }}
        client={client}
      />

      {/* Message Modal */}
      <ClientMessageModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        client={client}
      />
    </ModernLayout>
  )
}