'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  PlusIcon,
  DocumentTextIcon,
  EyeIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'

interface Template {
  id: string
  name: string
  type: 'email' | 'sms'
  category: string
  description: string
  thumbnail?: string
  subject?: string
  lastModified: string
  usedCount: number
  isDefault?: boolean
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    // Simulate loading templates
    setTimeout(() => {
      setTemplates([
        {
          id: '1',
          name: 'Welcome New Client',
          type: 'email',
          category: 'Welcome',
          description: 'Send a warm welcome to new clients with service information',
          subject: 'Welcome to {{business_name}}!',
          lastModified: '2024-12-20',
          usedCount: 156,
          isDefault: true
        },
        {
          id: '2',
          name: 'Appointment Reminder',
          type: 'sms',
          category: 'Reminders',
          description: 'Remind clients about upcoming appointments',
          lastModified: '2024-12-18',
          usedCount: 423
        },
        {
          id: '3',
          name: 'Holiday Promotion',
          type: 'email',
          category: 'Promotions',
          description: 'Seasonal promotion template with festive design',
          subject: 'Special Holiday Offer - {{discount}}% Off!',
          lastModified: '2024-12-15',
          usedCount: 89
        },
        {
          id: '4',
          name: 'Service Update',
          type: 'email',
          category: 'Updates',
          description: 'Inform clients about new services or changes',
          subject: 'Exciting News from {{business_name}}',
          lastModified: '2024-12-10',
          usedCount: 34
        },
        {
          id: '5',
          name: 'Re-engagement Campaign',
          type: 'email',
          category: 'Re-engagement',
          description: 'Win back inactive clients with special offers',
          subject: 'We Miss You, {{client_name}}!',
          lastModified: '2024-12-08',
          usedCount: 67
        },
        {
          id: '6',
          name: 'Quick Booking Reminder',
          type: 'sms',
          category: 'Reminders',
          description: 'Short SMS reminder for appointments',
          lastModified: '2024-12-05',
          usedCount: 312
        }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  const categories = ['Welcome', 'Reminders', 'Promotions', 'Updates', 'Re-engagement']

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Welcome':
        return '👋'
      case 'Reminders':
        return '⏰'
      case 'Promotions':
        return '🎉'
      case 'Updates':
        return '📢'
      case 'Re-engagement':
        return '💝'
      default:
        return '📄'
    }
  }

  const getTypeBadge = (type: string) => {
    const styles = {
      email: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      sms: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    }

    const icons = {
      email: <EnvelopeIcon className="w-3 h-3" />,
      sms: <DevicePhoneMobileIcon className="w-3 h-3" />
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[type as keyof typeof styles]}`}>
        {icons[type as keyof typeof icons]}
        {type.toUpperCase()}
      </span>
    )
  }

  const filteredTemplates = templates.filter(template => {
    const matchesType = filterType === 'all' || template.type === filterType
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesType && matchesCategory && matchesSearch
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Templates</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Create and manage your email and SMS templates</p>
        </div>
        <Button>
          <PlusIcon className="w-5 h-5 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Types</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Categories */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {categories.map(category => {
          const count = templates.filter(t => t.category === category).length
          return (
            <Card 
              key={category}
              variant={filterCategory === category ? 'accent' : 'default'}
              className="cursor-pointer hover:shadow-lg transition-all"
              onClick={() => setFilterCategory(filterCategory === category ? 'all' : category)}
            >
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">{getCategoryIcon(category)}</div>
                <div className="font-medium text-gray-900 dark:text-white">{category}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{count} templates</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-500 dark:text-gray-400">No templates found</div>
            <Button variant="outline" className="mt-4">
              <PlusIcon className="w-5 h-5 mr-2" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-all">
              <CardContent className="p-0">
                {/* Template Preview Area */}
                <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-6 rounded-t-lg overflow-hidden">
                  {template.isDefault && (
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <SparklesIcon className="w-3 h-3" />
                        Default
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-center h-full">
                    {template.type === 'email' ? (
                      <div className="text-center">
                        <EnvelopeIcon className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                        {template.subject && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                            "{template.subject}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center">
                        <DevicePhoneMobileIcon className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">SMS Template</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Template Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">{template.name}</h3>
                    {getTypeBadge(template.type)}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {template.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <span>Used {template.usedCount} times</span>
                    <span>Modified {new Date(template.lastModified).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedTemplate(template)
                        setShowPreview(true)
                      }}
                    >
                      <EyeIcon className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                    <Button size="sm" className="flex-1">
                      <PencilIcon className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm">
                      <DocumentDuplicateIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Template Preview: {selectedTemplate.name}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </CardHeader>
            <CardContent className="overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Template Information</h4>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Type:</span>
                      {getTypeBadge(selectedTemplate.type)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Category:</span>
                      <span className="text-sm font-medium">{selectedTemplate.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Times Used:</span>
                      <span className="text-sm font-medium">{selectedTemplate.usedCount}</span>
                    </div>
                  </div>
                </div>

                {selectedTemplate.subject && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Subject Line</h4>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <p className="text-sm">{selectedTemplate.subject}</p>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Preview</h4>
                  <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                    {selectedTemplate.type === 'email' ? (
                      <div className="space-y-4">
                        <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400">From: Your Business Name</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">To: client@example.com</p>
                          <p className="text-sm font-medium mt-2">Subject: {selectedTemplate.subject || 'Email Subject'}</p>
                        </div>
                        <div className="prose dark:prose-dark max-w-none">
                          <p>Hi {'{{client_name}}'},</p>
                          <p>This is a preview of your {selectedTemplate.name} template.</p>
                          <p>Your actual content would appear here with all the personalized variables replaced.</p>
                          <p>Best regards,<br />{'{{business_name}}'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-sm mx-auto">
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm">
                          <p className="text-sm">
                            Hi {'{{client_name}}'}, this is a reminder about your appointment on {'{{appointment_date}}'} at {'{{appointment_time}}'}. 
                            Reply CONFIRM to confirm or CANCEL to cancel.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowPreview(false)}>
                    Close
                  </Button>
                  <Button>
                    Use This Template
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