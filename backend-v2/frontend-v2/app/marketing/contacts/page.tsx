'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  PlusIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  TagIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  tags: string[]
  segments: string[]
  lastVisit?: string
  totalSpent: number
  appointmentCount: number
  emailOptIn: boolean
  smsOptIn: boolean
  createdAt: string
}

interface Segment {
  id: string
  name: string
  description: string
  contactCount: number
  icon: string
  color: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [filterSegment, setFilterSegment] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setSegments([
        {
          id: '1',
          name: 'VIP Clients',
          description: 'Top 20% by spending',
          contactCount: 87,
          icon: '⭐',
          color: 'yellow'
        },
        {
          id: '2',
          name: 'Regular Clients',
          description: 'Visit at least monthly',
          contactCount: 234,
          icon: '📅',
          color: 'blue'
        },
        {
          id: '3',
          name: 'New Clients',
          description: 'Joined in last 30 days',
          contactCount: 42,
          icon: '🆕',
          color: 'green'
        },
        {
          id: '4',
          name: 'Inactive',
          description: 'No visit in 60+ days',
          contactCount: 156,
          icon: '😴',
          color: 'gray'
        }
      ])

      setContacts([
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1 (555) 123-4567',
          tags: ['VIP', 'Regular'],
          segments: ['1', '2'],
          lastVisit: '2024-12-28',
          totalSpent: 1250,
          appointmentCount: 24,
          emailOptIn: true,
          smsOptIn: true,
          createdAt: '2024-01-15'
        },
        {
          id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          phone: '+1 (555) 234-5678',
          tags: ['New'],
          segments: ['3'],
          lastVisit: '2024-12-26',
          totalSpent: 95,
          appointmentCount: 2,
          emailOptIn: true,
          smsOptIn: false,
          createdAt: '2024-12-01'
        },
        {
          id: '3',
          firstName: 'Robert',
          lastName: 'Johnson',
          email: 'robert.j@example.com',
          tags: ['Inactive'],
          segments: ['4'],
          lastVisit: '2024-10-15',
          totalSpent: 450,
          appointmentCount: 8,
          emailOptIn: false,
          smsOptIn: false,
          createdAt: '2024-03-20'
        },
        {
          id: '4',
          firstName: 'Maria',
          lastName: 'Garcia',
          email: 'maria.garcia@example.com',
          phone: '+1 (555) 345-6789',
          tags: ['VIP'],
          segments: ['1'],
          lastVisit: '2024-12-29',
          totalSpent: 2100,
          appointmentCount: 36,
          emailOptIn: true,
          smsOptIn: true,
          createdAt: '2023-06-10'
        }
      ])

      setLoading(false)
    }, 1000)
  }, [])

  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const toggleAllContacts = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id))
    }
  }

  const filteredContacts = contacts.filter(contact => {
    const matchesSegment = filterSegment === 'all' || contact.segments.includes(filterSegment)
    const matchesSearch = 
      contact.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSegment && matchesSearch
  })

  const getSegmentBadge = (segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId)
    if (!segment) return null

    const colors = {
      yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[segment.color as keyof typeof colors]}`}>
        <span>{segment.icon}</span>
        {segment.name}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contacts</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your client lists and segments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <ArrowUpTrayIcon className="w-5 h-5 mr-2" />
            Import
          </Button>
          <Button>
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Segments Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {segments.map(segment => (
          <Card 
            key={segment.id}
            variant={filterSegment === segment.id ? 'elevated' : 'default'}
            className="cursor-pointer hover:shadow-lg transition-all"
            onClick={() => setFilterSegment(filterSegment === segment.id ? 'all' : segment.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{segment.icon}</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {segment.contactCount}
                </span>
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white">{segment.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{segment.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            {selectedContacts.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedContacts.length} selected
                </span>
                <Button variant="outline" size="sm">
                  <TagIcon className="w-4 h-4 mr-1" />
                  Tag
                </Button>
                <Button variant="outline" size="sm">
                  <EnvelopeIcon className="w-4 h-4 mr-1" />
                  Email
                </Button>
                <Button variant="outline" size="sm">
                  <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                      onChange={toggleAllContacts}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Segments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Opt-in
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredContacts.map(contact => (
                  <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() => toggleContactSelection(contact.id)}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {contact.firstName} {contact.lastName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Client since {new Date(contact.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900 dark:text-white">{contact.email}</div>
                        {contact.phone && (
                          <div className="text-gray-500 dark:text-gray-400">{contact.phone}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.segments.map(segmentId => getSegmentBadge(segmentId))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900 dark:text-white">
                          {contact.appointmentCount} appointments
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          ${contact.totalSpent} total spent
                        </div>
                        {contact.lastVisit && (
                          <div className="text-gray-500 dark:text-gray-400">
                            Last visit: {new Date(contact.lastVisit).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3">
                        <div className="flex items-center gap-1">
                          {contact.emailOptIn ? (
                            <CheckIcon className="w-4 h-4 text-green-500" />
                          ) : (
                            <XMarkIcon className="w-4 h-4 text-red-500" />
                          )}
                          <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="flex items-center gap-1">
                          {contact.smsOptIn ? (
                            <CheckIcon className="w-4 h-4 text-green-500" />
                          ) : (
                            <XMarkIcon className="w-4 h-4 text-red-500" />
                          )}
                          <DevicePhoneMobileIcon className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Import Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  <ArrowUpTrayIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    Drag and drop your CSV file here, or click to browse
                  </p>
                  <Button variant="outline" size="sm">
                    Choose File
                  </Button>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p className="font-medium mb-1">Required columns:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>First Name</li>
                    <li>Last Name</li>
                    <li>Email</li>
                  </ul>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowImportModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setShowImportModal(false)}>
                    Import
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}