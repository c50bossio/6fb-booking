'use client'

import { useState, useEffect, useRef, memo } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { LoadingButton } from '@/components/LoadingStates'
import { searchClients, createClient, type Client } from '@/lib/api'
import { ChevronDownIcon, UserIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useDebounce } from '@/hooks/useDebounce'

interface ClientSelectorProps {
  selectedClient: Client | null
  onSelectClient: (client: Client | null) => void
  isPublicBooking?: boolean
  className?: string
}

interface NewClientData {
  first_name: string
  last_name: string
  email: string
  phone: string
}

export const ClientSelector = memo(function ClientSelector({
  selectedClient,
  onSelectClient,
  isPublicBooking = false,
  className = ''
}: ClientSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [showCreateClient, setShowCreateClient] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const [newClientData, setNewClientData] = useState<NewClientData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search function
  const searchClientsDebounced = useDebounce(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setClients([])
      return
    }

    try {
      setLoadingClients(true)
      const response = await searchClients(searchTerm)
      setClients(response.clients || [])
    } catch (err) {
      console.error('Failed to search clients:', err)
      setError('Failed to search clients')
    } finally {
      setLoadingClients(false)
    }
  }, 300)

  // Search clients when input changes
  useEffect(() => {
    if (clientSearch) {
      searchClientsDebounced(clientSearch)
    } else {
      setClients([])
    }
  }, [clientSearch, searchClientsDebounced])

  const handleCreateClient = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await createClient(newClientData)
      onSelectClient(response as Client)
      setShowCreateClient(false)
      setIsDropdownOpen(false)
      setNewClientData({ first_name: '', last_name: '', email: '', phone: '' })
    } catch (err) {
      console.error('Failed to create client:', err)
      setError('Failed to create client')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setShowCreateClient(false)
    setNewClientData({ first_name: '', last_name: '', email: '', phone: '' })
    setError(null)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-900 dark:text-white">
          Client {!isPublicBooking && '*'}
        </label>
        <Button
          type="button"
          onClick={() => {
            setIsDropdownOpen(true)
            setShowCreateClient(true)
          }}
          variant="primary"
          size="lg"
          className="px-8 py-3 text-base font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 min-w-[160px]"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          New Client
        </Button>
      </div>
      
      {/* Show either the dropdown or the new client form */}
      {showCreateClient ? (
        <NewClientForm
          newClientData={newClientData}
          setNewClientData={setNewClientData}
          loading={loading}
          error={error}
          onSubmit={handleCreateClient}
          onCancel={resetForm}
        />
      ) : (
        <ClientDropdown
          ref={dropdownRef}
          isOpen={isDropdownOpen}
          setIsOpen={setIsDropdownOpen}
          selectedClient={selectedClient}
          onSelectClient={onSelectClient}
          clientSearch={clientSearch}
          setClientSearch={setClientSearch}
          clients={clients}
          loadingClients={loadingClients}
        />
      )}
    </div>
  )
})

// Separate component for the new client form
const NewClientForm = memo(function NewClientForm({
  newClientData,
  setNewClientData,
  loading,
  error,
  onSubmit,
  onCancel
}: {
  newClientData: NewClientData
  setNewClientData: (data: NewClientData) => void
  loading: boolean
  error: string | null
  onSubmit: () => void
  onCancel: () => void
}) {
  return (
    <div className="border-2 border-primary-200 dark:border-primary-800 rounded-lg p-6 bg-primary-50/50 dark:bg-primary-900/10 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New Client Details</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Fill in the information below</p>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
      
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              First name *
            </label>
            <Input
              placeholder="John"
              value={newClientData.first_name}
              onChange={(e) => setNewClientData({ ...newClientData, first_name: e.target.value })}
              className="bg-white dark:bg-gray-700"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Last name *
            </label>
            <Input
              placeholder="Doe"
              value={newClientData.last_name}
              onChange={(e) => setNewClientData({ ...newClientData, last_name: e.target.value })}
              className="bg-white dark:bg-gray-700"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email *
          </label>
          <Input
            placeholder="john.doe@example.com"
            type="email"
            value={newClientData.email}
            onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
            className="bg-white dark:bg-gray-800"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone (optional)
          </label>
          <Input
            placeholder="(555) 123-4567"
            value={newClientData.phone}
            onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
            className="bg-white dark:bg-gray-800"
          />
        </div>
        
        <LoadingButton
          onClick={onSubmit}
          loading={loading}
          disabled={!newClientData.first_name || !newClientData.last_name || !newClientData.email}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white"
          size="lg"
        >
          Add Client
        </LoadingButton>
      </div>
    </div>
  )
})

// Separate component for the client dropdown
const ClientDropdown = memo(React.forwardRef<HTMLDivElement, {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  selectedClient: Client | null
  onSelectClient: (client: Client) => void
  clientSearch: string
  setClientSearch: (search: string) => void
  clients: Client[]
  loadingClients: boolean
}>(function ClientDropdown({
  isOpen,
  setIsOpen,
  selectedClient,
  onSelectClient,
  clientSearch,
  setClientSearch,
  clients,
  loadingClients
}, ref) {
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-left flex items-center justify-between hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
      >
        <div className="flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-gray-400" />
          <span className={selectedClient ? 'text-gray-900 dark:text-white' : 'text-gray-500'}>
            {selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : 'Select client'}
          </span>
        </div>
        <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {/* Search */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <Input
              placeholder="Search existing clients..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Client list */}
          {loadingClients ? (
            <div className="p-3 text-center text-gray-500">Searching...</div>
          ) : clients.length > 0 ? (
            clients.map((client) => (
              <button
                key={client.id}
                onClick={() => {
                  onSelectClient(client)
                  setIsOpen(false)
                }}
                className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 flex flex-col"
              >
                <span className="font-medium text-gray-900 dark:text-white">
                  {client.first_name} {client.last_name}
                </span>
                <span className="text-sm text-gray-500">
                  {client.email} {client.phone && `• ${client.phone}`}
                </span>
              </button>
            ))
          ) : clientSearch ? (
            <div className="p-3 text-center text-gray-500">No clients found</div>
          ) : (
            <div className="p-3 text-center text-gray-500">Start typing to search clients</div>
          )}
        </div>
      )}
    </div>
  )
}))