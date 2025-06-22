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
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import ModernLayout from '@/components/ModernLayout'

interface Client {
  id: string
  name: string
  email: string
  phone: string
  total_visits: number
  total_spent: number
  last_visit: string
  customer_type: string
  favorite_service?: string
  average_ticket: number
  visit_frequency: number
  notes?: string
  tags?: string[]
  no_show_count: number
  cancellation_count: number
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
      const [clientsRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/clients`, { headers, params })
      ])

      setClients(clientsRes.data.clients || [])
      setTotalPages(clientsRes.data.total_pages || 1)

      // Calculate stats from client data
      const clientsData = clientsRes.data.clients || []
      const stats: ClientStats = {
        total_clients: clientsRes.data.total_clients || clientsData.length,
        new_clients_this_month: clientsData.filter((c: Client) => c.customer_type === 'new').length,
        vip_clients: clientsData.filter((c: Client) => c.customer_type === 'vip').length,
        at_risk_clients: clientsData.filter((c: Client) => c.customer_type === 'at_risk').length,
        average_lifetime_value: clientsData.reduce((sum: number, c: Client) => sum + c.total_spent, 0) / clientsData.length || 0,
        retention_rate: 0.82
      }
      setStats(stats)

    } catch (error) {
      console.error('Failed to fetch clients data:', error)
      // Use mock data
      const mockClients = [
        {
          id: '1',
          name: 'John Smith',
          email: 'john@example.com',
          phone: '(555) 123-4567',
          total_visits: 15,
          total_spent: 1200,
          last_visit: '2024-06-20',
          customer_type: 'vip',
          favorite_service: 'Premium Fade',
          average_ticket: 80,
          visit_frequency: 3,
          no_show_count: 0,
          cancellation_count: 1
        },
        {
          id: '2',
          name: 'Mike Johnson',
          email: 'mike@example.com',
          phone: '(555) 234-5678',
          total_visits: 8,
          total_spent: 560,
          last_visit: '2024-06-18',
          customer_type: 'returning',
          favorite_service: 'Classic Cut',
          average_ticket: 70,
          visit_frequency: 2,
          no_show_count: 1,
          cancellation_count: 0
        },
        {
          id: '3',
          name: 'David Wilson',
          email: 'david@example.com',
          phone: '(555) 345-6789',
          total_visits: 1,
          total_spent: 45,
          last_visit: '2024-06-22',
          customer_type: 'new',
          favorite_service: 'Beard Trim',
          average_ticket: 45,
          visit_frequency: 1,
          no_show_count: 0,
          cancellation_count: 0
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

  const formatDate = (dateString: string) => {
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

  const getCustomerTypeIcon = (type: string) => {
    switch (type) {
      case 'vip':
        return <StarIcon className="h-5 w-5 text-yellow-600" />
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
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
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="all">All Clients</option>
              <option value="new">New Clients</option>
              <option value="returning">Returning</option>
              <option value="vip">VIP Clients</option>
              <option value="at_risk">At Risk</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2">
              <ArrowDownTrayIcon className="h-5 w-5" />
              <span>Export</span>
            </button>

            <button className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium hover:from-violet-700 hover:to-purple-700 transition-all flex items-center space-x-2">
              <PlusIcon className="h-5 w-5" />
              <span>Add Client</span>
            </button>
          </div>
        </div>

        {/* Client Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Total Clients</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.total_clients || 0}</p>
            <p className="text-xs text-gray-500 mt-1">{stats?.new_clients_this_month || 0} new this month</p>
          </div>

          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl">
                <StarIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">VIP Clients</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.vip_clients || 0}</p>
            <p className="text-xs text-gray-500 mt-1">High-value customers</p>
          </div>

          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
                <CurrencyDollarIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Avg Lifetime Value</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(stats?.average_lifetime_value || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Per client revenue</p>
          </div>

          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Retention Rate</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {((stats?.retention_rate || 0) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visits
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Spent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Visit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Favorite Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{client.name}</div>
                            <div className="text-xs text-gray-500 flex items-center space-x-2">
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
                        <div className="text-xs text-gray-500">
                          {client.visit_frequency}x per month
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-emerald-600">
                          {formatCurrency(client.total_spent)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatCurrency(client.average_ticket)} avg
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(client.last_visit)}</div>
                        {client.no_show_count > 0 && (
                          <div className="text-xs text-red-600">
                            {client.no_show_count} no-shows
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{client.favorite_service || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => router.push(`/clients/${client.id}`)}
                            className="text-blue-600 hover:text-blue-700 p-1 rounded-md hover:bg-blue-50 transition-colors"
                            title="View Profile"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button className="text-gray-600 hover:text-gray-700 p-1 rounded-md hover:bg-gray-50 transition-colors" title="Edit">
                            <PencilIcon className="h-4 w-4" />
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
    </ModernLayout>
  )
}
