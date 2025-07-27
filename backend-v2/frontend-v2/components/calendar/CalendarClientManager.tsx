'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import {
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarDaysIcon,
  ClockIcon,
  CurrencyDollarIcon,
  StarIcon,
  PencilIcon,
  EyeIcon,
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolid, StarIcon as StarSolid } from '@heroicons/react/24/solid'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import ClientHistory from '@/components/ClientHistory'
import ClientNotes from '@/components/ClientNotes'

interface Client {
  id: number
  first_name: string
  last_name: string
  email: string
  phone?: string
  address?: string
  date_of_birth?: string
  preferred_services?: string[]
  notes?: string
  created_at: string
  last_appointment?: string
  total_appointments: number
  total_revenue: number
  average_rating?: number
  is_vip?: boolean
  is_favorite?: boolean
  loyalty_points?: number
  referral_count?: number
  preferred_barber_id?: number
  communication_preferences?: {
    email: boolean
    sms: boolean
    calls: boolean
  }
  emergency_contact?: {
    name: string
    phone: string
    relationship: string
  }
  profile_image?: string
  tags: string[]
  status: 'active' | 'inactive' | 'blocked'
}

interface Appointment {
  id: number
  client_id: number
  start_time: string
  end_time: string
  service_name: string
  service_id: number
  barber_id: number
  barber_name: string
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  price: number
  notes?: string
  created_at: string
  client?: Client
}

interface CalendarClientManagerProps {
  selectedDate?: Date
  selectedAppointment?: Appointment | null
  clients?: Client[]
  appointments?: Appointment[]
  onClientSelect?: (client: Client) => void
  onCreateAppointment?: (clientId: number) => void
  onUpdateClient?: (client: Client) => void
  onViewClientHistory?: (clientId: number) => void
  className?: string
  isVisible?: boolean
}

