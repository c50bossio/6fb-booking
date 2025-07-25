'use client'

import React, { useState, useEffect } from 'react'
import { format, addMinutes } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  CalendarIcon, 
  ClockIcon, 
  UserIcon, 
  ScissorsIcon,
  CurrencyDollarIcon,
  PhoneIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { PremiumColors } from '@/lib/premium-design-system'

// Service durations in minutes
const SERVICE_DURATIONS: Record<string, number> = {
  'Haircut': 30,
  'Beard Trim': 20,
  'Haircut & Beard': 45,
  'Hair Color': 60,
  'Hair Treatment': 45,
  'Kids Cut': 20,
  'Senior Cut': 25,
  'Buzz Cut': 15,
  'Design/Pattern': 45,
  'Shampoo & Style': 30
}

// Service prices
const SERVICE_PRICES: Record<string, number> = {
  'Haircut': 35,
  'Beard Trim': 20,
  'Haircut & Beard': 50,
  'Hair Color': 60,
  'Hair Treatment': 40,
  'Kids Cut': 25,
  'Senior Cut': 30,
  'Buzz Cut': 20,
  'Design/Pattern': 45,
  'Shampoo & Style': 35
}

interface Client {
  id: number
  name: string
  email: string
  phone: string
  tier?: 'new' | 'regular' | 'vip' | 'platinum'
  lastVisit?: Date
  totalSpent?: number
}

interface AppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date
  selectedTime: { hour: number; minute: number }
  barberId: number
  barberName: string
  existingAppointments?: any[]
  onConfirm: (appointmentData: any) => void
}

