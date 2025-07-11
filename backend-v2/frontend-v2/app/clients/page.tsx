'use client'

import { useState, useCallback } from 'react'
import { AccessibleButton } from '@/lib/accessibility-helpers'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { 
  UserGroupIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  PlusIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

// Mock client data - in real app this would come from API
const mockClients = [
  {
    id: 1,
    first_name: 'John',
    last_name: 'Smith',
    email: 'john@example.com',
    phone: '(555) 123-4567',
    total_appointments: 12,
    total_spent: 420,
    last_appointment: '2025-07-05T14:00:00.000Z',
    next_appointment: '2025-07-18T14:00:00.000Z',
    notes: 'Prefers classic cuts, regular client since 2023',
    status: 'active',
    preferred_barber: 'Alex Thompson',
    created_at: '2023-03-15T10:00:00.000Z'
  },
  {
    id: 2,
    first_name: 'Mike',
    last_name: 'Johnson',
    email: 'mike@example.com',
    phone: '(555) 234-5678',
    total_appointments: 8,
    total_spent: 280,
    last_appointment: '2025-06-28T15:30:00.000Z',
    next_appointment: null,
    notes: 'Likes beard trims, occasionally gets full service',
    status: 'active',
    preferred_barber: 'Jordan Martinez',
    created_at: '2023-08-20T11:00:00.000Z'
  },
  {
    id: 3,
    first_name: 'David',
    last_name: 'Wilson',
    email: 'david@example.com',
    phone: '(555) 345-6789',
    total_appointments: 15,
    total_spent: 975,
    last_appointment: '2025-07-08T16:30:00.000Z',
    next_appointment: '2025-07-22T16:30:00.000Z',
    notes: 'Premium client, always books full service packages',
    status: 'vip',
    preferred_barber: 'Alex Thompson',
    created_at: '2022-11-10T09:00:00.000Z'
  },
  {
    id: 4,
    first_name: 'Robert',
    last_name: 'Brown',
    email: 'robert@example.com',
    phone: '(555) 456-7890',
    total_appointments: 3,
    total_spent: 105,
    last_appointment: '2025-06-15T10:00:00.000Z',
    next_appointment: null,
    notes: 'New client, still exploring services',
    status: 'new',
    preferred_barber: null,
    created_at: '2025-05-20T14:00:00.000Z'
  },
  {
    id: 5,
    first_name: 'James',
    last_name: 'Miller',
    email: 'james@example.com',
    phone: '(555) 567-8901',
    total_appointments: 20,
    total_spent: 850,
    last_appointment: '2025-01-15T14:00:00.000Z',
    next_appointment: null,
    notes: 'Has not been back in 6 months, follow up needed',
    status: 'inactive',
    preferred_barber: 'Alex Thompson',
    created_at: '2022-06-05T12:00:00.000Z'
  }
]

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('name')

  // Filter and search clients
  const filteredClients = mockClients
    .filter(client => {
      const matchesSearch = searchTerm === '' || 
        `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm)
      
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
        case 'recent':
          return new Date(b.last_appointment).getTime() - new Date(a.last_appointment).getTime()
        case 'spent':
          return b.total_spent - a.total_spent
        case 'appointments':
          return b.total_appointments - a.total_appointments
        default:
          return 0
      }
    })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vip':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'new':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'vip':
        return 'VIP Client'
      case 'active':
        return 'Active'
      case 'new':
        return 'New Client'
      case 'inactive':
        return 'Inactive'
      default:
        return status
    }
  }

  const handleClientClick = (client: any) => {
    alert(`Client Details:\n${client.first_name} ${client.last_name}\n${client.email}\n${client.phone}\n\n${client.total_appointments} appointments\n$${client.total_spent} total spent\n\nNotes: ${client.notes}`)
  }

  const handleScheduleAppointment = (client: any) => {
    alert(`Schedule appointment for ${client.first_name} ${client.last_name}`)
  }

  const handleAddClient = () => {
    alert('Add new client form would open here')
  }

  const statusCounts = {
    all: mockClients.length,
    active: mockClients.filter(c => c.status === 'active').length,
    vip: mockClients.filter(c => c.status === 'vip').length,
    new: mockClients.filter(c => c.status === 'new').length,
    inactive: mockClients.filter(c => c.status === 'inactive').length
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <UserGroupIcon className="w-7 h-7 mr-3 text-purple-500" />
                Client Management
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your client relationships and booking history
              </p>
            </div>
            
            <AccessibleButton
              variant="primary"
              onClick={handleAddClient}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Client
            </AccessibleButton>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{statusCounts.all}</p>
                <p className="text-sm text-gray-600">Total Clients</p>
              </div>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{statusCounts.active}</p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{statusCounts.vip}</p>
                <p className="text-sm text-gray-600">VIP</p>
              </div>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{statusCounts.new}</p>
                <p className="text-sm text-gray-600">New</p>
              </div>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">{statusCounts.inactive}</p>
                <p className="text-sm text-gray-600">Inactive</p>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="vip">VIP</option>
                <option value="new">New</option>
                <option value="inactive">Inactive</option>
              </select>
              
              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="name">Sort by Name</option>
                <option value="recent">Most Recent</option>
                <option value="spent">Highest Spent</option>
                <option value="appointments">Most Appointments</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Client List */}
        <div className="space-y-4">
          {filteredClients.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? 'Try adjusting your search or filters.' : 'Start building your client base by adding your first client.'}
                </p>
                {!searchTerm && (
                  <AccessibleButton variant="primary" onClick={handleAddClient}>
                    Add Your First Client
                  </AccessibleButton>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredClients.map((client) => (
              <Card key={client.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        {/* Avatar */}
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-lg font-medium text-gray-600">
                            {client.first_name[0]}{client.last_name[0]}
                          </span>
                        </div>
                        
                        {/* Client Info */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {client.first_name} {client.last_name}
                            </h3>
                            <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(client.status)}`}>
                              {getStatusLabel(client.status)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-600">
                            <div className="flex items-center">
                              <EnvelopeIcon className="w-4 h-4 mr-1" />
                              {client.email}
                            </div>
                            <div className="flex items-center">
                              <PhoneIcon className="w-4 h-4 mr-1" />
                              {client.phone}
                            </div>
                            <div>
                              <strong>{client.total_appointments}</strong> appointments
                            </div>
                            <div>
                              <strong>${client.total_spent}</strong> total spent
                            </div>
                          </div>
                          
                          {client.last_appointment && (
                            <div className="mt-2 text-sm text-gray-500">
                              Last visit: {format(new Date(client.last_appointment), 'MMM d, yyyy')}
                              {client.next_appointment && (
                                <span className="ml-4 text-blue-600">
                                  Next: {format(new Date(client.next_appointment), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          )}
                          
                          {client.notes && (
                            <div className="mt-2 text-sm text-gray-600 italic">
                              "{client.notes}"
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      <AccessibleButton
                        variant="secondary"
                        onClick={() => handleClientClick(client)}
                        className="text-sm"
                      >
                        View Details
                      </AccessibleButton>
                      <AccessibleButton
                        variant="primary"
                        onClick={() => handleScheduleAppointment(client)}
                        className="text-sm"
                      >
                        <CalendarDaysIcon className="w-4 h-4 mr-1" />
                        Schedule
                      </AccessibleButton>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Results summary */}
        {filteredClients.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Showing {filteredClients.length} of {mockClients.length} clients
          </div>
        )}
      </div>
    </div>
  )
}