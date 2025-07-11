'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getClients, deleteClient, updateCustomerType, searchClients, type Client } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import VirtualList from '@/components/VirtualList'
import { EmptyClients } from '@/components/ui/empty-state'
import { ConfirmDialog, useConfirmDialog } from '@/components/ui/confirm-dialog'
import { SkeletonTable } from '@/components/ui/skeleton-loader'

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [customerTypeFilter, setCustomerTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  
  // Virtual scrolling threshold
  const VIRTUAL_SCROLLING_THRESHOLD = 100
  const shouldUseVirtualScrolling = clients.length > VIRTUAL_SCROLLING_THRESHOLD

  useEffect(() => {
    loadClients()
  }, [page, customerTypeFilter])

  const loadClients = async () => {
    try {
      setLoading(true)
      const data = await getClients({
        page,
        page_size: 20,
        search: search || undefined,
        customer_type: customerTypeFilter || undefined
      })
      setClients(data.clients)
      setTotalPages(Math.ceil(data.total / 20))
    } catch (err: any) {
      if (err.message.includes('401') || err.message.includes('403')) {
        router.push('/login')
      } else {
        setError('Failed to load clients')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadClients()
  }

  const handleCustomerTypeChange = async (clientId: number, newType: string) => {
    try {
      await updateCustomerType(clientId, newType)
      loadClients()
    } catch (err) {
      setError('Failed to update customer type')
    }
  }

  const { confirm, ConfirmDialog } = useConfirmDialog()

  const handleDeleteClient = async (clientId: number) => {
    const clientName = clients.find(c => c.id === clientId)?.first_name || 'this client'
    
    const confirmed = await confirm({
      title: 'Delete Client',
      description: `Are you sure you want to delete ${clientName}? This will remove all their appointment history and cannot be undone.`,
      confirmText: 'Delete Client',
      variant: 'danger'
    })

    if (confirmed) {
      try {
        await deleteClient(clientId)
        loadClients()
      } catch (err: any) {
        if (err.message.includes('403')) {
          setError('Only admins can delete clients')
        } else {
          setError('Failed to delete client')
        }
      }
    }
  }

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case 'vip': return 'text-purple-600 bg-purple-50'
      case 'at_risk': return 'text-red-600 bg-red-50'
      case 'returning': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Prepare clients with heights for virtual scrolling
  const clientsWithHeights = clients.map(client => ({
    ...client,
    height: 80 // Standard row height
  }))

  // Virtual client item renderer
  const renderVirtualClient = (client: Client & { height?: number }, index: number, style: React.CSSProperties) => {
    return (
      <div className="border-b border-gray-200 hover:bg-gray-50 transition-colors" style={style}>
        <div className="px-6 py-4 flex items-center">
          <div className="flex-1 min-w-0">
            <Link
              href={`/clients/${client.id}`}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              {client.first_name} {client.last_name}
            </Link>
          </div>
          <div className="flex-1 min-w-0 text-sm text-gray-500">
            <div>{client.email}</div>
            {client.phone && <div>{client.phone}</div>}
          </div>
          <div className="flex-1 min-w-0">
            <select
              value={client.customer_type}
              onChange={(e) => handleCustomerTypeChange(client.id, e.target.value)}
              className={`text-sm font-medium px-2 py-1 rounded-full border-0 ${getCustomerTypeColor(client.customer_type)}`}
            >
              <option value="new">New</option>
              <option value="returning">Returning</option>
              <option value="vip">VIP</option>
              <option value="at_risk">At Risk</option>
            </select>
          </div>
          <div className="flex-1 min-w-0 text-sm text-gray-900">
            {client.total_visits}
          </div>
          <div className="flex-1 min-w-0 text-sm text-gray-900">
            ${client.total_spent.toFixed(2)}
          </div>
          <div className="flex-1 min-w-0 text-sm font-medium">
            <Link
              href={`/clients/${client.id}`}
              className="text-blue-600 hover:text-blue-900 mr-4"
            >
              View
            </Link>
            <button
              onClick={() => handleDeleteClient(client.id)}
              className="text-red-600 hover:text-red-900"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="flex min-h-screen flex-col p-8">
      <div className="max-w-7xl w-full mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-600 mt-2">Manage your client database</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/clients/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Client
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <select
              value={customerTypeFilter}
              onChange={(e) => setCustomerTypeFilter(e.target.value)}
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="new">New</option>
              <option value="returning">Returning</option>
              <option value="vip">VIP</option>
              <option value="at_risk">At Risk</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Search
            </button>
          </form>
        </div>

        {/* Clients Table */}
        {loading ? (
          <SkeletonTable rows={5} columns={6} />
        ) : error ? (
          <Card className="p-8">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => loadClients()} variant="outline">
                Try Again
              </Button>
            </div>
          </Card>
        ) : clients.length === 0 ? (
          <Card className="p-8">
            <EmptyClients onAddClient={() => router.push('/clients/new')} />
          </Card>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {/* Table Header */}
              <div className="bg-gray-50 px-6 py-3">
                <div className="flex items-center">
                  <div className="flex-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </div>
                  <div className="flex-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </div>
                  <div className="flex-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </div>
                  <div className="flex-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visits
                  </div>
                  <div className="flex-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </div>
                  <div className="flex-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </div>
                </div>
              </div>

              {/* Virtual or Standard Table Body */}
              {shouldUseVirtualScrolling ? (
                <div className="relative">
                  <div className="mb-2 px-6 py-2 bg-blue-50 text-blue-700 text-sm">
                    📊 Virtual scrolling active - {clients.length} clients loaded
                  </div>
                  <VirtualList
                    items={clientsWithHeights}
                    containerHeight={600} // Fixed height for virtual scrolling
                    itemHeight={80}
                    renderItem={renderVirtualClient}
                    className="border-t border-gray-200"
                    overscan={5}
                  />
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {clients.map((client) => (
                    <div key={client.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center">
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/clients/${client.id}`}
                            className="text-blue-600 hover:text-blue-500 font-medium"
                          >
                            {client.first_name} {client.last_name}
                          </Link>
                        </div>
                        <div className="flex-1 min-w-0 text-sm text-gray-500">
                          <div>{client.email}</div>
                          {client.phone && <div>{client.phone}</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <select
                            value={client.customer_type}
                            onChange={(e) => handleCustomerTypeChange(client.id, e.target.value)}
                            className={`text-sm font-medium px-2 py-1 rounded-full border-0 ${getCustomerTypeColor(client.customer_type)}`}
                          >
                            <option value="new">New</option>
                            <option value="returning">Returning</option>
                            <option value="vip">VIP</option>
                            <option value="at_risk">At Risk</option>
                          </select>
                        </div>
                        <div className="flex-1 min-w-0 text-sm text-gray-900">
                          {client.total_visits}
                        </div>
                        <div className="flex-1 min-w-0 text-sm text-gray-900">
                          ${client.total_spent.toFixed(2)}
                        </div>
                        <div className="flex-1 min-w-0 text-sm font-medium">
                          <Link
                            href={`/clients/${client.id}`}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog />
    </main>
  )
}