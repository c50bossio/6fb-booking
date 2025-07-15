'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { 
  CheckIcon,
  XMarkIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  TagIcon,
  PencilIcon,
  TrashIcon,
  UserIcon
} from '@heroicons/react/24/outline'

export interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  tags: string[]
  lastVisit?: string
  totalSpent: number
  appointmentCount: number
  emailOptIn: boolean
  smsOptIn: boolean
  createdAt: string
}

interface ContactListProps {
  contacts: Contact[]
  selectedContacts?: string[]
  onContactSelect?: (contactId: string) => void
  onContactSelectAll?: (selected: boolean) => void
  onContactEdit?: (contact: Contact) => void
  onContactDelete?: (contact: Contact) => void
  onContactTag?: (contactIds: string[]) => void
  compact?: boolean
}

export default function ContactList({
  contacts,
  selectedContacts = [],
  onContactSelect,
  onContactSelectAll,
  onContactEdit,
  onContactDelete,
  onContactTag,
  compact = false
}: ContactListProps) {
  const [expandedContacts, setExpandedContacts] = useState<string[]>([])

  const toggleExpanded = (contactId: string) => {
    setExpandedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (contacts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No contacts found</p>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {contacts.map(contact => (
          <div
            key={contact.id}
            className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-teal-300 dark:hover:border-teal-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              {onContactSelect && (
                <input
                  type="checkbox"
                  checked={selectedContacts.includes(contact.id)}
                  onChange={() => onContactSelect(contact.id)}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
              )}
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {contact.firstName} {contact.lastName}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{contact.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {contact.emailOptIn ? (
                  <EnvelopeIcon className="w-4 h-4 text-green-500" title="Email opt-in" />
                ) : (
                  <EnvelopeIcon className="w-4 h-4 text-gray-300" title="Email opt-out" />
                )}
                {contact.smsOptIn ? (
                  <DevicePhoneMobileIcon className="w-4 h-4 text-green-500" title="SMS opt-in" />
                ) : (
                  <DevicePhoneMobileIcon className="w-4 h-4 text-gray-300" title="SMS opt-out" />
                )}
              </div>
              {onContactEdit && (
                <Button variant="ghost" size="sm" onClick={() => onContactEdit(contact)}>
                  <PencilIcon className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {onContactSelect && (
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedContacts.length === contacts.length && contacts.length > 0}
                      onChange={(e) => onContactSelectAll?.(e.target.checked)}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contact Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tags
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
              {contacts.map(contact => (
                <React.Fragment key={contact.id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    {onContactSelect && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={() => onContactSelect(contact.id)}
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div>
                        <button
                          onClick={() => toggleExpanded(contact.id)}
                          className="font-medium text-gray-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400"
                        >
                          {contact.firstName} {contact.lastName}
                        </button>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Client since {formatDate(contact.createdAt)}
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
                      {contact.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={() => onContactTag?.([contact.id])}
                          className="text-xs text-gray-400 hover:text-teal-600 dark:hover:text-teal-400"
                        >
                          <TagIcon className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900 dark:text-white">
                          {contact.appointmentCount} appointments
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          ${contact.totalSpent} lifetime
                        </div>
                        {contact.lastVisit && (
                          <div className="text-gray-500 dark:text-gray-400">
                            Last: {formatDate(contact.lastVisit)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3">
                        <div className="flex items-center gap-1" title="Email opt-in">
                          {contact.emailOptIn ? (
                            <CheckIcon className="w-4 h-4 text-green-500" />
                          ) : (
                            <XMarkIcon className="w-4 h-4 text-red-500" />
                          )}
                          <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="flex items-center gap-1" title="SMS opt-in">
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
                        {onContactEdit && (
                          <Button variant="ghost" size="sm" onClick={() => onContactEdit(contact)}>
                            <PencilIcon className="w-4 h-4" />
                          </Button>
                        )}
                        {onContactDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            onClick={() => onContactDelete(contact)}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedContacts.includes(contact.id) && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                              Contact Details
                            </h4>
                            <dl className="space-y-1">
                              <div>
                                <dt className="inline text-gray-500 dark:text-gray-400">Created:</dt>
                                <dd className="inline ml-1 text-gray-900 dark:text-white">
                                  {formatDate(contact.createdAt)}
                                </dd>
                              </div>
                              {contact.lastVisit && (
                                <div>
                                  <dt className="inline text-gray-500 dark:text-gray-400">Last Visit:</dt>
                                  <dd className="inline ml-1 text-gray-900 dark:text-white">
                                    {formatDate(contact.lastVisit)}
                                  </dd>
                                </div>
                              )}
                            </dl>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                              Engagement Stats
                            </h4>
                            <dl className="space-y-1">
                              <div>
                                <dt className="inline text-gray-500 dark:text-gray-400">Total Appointments:</dt>
                                <dd className="inline ml-1 text-gray-900 dark:text-white">
                                  {contact.appointmentCount}
                                </dd>
                              </div>
                              <div>
                                <dt className="inline text-gray-500 dark:text-gray-400">Lifetime Value:</dt>
                                <dd className="inline ml-1 text-gray-900 dark:text-white">
                                  ${contact.totalSpent}
                                </dd>
                              </div>
                            </dl>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                              Quick Actions
                            </h4>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                Send Email
                              </Button>
                              <Button size="sm" variant="outline">
                                Send SMS
                              </Button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}