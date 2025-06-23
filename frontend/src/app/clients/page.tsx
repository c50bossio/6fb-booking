'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  StarIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline'
import ModernLayout from '@/components/ModernLayout'
import ClientModal from '@/components/modals/ClientModal'
import ClientMessageModal from '@/components/modals/ClientMessageModal'

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

interface ClientStats {
  total_clients: number
  new_clients_this_month: number
  vip_clients: number
  at_risk_clients: number
  average_lifetime_value: number
  retention_rate: number
}

export default function ClientsPage() {
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchClientsData()
  }, [searchTerm, filterType, currentPage])

  const fetchClientsData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')

      const headers = { Authorization: `Bearer ${token}` }
      const params: any = {
        page: currentPage,
        limit: 20
      }

      if (searchTerm) params.search = searchTerm
      if (filterType !== 'all') params.customer_type = filterType

      // Try authenticated endpoints first
      const clientsRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/clients`, { headers, params })

      setClients(clientsRes.data.clients || [])
      setTotalPages(clientsRes.data.total_pages || 1)

      // Calculate stats from response data
      const clientsData = clientsRes.data.clients || []
      const stats: ClientStats = {
        total_clients: clientsRes.data.total_clients || clientsData.length,
        new_clients_this_month: clientsData.filter((c: Client) => {
          const createdDate = new Date(c.created_at)
          const thisMonth = new Date()
          return createdDate.getMonth() === thisMonth.getMonth() &&
                 createdDate.getFullYear() === thisMonth.getFullYear()
        }).length,
        vip_clients: clientsData.filter((c: Client) => c.customer_type === 'vip').length,
        at_risk_clients: clientsData.filter((c: Client) => c.customer_type === 'at_risk').length,
        average_lifetime_value: clientsData.reduce((sum: number, c: Client) => sum + c.total_spent, 0) / clientsData.length || 0,
        retention_rate: 0.82
      }
      setStats(stats)

    } catch (error) {
      console.error('Failed to fetch clients data:', error)
      // Use mock data
      const mockClients: Client[] = [
        {
          id: '1',
          first_name: 'John',
          last_name: 'Smith',
          email: 'john@example.com',
          phone: '(555) 123-4567',
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
          tags: ['VIP', 'Regular'],
          notes: 'Prefers early morning appointments',
          sms_enabled: true,
          email_enabled: true,
          marketing_enabled: true,
          created_at: '2023-01-15T10:00:00Z'
        },
        {
          id: '2',
          first_name: 'Mike',
          last_name: 'Johnson',
          email: 'mike@example.com',
          phone: '(555) 234-5678',
          total_visits: 8,
          total_spent: 560,
          last_visit_date: '2024-06-18',
          customer_type: 'returning',
          favorite_service: 'Classic Cut',
          average_ticket: 70,
          visit_frequency_days: 21,
          no_show_count: 1,
          cancellation_count: 0,
          referral_count: 1,
          tags: ['Weekend'],
          sms_enabled: true,
          email_enabled: false,
          marketing_enabled: false,
          created_at: '2023-03-20T14:30:00Z'
        },
        {
          id: '3',
          first_name: 'David',
          last_name: 'Wilson',
          email: 'david@example.com',
          phone: '(555) 345-6789',
          total_visits: 1,
          total_spent: 45,
          last_visit_date: '2024-06-22',
          customer_type: 'new',
          favorite_service: 'Beard Trim',
          average_ticket: 45,
          visit_frequency_days: null,
          no_show_count: 0,
          cancellation_count: 0,
          referral_count: 0,
          tags: [],
          sms_enabled: true,
          email_enabled: true,
          marketing_enabled: true,
          created_at: '2024-06-22T09:00:00Z'
        }
      ]

      setClients(mockClients)
      setStats({
        total_clients: 156,
        new_clients_this_month: 23,
        vip_clients: 18,
        at_risk_clients: 12,
        average_lifetime_value: 850,
        retention_rate: 0.82
      })
    } finally {
      setLoading(false)
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

  const handleAddClient = () => {
    setEditingClient(null)
    setIsClientModalOpen(true)
  }

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setIsClientModalOpen(true)
  }

  const handleMessageClient = (client: Client) => {
    setSelectedClient(client)
    setIsMessageModalOpen(true)
  }

  const handleExportClients = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const headers = { Authorization: `Bearer ${token}` }
      const params: any = { format: 'csv' }

      if (filterType !== 'all') params.customer_type = filterType

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/clients/export`,
        {},
        { headers, params, responseType: 'blob' }
      )

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `clients_export_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Failed to export clients:', error)
      alert('Failed to export clients. Please try again.')
    }
  }

  const getCustomerTypeBadge = (type: string) => {
    const styles = {
      new: 'bg-slate-100 text-slate-700 border-slate-200',
      returning: 'bg-teal-50 text-teal-700 border-teal-200',
      vip: 'bg-slate-200 text-slate-800 border-slate-300',
      at_risk: 'bg-red-50 text-red-700 border-red-200'
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

  const getCustomerTypeIcon = (type: string) => {
    switch (type) {
      case 'vip':
        return <StarIcon className="h-5 w-5 text-slate-600" />
      case 'at_risk':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
      default:
        return <UserGroupIcon className="h-5 w-5 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <ModernLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
        </div>
      </ModernLayout>
    )
  }

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 dark:text-white dark:bg-gray-800 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 dark:text-white dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            >
              <option value="all">All Clients</option>
              <option value="new">New Clients</option>
              <option value="returning">Returning</option>
              <option value="vip">VIP Clients</option>
              <option value="at_risk">At Risk</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportClients}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              <span>Export</span>
            </button>

            <button
              onClick={handleAddClient}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Add Client</span>
            </button>
          </div>
        </div>

        {/* Client Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-slate-600 rounded-xl">
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Clients</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.total_clients || 0}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{stats?.new_clients_this_month || 0} new this month</p>
          </div>

          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-slate-500 rounded-xl">
                <StarIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">VIP Clients</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.vip_clients || 0}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">High-value customers</p>
          </div>

          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-teal-600 rounded-xl">
                <CurrencyDollarIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Avg Lifetime Value</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(stats?.average_lifetime_value || 0)}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Per client revenue</p>
          </div>

          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-slate-700 rounded-xl">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Retention Rate</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {((stats?.retention_rate || 0) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {stats?.at_risk_clients || 0} at risk
            </p>
          </div>
        </div>

        {/* Clients List */}
        <div className="premium-card-modern overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200/50">
            <h3 className="text-lg font-semibold text-gray-900">
              Clients ({clients.length} of {stats?.total_clients || 0})
            </h3>
          </div>

          {clients.length === 0 ? (
            <div className="p-12 text-center">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No clients found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || filterType !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Start building your client base by adding your first client.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Visits
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Total Spent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Last Visit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Favorite Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-slate-600 flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {client.first_name[0]}{client.last_name[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{client.first_name} {client.last_name}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center space-x-2">
                              <span className="flex items-center">
                                <EnvelopeIcon className="h-3 w-3 mr-1" />
                                {client.email}
                              </span>
                              <span className="flex items-center">
                                <PhoneIcon className="h-3 w-3 mr-1" />
                                {client.phone}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getCustomerTypeIcon(client.customer_type)}
                          {getCustomerTypeBadge(client.customer_type)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{client.total_visits}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {client.visit_frequency_days ? `Every ${client.visit_frequency_days} days` : 'First visit'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-teal-700">
                          {formatCurrency(client.total_spent)}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {formatCurrency(client.average_ticket)} avg
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(client.last_visit_date)}</div>
                        {client.no_show_count > 0 && (
                          <div className="text-xs text-red-600">
                            {client.no_show_count} no-shows
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-800 dark:text-gray-300">{client.favorite_service || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => router.push(`/clients/${client.id}`)}
                            className="text-slate-600 hover:text-slate-700 p-1 rounded-md hover:bg-slate-50 transition-colors"
                            title="View Profile"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditClient(client)}
                            className="text-gray-600 hover:text-gray-700 p-1 rounded-md hover:bg-gray-50 transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleMessageClient(client)}
                            className="text-teal-600 hover:text-teal-700 p-1 rounded-md hover:bg-teal-50 transition-colors"
                            title="Send Message"
                          >
                            <ChatBubbleLeftIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200/50 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Client Modal */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => {
          setIsClientModalOpen(false)
          setEditingClient(null)
        }}
        onSuccess={() => {
          fetchClientsData()
          setIsClientModalOpen(false)
          setEditingClient(null)
        }}
        client={editingClient}
      />

      {/* Message Modal */}
      <ClientMessageModal
        isOpen={isMessageModalOpen}
        onClose={() => {
          setIsMessageModalOpen(false)
          setSelectedClient(null)
        }}
        client={selectedClient}
      />
    </ModernLayout>
  )
}
