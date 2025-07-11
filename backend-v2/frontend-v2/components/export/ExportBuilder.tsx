'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import ExportProgress from './ExportProgress'
import { exportClients, exportAppointments, exportTransactions, exportAnalytics } from '@/lib/api'

type ExportType = 'customers' | 'appointments' | 'transactions' | 'analytics'
type ExportFormat = 'csv' | 'excel' | 'json' | 'pdf'

interface ExportConfig {
  type: ExportType
  format: ExportFormat
  dateRange?: {
    start: string
    end: string
  }
  fields: string[]
  filters: Record<string, any>
}

const exportTypes = [
  {
    id: 'customers' as ExportType,
    name: 'Customers',
    description: 'Export customer information and contact details',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    fields: ['name', 'email', 'phone', 'address', 'city', 'state', 'zipcode', 'notes', 'created_at', 'last_visit']
  },
  {
    id: 'appointments' as ExportType,
    name: 'Appointments',
    description: 'Export appointment history and booking data',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    fields: ['date', 'time', 'customer_name', 'service', 'barber', 'status', 'amount', 'notes']
  },
  {
    id: 'transactions' as ExportType,
    name: 'Transactions',
    description: 'Export payment and transaction records',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    fields: ['date', 'customer_name', 'amount', 'payment_method', 'status', 'reference', 'service', 'barber']
  },
  {
    id: 'analytics' as ExportType,
    name: 'Analytics',
    description: 'Export business analytics and reports',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    fields: ['period', 'revenue', 'appointments', 'new_customers', 'retention_rate', 'average_ticket']
  }
]

const exportFormats = [
  { id: 'csv' as ExportFormat, name: 'CSV', description: 'Comma-separated values' },
  { id: 'excel' as ExportFormat, name: 'Excel', description: 'Microsoft Excel format' },
  { id: 'json' as ExportFormat, name: 'JSON', description: 'JavaScript Object Notation' },
  { id: 'pdf' as ExportFormat, name: 'PDF', description: 'Portable Document Format' }
]

export default function ExportBuilder() {
  const [selectedType, setSelectedType] = useState<ExportType | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv')
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<any>(null)

  const handleTypeSelect = (type: ExportType) => {
    setSelectedType(type)
    const typeConfig = exportTypes.find(t => t.id === type)
    if (typeConfig) {
      setSelectedFields(typeConfig.fields)
    }
  }

  const handleFieldToggle = (field: string) => {
    setSelectedFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    )
  }

  const handleSelectAllFields = () => {
    const typeConfig = exportTypes.find(t => t.id === selectedType)
    if (typeConfig) {
      setSelectedFields(typeConfig.fields)
    }
  }

  const handleDeselectAllFields = () => {
    setSelectedFields([])
  }

  const handleExport = async () => {
    if (!selectedType || selectedFields.length === 0) return

    const exportConfig: ExportConfig = {
      type: selectedType,
      format: selectedFormat,
      dateRange,
      fields: selectedFields,
      filters: {}
    }

    setIsExporting(true)
    setExportProgress({
      status: 'preparing',
      progress: 0,
      message: 'Preparing export...'
    })

    try {
      let result: any
      const exportParams = {
        format: selectedFormat,
        fields: selectedFields,
        date_range: dateRange
      }

      setExportProgress({
        status: 'processing',
        progress: 50,
        message: 'Processing data...'
      })

      switch (selectedType) {
        case 'customers':
          result = await exportClients(exportParams)
          break
        case 'appointments':
          result = await exportAppointments(exportParams)
          break
        case 'transactions':
          result = await exportTransactions(exportParams)
          break
        case 'analytics':
          result = await exportAnalytics({
            ...exportParams,
            metrics: selectedFields
          })
          break
      }

      // Handle the response - assuming the API returns a download URL or blob
      setExportProgress({
        status: 'complete',
        progress: 100,
        message: 'Export complete!',
        downloadUrl: result.download_url || '#',
        filename: result.filename || `${selectedType}_export_${new Date().toISOString().split('T')[0]}.${selectedFormat}`
      })
    } catch (error) {
      console.error('Export error:', error)
      setExportProgress({
        status: 'error',
        progress: 0,
        message: 'Export failed',
        error: error instanceof Error ? error.message : 'An error occurred during export'
      })
    } finally {
      setIsExporting(false)
    }
  }

  const getSelectedTypeConfig = () => {
    return exportTypes.find(t => t.id === selectedType)
  }

  return (
    <div className="space-y-6">
      {/* Export Type Selection */}
      {!isExporting && !exportProgress && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Select Export Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exportTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => handleTypeSelect(type.id)}
                    className={`
                      p-4 rounded-lg border-2 transition-all text-left
                      ${selectedType === type.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`
                        w-12 h-12 rounded-lg flex items-center justify-center
                        ${selectedType === type.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
                      `}>
                        {type.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{type.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedType && (
            <>
              {/* Format Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Export Format</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {exportFormats.map(format => (
                      <button
                        key={format.id}
                        onClick={() => setSelectedFormat(format.id)}
                        className={`
                          p-3 rounded-lg border-2 transition-all
                          ${selectedFormat === format.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                          }
                        `}
                      >
                        <div className="font-medium text-gray-900">{format.name}</div>
                        <div className="text-xs text-gray-600 mt-1">{format.description}</div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Date Range */}
              <Card>
                <CardHeader>
                  <CardTitle>Date Range</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Field Selection */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Select Fields</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSelectAllFields}
                        variant="ghost"
                        size="sm"
                      >
                        Select All
                      </Button>
                      <Button
                        onClick={handleDeselectAllFields}
                        variant="ghost"
                        size="sm"
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {getSelectedTypeConfig()?.fields.map(field => (
                      <label
                        key={field}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(field)}
                          onChange={() => handleFieldToggle(field)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                          {field.replace(/_/g, ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Export Actions */}
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">
                        {selectedFields.length} fields selected for export
                      </p>
                    </div>
                    <Button
                      onClick={handleExport}
                      variant="primary"
                      size="lg"
                      disabled={selectedFields.length === 0}
                    >
                      Export Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* Export Progress */}
      {(isExporting || exportProgress) && (
        <ExportProgress
          progress={exportProgress}
          onReset={() => {
            setIsExporting(false)
            setExportProgress(null)
            setSelectedType(null)
            setSelectedFields([])
          }}
        />
      )}
    </div>
  )
}