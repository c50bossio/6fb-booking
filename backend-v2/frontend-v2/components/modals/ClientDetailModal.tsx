'use client'

import React from 'react'
import { Button } from '../ui/Button'
import { XMarkIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline'

interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  lastVisit?: string
  totalVisits?: number
  notes?: string
}

interface ClientDetailModalProps {
  isOpen: boolean
  onClose: () => void
  client?: Client
  onEdit?: (client: Client) => void
  onDelete?: (clientId: string) => void
}

export default function ClientDetailModal({ 
  isOpen, 
  onClose, 
  client, 
  onEdit, 
  onDelete 
}: ClientDetailModalProps) {
  if (!isOpen || !client) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Client Details</h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="p-2"
          >
            <XMarkIcon className="w-5 h-5" />
          </Button>
        </div>

        {/* Client Info */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{client.name}</h3>
            <p className="text-sm text-gray-500">Client ID: {client.id}</p>
          </div>

          {/* Contact Information */}
          <div className="space-y-3">
            {client.email && (
              <div className="flex items-center space-x-3">
                <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Email</p>
                  <p className="text-sm text-gray-900">{client.email}</p>
                </div>
              </div>
            )}

            {client.phone && (
              <div className="flex items-center space-x-3">
                <PhoneIcon className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Phone</p>
                  <p className="text-sm text-gray-900">{client.phone}</p>
                </div>
              </div>
            )}
          </div>

          {/* Visit History */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Visit History</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Total Visits</p>
                <p className="text-lg font-medium text-gray-900">{client.totalVisits || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Last Visit</p>
                <p className="text-sm text-gray-900">{client.lastVisit || 'Never'}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {client.notes && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
              <div className="bg-gray-50 p-3 rounded border">
                <p className="text-sm text-gray-900">{client.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 mt-6 pt-4 border-t">
          <Button
            onClick={() => onEdit?.(client)}
            variant="primary"
            className="w-full"
          >
            Edit Client
          </Button>

          <Button
            onClick={() => {
              // Create new appointment for this client
              console.log('Creating appointment for client:', client.id)
            }}
            variant="secondary"
            className="w-full"
          >
            New Appointment
          </Button>

          <Button
            onClick={() => onDelete?.(client.id)}
            variant="destructive"
            className="w-full"
          >
            Delete Client
          </Button>
        </div>
      </div>
    </div>
  )
}