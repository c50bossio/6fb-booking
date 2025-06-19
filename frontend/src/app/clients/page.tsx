'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import axios from 'axios'
import {
  ArrowLeftIcon,
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
  PencilIcon
} from '@heroicons/react/24/outline'

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
  const [currentTime, setCurrentTime] = useState(new Date())
  const router = useRouter()

  useEffect(() => {
    fetchClientsData()
  }, [searchTerm, filterType, currentPage])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchClientsData = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const headers = { Authorization: `Bearer ${token}` }
      const params: any = {
        page: currentPage,
        limit: 20
      }

      if (searchTerm) params.search = searchTerm
      if (filterType !== 'all') params.customer_type = filterType

      const [clientsRes, retentionRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/clients`, { headers, params }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/analytics/retention`, { headers })
      ])

      setClients(clientsRes.data.clients || [])
      setTotalPages(clientsRes.data.total_pages || 1)

      // Calculate stats from retention data and client list
      const clientsData = clientsRes.data.clients || []
      const retentionData = retentionRes.data

      const stats: ClientStats = {
        total_clients: clientsRes.data.total_clients || clientsData.length,
        new_clients_this_month: clientsData.filter((c: Client) => c.customer_type === 'new').length,
        vip_clients: clientsData.filter((c: Client) => c.customer_type === 'vip').length,
        at_risk_clients: clientsData.filter((c: Client) => c.customer_type === 'at_risk').length,
        average_lifetime_value: retentionData?.average_lifetime_value || 0,
        retention_rate: retentionData?.overall_retention_rate || 0
      }
      setStats(stats)

    } catch (error) {
      console.error('Failed to fetch clients data:', error)
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
      new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      returning: 'bg-green-500/20 text-green-400 border-green-500/30',
      vip: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      at_risk: 'bg-red-500/20 text-red-400 border-red-500/30'
    }

    const labels = {
      new: 'New',
      returning: 'Returning',
      vip: 'VIP',
      at_risk: 'At Risk'
    }

    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${styles[type as keyof typeof styles] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
        {labels[type as keyof typeof labels] || type.toUpperCase()}
      </span>
    )
  }

  const getCustomerTypeIcon = (type: string) => {
    switch (type) {
      case 'vip':
        return <StarIcon className="h-5 w-5 text-yellow-500" />
      case 'at_risk':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      default:
        return <UserGroupIcon className="h-5 w-5 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading clients...</p>
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
                href="/dashboard"
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
                <h1 className="text-xl font-bold text-white">Client Management</h1>
                <p className="text-xs text-gray-400">Customer Relationships & Retention</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Client
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
        {/* Client Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Clients</p>
                <p className="text-2xl font-bold text-white">{stats?.total_clients || 0}</p>
                <p className="text-xs text-gray-500 mt-1">{stats?.new_clients_this_month || 0} new this month</p>
              </div>
              <UserGroupIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">VIP Clients</p>
                <p className="text-2xl font-bold text-yellow-400">{stats?.vip_clients || 0}</p>
                <p className="text-xs text-gray-500 mt-1">High-value customers</p>
              </div>
              <StarIcon className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Avg Lifetime Value</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(stats?.average_lifetime_value || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Per client revenue</p>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Retention Rate</p>
                <p className="text-2xl font-bold text-white">
                  {((stats?.retention_rate || 0) * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.at_risk_clients || 0} at risk
                </p>
              </div>
              <CalendarIcon className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            <div className="relative">
              <FunnelIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="pl-10 pr-8 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Clients</option>
                <option value="new">New Clients</option>
                <option value="returning">Returning Clients</option>
                <option value="vip">VIP Clients</option>
                <option value="at_risk">At Risk Clients</option>
              </select>
            </div>
          </div>
        </div>

        {/* Clients List */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">
              Clients ({clients.length} of {stats?.total_clients || 0})
            </h3>
          </div>

          {clients.length === 0 ? (
            <div className="p-12 text-center">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-600" />
              <h3 className="mt-2 text-sm font-medium text-gray-300">No clients found</h3>
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
                  <tr className="border-b border-gray-700">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Visits
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Total Spent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Last Visit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Favorite Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">{client.name}</div>
                            <div className="text-xs text-gray-400 flex items-center space-x-2">
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
                        <div className="text-sm text-white">{client.total_visits}</div>
                        <div className="text-xs text-gray-400">
                          {client.visit_frequency}x per month
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-400">
                          {formatCurrency(client.total_spent)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatCurrency(client.average_ticket)} avg
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{formatDate(client.last_visit)}</div>
                        {client.no_show_count > 0 && (
                          <div className="text-xs text-red-400">
                            {client.no_show_count} no-shows
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{client.favorite_service || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => router.push(`/clients/${client.id}`)}
                            className="text-blue-400 hover:text-blue-300"
                            title="View Profile"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button className="text-gray-400 hover:text-gray-300" title="Edit">
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
            <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}