export default function AppointmentModal({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  barberId,
  barberName,
  existingAppointments = [],
  onConfirm
}: AppointmentModalProps) {
  const [selectedService, setSelectedService] = useState<string>('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [isNewClient, setIsNewClient] = useState(false)
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conflicts, setConflicts] = useState<string[]>([])

  // Mock client data - in production, this would come from an API
  const mockClients: Client[] = [
    { id: 1, name: 'John Smith', email: 'john@example.com', phone: '555-0123', tier: 'regular', lastVisit: new Date('2024-12-15'), totalSpent: 450 },
    { id: 2, name: 'Mike Johnson', email: 'mike@example.com', phone: '555-0124', tier: 'vip', lastVisit: new Date('2024-12-20'), totalSpent: 1200 },
    { id: 3, name: 'David Brown', email: 'david@example.com', phone: '555-0125', tier: 'new', lastVisit: new Date('2024-12-22'), totalSpent: 35 },
    { id: 4, name: 'Chris Wilson', email: 'chris@example.com', phone: '555-0126', tier: 'platinum', lastVisit: new Date('2024-12-18'), totalSpent: 2500 }
  ]

  // Calculate appointment times
  const startTime = new Date(selectedDate)
  startTime.setHours(selectedTime.hour, selectedTime.minute, 0, 0)
  
  const duration = selectedService ? SERVICE_DURATIONS[selectedService] || 30 : 30
  const endTime = addMinutes(startTime, duration)
  const price = selectedService ? SERVICE_PRICES[selectedService] || 0 : 0

  // Filter clients based on search
  const filteredClients = mockClients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.phone.includes(clientSearch)
  )

  // Check for conflicts
  useEffect(() => {
    if (selectedService) {
      const conflictList: string[] = []
      
      // Check if appointment extends past business hours
      if (endTime.getHours() >= 19 || (endTime.getHours() === 18 && endTime.getMinutes() > 30)) {
        conflictList.push('Appointment extends past business hours')
      }

      // Check for overlapping appointments
      existingAppointments.forEach(apt => {
        const aptStart = new Date(apt.start_time)
        const aptEnd = new Date(apt.end_time)
        
        if (apt.barber_id === barberId) {
          if (
            (startTime >= aptStart && startTime < aptEnd) ||
            (endTime > aptStart && endTime <= aptEnd) ||
            (startTime <= aptStart && endTime >= aptEnd)
          ) {
            conflictList.push(`Conflicts with ${apt.client_name} at ${format(aptStart, 'h:mm a')}`)
          }
        }
      })

      setConflicts(conflictList)
    }
  }, [selectedService, startTime, endTime, barberId, existingAppointments])

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client)
    setIsNewClient(false)
  }

  const handleNewClient = () => {
    setIsNewClient(true)
    setSelectedClient(null)
  }

  const handleConfirm = () => {
    if (!selectedService || (!selectedClient && !isNewClient)) {
      return
    }

    if (isNewClient && (!newClientData.name || !newClientData.phone)) {
      return
    }

    const appointmentData = {
      barber_id: barberId,
      service_name: selectedService,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: duration,
      price: price,
      client_id: selectedClient?.id || null,
      client_name: selectedClient?.name || newClientData.name,
      client_email: selectedClient?.email || newClientData.email,
      client_phone: selectedClient?.phone || newClientData.phone,
      client_tier: selectedClient?.tier || 'new',
      notes: notes,
      status: 'confirmed'
    }

    onConfirm(appointmentData)
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'vip': return 'bg-yellow-100 text-yellow-800'
      case 'platinum': return 'bg-purple-100 text-purple-800'
      case 'regular': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">New Appointment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date and Time Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-5 w-5 text-gray-600" />
                <span className="font-medium">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-5 w-5 text-gray-600" />
                <span>{format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <UserIcon className="h-5 w-5 text-gray-600" />
              <span>Barber: <strong>{barberName}</strong></span>
            </div>
          </div>

          {/* Service Selection */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <ScissorsIcon className="h-4 w-4" />
              <span>Service</span>
            </Label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger>
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SERVICE_DURATIONS).map(([service, duration]) => (
                  <SelectItem key={service} value={service}>
                    <div className="flex items-center justify-between w-full">
                      <span>{service}</span>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>{duration} min</span>
                        <span>•</span>
                        <span>${SERVICE_PRICES[service]}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client Selection */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <UserIcon className="h-4 w-4" />
              <span>Client</span>
            </Label>
            
            {!isNewClient ? (
              <>
                <div className="relative">
                  <Input
                    placeholder="Search by name or phone..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
                  
                  {clientSearch && filteredClients.length > 0 && !selectedClient && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredClients.map(client => (
                        <button
                          key={client.id}
                          className="w-full px-4 py-2 hover:bg-gray-50 flex items-center justify-between text-left"
                          onClick={() => {
                            handleClientSelect(client)
                            setClientSearch(client.name)
                          }}
                        >
                          <div>
                            <div className="font-medium">{client.name}</div>
                            <div className="text-sm text-gray-600">{client.phone}</div>
                          </div>
                          <Badge className={getTierColor(client.tier || 'new')}>
                            {client.tier || 'new'}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedClient && (
                  <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{selectedClient.name}</div>
                      <Badge className={getTierColor(selectedClient.tier || 'new')}>
                        {selectedClient.tier || 'new'}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center space-x-2">
                        <PhoneIcon className="h-3 w-3" />
                        <span>{selectedClient.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <EnvelopeIcon className="h-3 w-3" />
                        <span>{selectedClient.email}</span>
                      </div>
                      {selectedClient.lastVisit && (
                        <div>Last visit: {format(selectedClient.lastVisit, 'MMM d, yyyy')}</div>
                      )}
                      {selectedClient.totalSpent && (
                        <div>Total spent: ${selectedClient.totalSpent}</div>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleNewClient}
                  className="w-full"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add New Client
                </Button>
              </>
            ) : (
              <div className="space-y-3 border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">New Client Information</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsNewClient(false)}
                  >
                    Search Existing
                  </Button>
                </div>
                
                <Input
                  placeholder="Client Name *"
                  value={newClientData.name}
                  onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                />
                
                <Input
                  placeholder="Phone Number *"
                  value={newClientData.phone}
                  onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
                />
                
                <Input
                  type="email"
                  placeholder="Email (optional)"
                  value={newClientData.email}
                  onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Special requests, reminders, etc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Price Summary */}
          {selectedService && (
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Total Price</span>
                </div>
                <span className="text-2xl font-bold text-green-600">${price}</span>
              </div>
            </div>
          )}

          {/* Conflicts Warning */}
          {conflicts.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <ExclamationTriangleIcon className="h-4 w-4 text-orange-600" />
              <AlertDescription>
                <div className="font-medium text-orange-900 mb-1">Scheduling Conflicts:</div>
                <ul className="list-disc list-inside text-sm text-orange-800">
                  {conflicts.map((conflict, index) => (
                    <li key={index}>{conflict}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              !selectedService || 
              (!selectedClient && !isNewClient) ||
              (isNewClient && (!newClientData.name || !newClientData.phone)) ||
              conflicts.length > 0
            }
            style={{ 
              backgroundColor: conflicts.length > 0 ? undefined : PremiumColors.primary[500] 
            }}
          >
            {conflicts.length > 0 ? 'Resolve Conflicts' : 'Confirm Appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}