export default function CalendarClientManager({
  selectedDate,
  selectedAppointment,
  clients = [],
  appointments = [],
  onClientSelect,
  onCreateAppointment,
  onUpdateClient,
  onViewClientHistory,
  className,
  isVisible = true
}: CalendarClientManagerProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'notes'>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'vip' | 'new'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'last_appointment' | 'total_revenue' | 'total_appointments'>('name')
  const [showFilters, setShowFilters] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Mock client data for demonstration
  const mockClients: Client[] = [
    {
      id: 1,
      first_name: 'John',
      last_name: 'Smith',
      email: 'john.smith@email.com',
      phone: '+1 (555) 123-4567',
      address: '123 Main St, City, State 12345',
      date_of_birth: '1985-06-15',
      preferred_services: ['Haircut', 'Beard Trim'],
      created_at: '2024-01-15T10:30:00Z',
      last_appointment: '2024-06-20T14:00:00Z',
      total_appointments: 12,
      total_revenue: 840.00,
      average_rating: 4.8,
      is_vip: true,
      is_favorite: false,
      loyalty_points: 250,
      referral_count: 3,
      preferred_barber_id: 1,
      communication_preferences: { email: true, sms: true, calls: false },
      profile_image: '/avatars/john-smith.jpg',
      tags: ['VIP', 'Regular', 'Referrer'],
      status: 'active'
    },
    {
      id: 2,
      first_name: 'Sarah',
      last_name: 'Johnson',
      email: 'sarah.johnson@email.com',
      phone: '+1 (555) 987-6543',
      created_at: '2024-03-10T09:15:00Z',
      last_appointment: '2024-06-18T11:30:00Z',
      total_appointments: 8,
      total_revenue: 480.00,
      average_rating: 4.9,
      is_vip: false,
      is_favorite: true,
      loyalty_points: 120,
      referral_count: 1,
      communication_preferences: { email: true, sms: false, calls: true },
      tags: ['Favorite', 'Punctual'],
      status: 'active'
    },
    {
      id: 3,
      first_name: 'Mike',
      last_name: 'Wilson',
      email: 'mike.wilson@email.com',
      phone: '+1 (555) 456-7890',
      created_at: '2024-06-01T16:45:00Z',
      last_appointment: null,
      total_appointments: 0,
      total_revenue: 0,
      is_vip: false,
      is_favorite: false,
      loyalty_points: 0,
      referral_count: 0,
      communication_preferences: { email: true, sms: true, calls: false },
      tags: ['New Client'],
      status: 'active'
    }
  ]

  const [currentClients, setCurrentClients] = useState<Client[]>(mockClients)
  const [filteredClients, setFilteredClients] = useState<Client[]>(mockClients)

  // Filter and search logic
  useEffect(() => {
    let filtered = [...currentClients]

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(client =>
        client.first_name.toLowerCase().includes(search) ||
        client.last_name.toLowerCase().includes(search) ||
        client.email.toLowerCase().includes(search) ||
        client.phone?.includes(searchTerm) ||
        client.tags.some(tag => tag.toLowerCase().includes(search))
      )
    }

    // Status filter
    if (filterStatus !== 'all') {
      switch (filterStatus) {
        case 'active':
          filtered = filtered.filter(client => client.status === 'active' && client.total_appointments > 0)
          break
        case 'vip':
          filtered = filtered.filter(client => client.is_vip || client.is_favorite)
          break
        case 'new':
          filtered = filtered.filter(client => client.total_appointments === 0)
          break
      }
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
        case 'last_appointment':
          const aDate = a.last_appointment ? new Date(a.last_appointment) : new Date(0)
          const bDate = b.last_appointment ? new Date(b.last_appointment) : new Date(0)
          return bDate.getTime() - aDate.getTime()
        case 'total_revenue':
          return b.total_revenue - a.total_revenue
        case 'total_appointments':
          return b.total_appointments - a.total_appointments
        default:
          return 0
      }
    })

    setFilteredClients(filtered)
  }, [currentClients, searchTerm, filterStatus, sortBy])

  // Auto-select client from appointment
  useEffect(() => {
    if (selectedAppointment?.client) {
      setSelectedClient(selectedAppointment.client)
    }
  }, [selectedAppointment])

  const handleClientSelect = useCallback((client: Client) => {
    setSelectedClient(client)
    onClientSelect?.(client)
  }, [onClientSelect])

  const handleCreateAppointment = useCallback((clientId: number) => {
    onCreateAppointment?.(clientId)
  }, [onCreateAppointment])

  const toggleFavorite = useCallback((clientId: number) => {
    setCurrentClients(prev => prev.map(client =>
      client.id === clientId
        ? { ...client, is_favorite: !client.is_favorite }
        : client
    ))
  }, [])

  const getClientStatusColor = (client: Client) => {
    if (client.is_vip) return 'text-purple-600 bg-purple-50 border-purple-200'
    if (client.is_favorite) return 'text-pink-600 bg-pink-50 border-pink-200'
    if (client.total_appointments === 0) return 'text-blue-600 bg-blue-50 border-blue-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  const getClientStatusIcon = (client: Client) => {
    if (client.is_vip) return <StarSolid className="h-3 w-3" />
    if (client.is_favorite) return <HeartSolid className="h-3 w-3" />
    if (client.total_appointments === 0) return <PlusIcon className="h-3 w-3" />
    return <CheckCircleIcon className="h-3 w-3" />
  }

  const formatLastAppointment = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = parseISO(dateString)
    if (!isValid(date)) return 'Invalid date'
    return format(date, 'MMM d, yyyy')
  }

  const getUpcomingAppointments = (clientId: number) => {
    const now = new Date()
    return appointments.filter(apt => 
      apt.client_id === clientId && 
      new Date(apt.start_time) > now &&
      apt.status !== 'cancelled'
    )
  }

  if (!isVisible) return null

  return (
    <div className={cn("flex flex-col h-full bg-gray-50", className)}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Client Management</h2>
            <p className="text-sm text-gray-600">
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Manage your clients'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search clients..."
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Clients</option>
                <option value="active">Active Clients</option>
                <option value="vip">VIP & Favorites</option>
                <option value="new">New Clients</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="name">Name</option>
                <option value="last_appointment">Last Appointment</option>
                <option value="total_revenue">Total Revenue</option>
                <option value="total_appointments">Total Appointments</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Client List */}
        <div className="w-1/3 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <div className="space-y-2">
              {filteredClients.length === 0 ? (
                <div className="text-center py-8">
                  <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No clients found</p>
                </div>
              ) : (
                filteredClients.map((client) => {
                  const upcomingAppointments = getUpcomingAppointments(client.id)
                  const isSelected = selectedClient?.id === client.id
                  
                  return (
                    <div
                      key={client.id}
                      onClick={() => handleClientSelect(client)}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-10 w-10">
                          {client.profile_image && <AvatarImage src={client.profile_image} />}
                          <AvatarFallback className="text-sm font-medium">
                            {client.first_name.charAt(0)}{client.last_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900 text-sm truncate">
                              {client.first_name} {client.last_name}
                            </h3>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleFavorite(client.id)
                              }}
                              className="text-gray-400 hover:text-pink-500 transition-colors"
                            >
                              {client.is_favorite ? (
                                <HeartSolid className="h-4 w-4 text-pink-500" />
                              ) : (
                                <HeartIcon className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge 
                              variant="secondary" 
                              className={cn("text-xs", getClientStatusColor(client))}
                            >
                              {getClientStatusIcon(client)}
                              <span className="ml-1">
                                {client.is_vip ? 'VIP' : 
                                 client.is_favorite ? 'Favorite' : 
                                 client.total_appointments === 0 ? 'New' : 'Active'}
                              </span>
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-gray-500 mt-1">
                            Last: {formatLastAppointment(client.last_appointment)}
                          </p>
                          
                          {upcomingAppointments.length > 0 && (
                            <p className="text-xs text-blue-600 mt-1">
                              {upcomingAppointments.length} upcoming
                            </p>
                          )}
                          
                          <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                            <span>{client.total_appointments} appointments</span>
                            <span>${client.total_revenue.toFixed(0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Client Details */}
        <div className="flex-1 overflow-y-auto">
          {selectedClient ? (
            <div className="p-6">
              {/* Client Header */}
              <div className="bg-white rounded-lg border p-6 mb-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      {selectedClient.profile_image && <AvatarImage src={selectedClient.profile_image} />}
                      <AvatarFallback className="text-lg font-semibold">
                        {selectedClient.first_name.charAt(0)}{selectedClient.last_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        {selectedClient.first_name} {selectedClient.last_name}
                      </h1>
                      <div className="flex items-center space-x-2 mt-1">
                        {selectedClient.is_vip && (
                          <Badge className="bg-purple-100 text-purple-800">
                            <StarSolid className="h-3 w-3 mr-1" />
                            VIP
                          </Badge>
                        )}
                        {selectedClient.is_favorite && (
                          <Badge className="bg-pink-100 text-pink-800">
                            <HeartSolid className="h-3 w-3 mr-1" />
                            Favorite
                          </Badge>
                        )}
                        {selectedClient.total_appointments === 0 && (
                          <Badge className="bg-blue-100 text-blue-800">
                            <PlusIcon className="h-3 w-3 mr-1" />
                            New Client
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <EnvelopeIcon className="h-4 w-4 mr-1" />
                          {selectedClient.email}
                        </div>
                        {selectedClient.phone && (
                          <div className="flex items-center">
                            <PhoneIcon className="h-4 w-4 mr-1" />
                            {selectedClient.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCreateAppointment(selectedClient.id)}
                    >
                      <CalendarDaysIcon className="h-4 w-4 mr-2" />
                      Book Appointment
                    </Button>
                    <Button variant="outline" size="sm">
                      <PencilIcon className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-4 mt-6">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{selectedClient.total_appointments}</div>
                    <div className="text-sm text-blue-700">Appointments</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">${selectedClient.total_revenue.toFixed(0)}</div>
                    <div className="text-sm text-green-700">Total Revenue</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {selectedClient.average_rating?.toFixed(1) || 'N/A'}
                    </div>
                    <div className="text-sm text-yellow-700">Avg Rating</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{selectedClient.loyalty_points || 0}</div>
                    <div className="text-sm text-purple-700">Loyalty Points</div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-white rounded-lg border">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-6">
                    {[
                      { id: 'overview', label: 'Overview', icon: EyeIcon },
                      { id: 'history', label: 'History', icon: ClockIcon },
                      { id: 'notes', label: 'Notes', icon: PencilIcon }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                          "flex items-center py-4 px-1 border-b-2 font-medium text-sm",
                          activeTab === tab.id
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        )}
                      >
                        <tab.icon className="h-4 w-4 mr-2" />
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-6">
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Contact Information */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium text-gray-700">Email</label>
                              <p className="text-sm text-gray-900">{selectedClient.email}</p>
                            </div>
                            {selectedClient.phone && (
                              <div>
                                <label className="text-sm font-medium text-gray-700">Phone</label>
                                <p className="text-sm text-gray-900">{selectedClient.phone}</p>
                              </div>
                            )}
                            {selectedClient.address && (
                              <div>
                                <label className="text-sm font-medium text-gray-700">Address</label>
                                <p className="text-sm text-gray-900">{selectedClient.address}</p>
                              </div>
                            )}
                          </div>
                          <div className="space-y-3">
                            {selectedClient.date_of_birth && (
                              <div>
                                <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                                <p className="text-sm text-gray-900">
                                  {format(parseISO(selectedClient.date_of_birth), 'MMMM d, yyyy')}
                                </p>
                              </div>
                            )}
                            <div>
                              <label className="text-sm font-medium text-gray-700">Client Since</label>
                              <p className="text-sm text-gray-900">
                                {format(parseISO(selectedClient.created_at), 'MMMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Preferences */}
                      {selectedClient.preferred_services && selectedClient.preferred_services.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferred Services</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedClient.preferred_services.map((service, index) => (
                              <Badge key={index} variant="outline">
                                {service}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {selectedClient.tags.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedClient.tags.map((tag, index) => (
                              <Badge key={index} className="bg-gray-100 text-gray-800">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Communication Preferences */}
                      {selectedClient.communication_preferences && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Communication Preferences</h3>
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedClient.communication_preferences.email}
                                readOnly
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">Email notifications</span>
                            </div>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedClient.communication_preferences.sms}
                                readOnly
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">SMS notifications</span>
                            </div>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedClient.communication_preferences.calls}
                                readOnly
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">Phone calls</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'history' && (
                    <ClientHistory
                      clientId={selectedClient.id}
                      client={selectedClient}
                      history={null}
                      onRefresh={() => {}}
                    />
                  )}

                  {activeTab === 'notes' && (
                    <ClientNotes
                      clientId={selectedClient.id}
                      client={selectedClient}
                      onRefresh={() => {}}
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <UserIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Client Selected</h3>
                <p className="text-gray-600">Select a client from the list to view their details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="mx-4 mb-4">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            {error}
            <button
              onClick={() => setError('')}
              className="ml-2 text-red-600 hover:text-red-800"
            >
              <XMarkIcon className="h-4 w-4 inline" />
            </button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}