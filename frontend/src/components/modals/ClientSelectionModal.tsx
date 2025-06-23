'use client'

import { useState, useEffect, useMemo } from 'react'
import BaseModal from './BaseModal'
import {
  MagnifyingGlassIcon,
  UserIcon,
  PlusIcon,
  PhoneIcon,
  EnvelopeIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface Client {
  id: string
  name: string
  email: string
  phone?: string
  lastVisit?: string
  totalVisits?: number
  notes?: string
  avatar?: string
}

interface ClientSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (client: Client) => void
  selectedClientId?: string
}

// Mock client data
const mockClients: Client[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '(555) 123-4567',
    lastVisit: '2024-06-15',
    totalVisits: 12,
    notes: 'Prefers shorter cuts, allergic to certain products'
  },
  {
    id: '2',
    name: 'David Rodriguez',
    email: 'david.rodriguez@email.com',
    phone: '(555) 234-5678',
    lastVisit: '2024-06-10',
    totalVisits: 8,
    notes: 'Regular beard trim customer'
  },
  {
    id: '3',
    name: 'Michael Brown',
    email: 'michael.brown@email.com',
    phone: '(555) 345-6789',
    lastVisit: '2024-05-28',
    totalVisits: 5,
    notes: 'New client, prefers classic styles'
  },
  {
    id: '4',
    name: 'James Wilson',
    email: 'james.wilson@email.com',
    phone: '(555) 456-7890',
    lastVisit: '2024-06-01',
    totalVisits: 15,
    notes: 'VIP client, books monthly appointments'
  },
  {
    id: '5',
    name: 'Robert Johnson',
    email: 'robert.johnson@email.com',
    phone: '(555) 567-8901',
    lastVisit: '2024-06-08',
    totalVisits: 3,
    notes: 'Prefers evening appointments'
  },
  {
    id: '6',
    name: 'William Davis',
    email: 'william.davis@email.com',
    phone: '(555) 678-9012',
    lastVisit: '2024-05-20',
    totalVisits: 7,
    notes: 'Regular fade customer'
  },
  {
    id: '7',
    name: 'Christopher Miller',
    email: 'chris.miller@email.com',
    phone: '(555) 789-0123',
    lastVisit: '2024-06-12',
    totalVisits: 9,
    notes: 'Brings kids for appointments'
  },
  {
    id: '8',
    name: 'Matthew Anderson',
    email: 'matt.anderson@email.com',
    phone: '(555) 890-1234',
    lastVisit: '2024-06-05',
    totalVisits: 6,
    notes: 'Business professional, quick appointments'
  }
]

export default function ClientSelectionModal({
  isOpen,
  onClose,
  onSelect,
  selectedClientId
}: ClientSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>(mockClients)

  // Filter clients based on search term
  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clients

    const searchLower = searchTerm.toLowerCase()
    return clients.filter(client =>
      client.name.toLowerCase().includes(searchLower) ||
      client.email.toLowerCase().includes(searchLower) ||
      client.phone?.includes(searchTerm)
    )
  }, [clients, searchTerm])

  // Recent clients (last 30 days)
  const recentClients = useMemo(() => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    return clients
      .filter(client => client.lastVisit && new Date(client.lastVisit) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.lastVisit!).getTime() - new Date(a.lastVisit!).getTime())
      .slice(0, 5)
  }, [clients])

  // Frequent clients (more than 5 visits)
  const frequentClients = useMemo(() => {
    return clients
      .filter(client => client.totalVisits && client.totalVisits > 5)
      .sort((a, b) => (b.totalVisits || 0) - (a.totalVisits || 0))
      .slice(0, 5)
  }, [clients])

  const formatLastVisit = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  const handleClientSelect = (client: Client) => {
    onSelect(client)
    onClose()
  }

  const getClientInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const ClientCard = ({ client, isSelected = false }: { client: Client; isSelected?: boolean }) => (
    <div
      onClick={() => handleClientSelect(client)}
      className={`
        relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
        ${isSelected
          ? 'border-teal-500 bg-teal-50'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }
      `}
    >
      <div className="flex items-start space-x-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {client.avatar ? (
            <img
              src={client.avatar}
              alt={client.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-semibold text-sm">
              {getClientInitials(client.name)}
            </div>
          )}
        </div>

        {/* Client Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900 truncate">{client.name}</h4>
            {isSelected && (
              <CheckCircleIcon className="h-5 w-5 text-teal-600 flex-shrink-0" />
            )}
          </div>

          <div className="mt-1 space-y-1">
            <div className="flex items-center text-sm text-gray-600">
              <EnvelopeIcon className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>

            {client.phone && (
              <div className="flex items-center text-sm text-gray-600">
                <PhoneIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                <span>{client.phone}</span>
              </div>
            )}
          </div>

          {/* Visit Info */}
          <div className="mt-2 flex items-center justify-between text-xs">
            {client.lastVisit && (
              <span className="text-gray-500">
                Last visit: {formatLastVisit(client.lastVisit)}
              </span>
            )}
            {client.totalVisits && (
              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                {client.totalVisits} visits
              </span>
            )}
          </div>

          {/* Notes */}
          {client.notes && (
            <p className="mt-2 text-xs text-gray-500 line-clamp-2">
              {client.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Client"
      size="2xl"
    >
      <div className="space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="premium-input w-full pl-10"
            placeholder="Search clients by name, email, or phone..."
          />
        </div>

        {/* Add New Client Button */}
        <button
          onClick={() => {
            // In a real app, this would open a "Create New Client" modal
            console.log('Add new client')
          }}
          className="w-full flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-teal-400 hover:text-teal-600 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Add New Client</span>
        </button>

        {/* Search Results or Categories */}
        <div className="max-h-96 overflow-y-auto space-y-6">
          {searchTerm ? (
            // Search Results
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Search Results ({filteredClients.length})
              </h3>
              {filteredClients.length > 0 ? (
                <div className="space-y-3">
                  {filteredClients.map((client) => (
                    <ClientCard
                      key={client.id}
                      client={client}
                      isSelected={selectedClientId === client.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">No clients found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No clients match your search criteria.
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Categories
            <>
              {/* Recent Clients */}
              {recentClients.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Recent Clients
                  </h3>
                  <div className="space-y-3">
                    {recentClients.map((client) => (
                      <ClientCard
                        key={client.id}
                        client={client}
                        isSelected={selectedClientId === client.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Frequent Clients */}
              {frequentClients.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Frequent Clients
                  </h3>
                  <div className="space-y-3">
                    {frequentClients.map((client) => (
                      <ClientCard
                        key={client.id}
                        client={client}
                        isSelected={selectedClientId === client.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All Clients */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  All Clients ({clients.length})
                </h3>
                <div className="space-y-3">
                  {clients
                    .filter(client =>
                      !recentClients.some(rc => rc.id === client.id) &&
                      !frequentClients.some(fc => fc.id === client.id)
                    )
                    .map((client) => (
                      <ClientCard
                        key={client.id}
                        client={client}
                        isSelected={selectedClientId === client.id}
                      />
                    ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="premium-button-secondary text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </BaseModal>
  )
}
