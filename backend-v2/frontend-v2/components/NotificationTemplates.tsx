'use client'

import { useState, useEffect } from 'react'
import { getNotificationTemplates, NotificationTemplate } from '../lib/api'

export default function NotificationTemplates() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState({
    client_name: 'John Doe',
    service_name: 'Haircut',
    appointment_date: 'December 15, 2024',
    appointment_time: '2:00 PM',
    duration: 30,
    price: 45.00,
    business_name: '6FB Barbershop',
    business_phone: '(555) 123-4567'
  })

  useEffect(() => {
    loadTemplates()
  }, [filterType, showInactive])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const templateType = filterType === 'all' ? undefined : filterType
      const templateList = await getNotificationTemplates(templateType, !showInactive)
      setTemplates(templateList)
    } catch (err: any) {
      setError(err.message || 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const renderTemplatePreview = (template: NotificationTemplate) => {
    if (!template.body) return 'No content available'
    
    // Simple template variable replacement for preview
    let preview = template.body
    Object.entries(previewData).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
      preview = preview.replace(regex, String(value))
    })
    
    return preview
  }

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive 
          ? 'bg-green-100 text-green-800' 
          : 'bg-gray-100 text-gray-800'
      }`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    )
  }

  const getTypeBadge = (type: string) => {
    const colors = {
      email: 'bg-blue-100 text-blue-800',
      sms: 'bg-green-100 text-green-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {type.toUpperCase()}
      </span>
    )
  }

  const getCategoryFromName = (name: string) => {
    if (name.includes('confirmation')) return 'Confirmation'
    if (name.includes('reminder')) return 'Reminder'
    if (name.includes('change') || name.includes('update')) return 'Changes'
    if (name.includes('cancellation')) return 'Cancellation'
    if (name.includes('welcome')) return 'Welcome'
    return 'Other'
  }

  if (loading) {
    return (
      <div className="bg-white shadow-lg rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Notification Templates</h2>
        </div>
        <div className="px-6 py-8 text-center">
          <div className="text-gray-500">Loading templates...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Template Management Header */}
      <div className="bg-white shadow-lg rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Notification Templates</h2>
            <div className="flex items-center space-x-4">
              {/* Filter Controls */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Type:</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">All Types</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showInactive"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label htmlFor="showInactive" className="ml-2 text-sm text-gray-700">
                  Show inactive
                </label>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="px-6 py-4 bg-red-50 border-b border-red-200">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="px-6 py-6">
          {templates.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">No templates found</div>
              <button
                onClick={loadTemplates}
                className="mt-2 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-100 rounded-md hover:bg-teal-200"
              >
                Refresh
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div key={template.id} className="border border-gray-200 rounded-lg hover:border-teal-300 transition-colors">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900 mb-1">{template.name}</h3>
                        <div className="flex items-center space-x-2 mb-2">
                          {getTypeBadge(template.template_type)}
                          {getStatusBadge(template.is_active)}
                          <span className="text-xs text-gray-500">
                            {getCategoryFromName(template.name)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {template.subject && (
                      <div className="mb-3">
                        <div className="text-xs font-medium text-gray-700 mb-1">Subject:</div>
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {template.subject}
                        </div>
                      </div>
                    )}

                    <div className="mb-3">
                      <div className="text-xs font-medium text-gray-700 mb-1">Variables:</div>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.map((variable, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200"
                          >
                            {variable}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500">
                        Updated: {new Date(template.updated_at).toLocaleDateString()}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedTemplate(template)
                          setShowPreview(true)
                        }}
                        className="px-3 py-1 text-xs font-medium text-teal-700 bg-teal-100 rounded hover:bg-teal-200 transition-colors"
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Template Categories Overview */}
      <div className="bg-white shadow-lg rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Template Categories</h3>
        </div>
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Confirmation', description: 'Appointment confirmations', icon: '✅', count: templates.filter(t => t.name.includes('confirmation')).length },
              { name: 'Reminder', description: 'Appointment reminders', icon: '⏰', count: templates.filter(t => t.name.includes('reminder')).length },
              { name: 'Changes', description: 'Appointment updates', icon: '📝', count: templates.filter(t => t.name.includes('change') || t.name.includes('update')).length },
              { name: 'Other', description: 'Miscellaneous templates', icon: '📄', count: templates.filter(t => !t.name.includes('confirmation') && !t.name.includes('reminder') && !t.name.includes('change') && !t.name.includes('update')).length },
            ].map((category) => (
              <div key={category.name} className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">{category.icon}</div>
                <div className="font-medium text-gray-900">{category.name}</div>
                <div className="text-sm text-gray-600 mb-2">{category.description}</div>
                <div className="text-lg font-bold text-teal-600">{category.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Template Preview: {selectedTemplate.name}
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Template Info */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Template Information</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Type:</span>
                        <span className="text-sm font-medium">{selectedTemplate.template_type.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        {getStatusBadge(selectedTemplate.is_active)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Category:</span>
                        <span className="text-sm font-medium">{getCategoryFromName(selectedTemplate.name)}</span>
                      </div>
                    </div>
                  </div>

                  {selectedTemplate.subject && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Subject</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm">{selectedTemplate.subject}</div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Available Variables</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-2">
                        {selectedTemplate.variables.map((variable, index) => (
                          <div key={index} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                            {variable}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Preview with Sample Data</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm whitespace-pre-wrap">
                      {renderTemplatePreview(selectedTemplate)}
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Sample Data Used:</h5>
                    <div className="bg-blue-50 p-3 rounded text-xs">
                      {Object.entries(previewData).map(([key, value], index) => (
                        <div key={index} className="flex justify-between py-1">
                          <span className="text-blue-600">{key}:</span>
                          <span className="text-blue-800">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}