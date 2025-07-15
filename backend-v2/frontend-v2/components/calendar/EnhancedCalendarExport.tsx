import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Checkbox } from '@/components/ui/checkbox'
import { Download, Calendar, FileText, Table } from 'lucide-react'

interface ExportOptions {
  format: 'ics' | 'csv' | 'pdf'
  dateRange: {
    start: string
    end: string
  }
  includeDetails: boolean
  includeNotes: boolean
  includeCancelled: boolean
}

interface EnhancedCalendarExportProps {
  onExport: (options: ExportOptions) => void
  className?: string
}

export const EnhancedCalendarExport: React.FC<EnhancedCalendarExportProps> = ({
  onExport,
  className = ''
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'ics',
    dateRange: {
      start: new Date().toISOString().split('T')[0],
      end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
    },
    includeDetails: true,
    includeNotes: false,
    includeCancelled: false
  })

  const formatOptions = [
    { value: 'ics', label: 'iCalendar (.ics)' },
    { value: 'csv', label: 'CSV Spreadsheet (.csv)' },
    { value: 'pdf', label: 'PDF Report (.pdf)' }
  ]

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'ics':
        return <Calendar className="w-4 h-4" />
      case 'csv':
        return <Table className="w-4 h-4" />
      case 'pdf':
        return <FileText className="w-4 h-4" />
      default:
        return <Download className="w-4 h-4" />
    }
  }

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'ics':
        return 'Import into Google Calendar, Outlook, or other calendar apps'
      case 'csv':
        return 'Open in Excel, Google Sheets, or other spreadsheet applications'
      case 'pdf':
        return 'Print-ready report with formatted appointment details'
      default:
        return ''
    }
  }

  const handleExport = () => {
    onExport(options)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Download className="w-5 h-5" />
          <span>Export Calendar</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Export Format</label>
          <Select
            value={options.format}
            onChange={(value) => setOptions(prev => ({ ...prev, format: value as ExportOptions['format'] }))}
            className="w-full"
            options={formatOptions}
          />
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {getFormatDescription(options.format)}
          </p>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <Input
              type="date"
              value={options.dateRange.start}
              onChange={(e) => setOptions(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, start: e.target.value }
              }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <Input
              type="date"
              value={options.dateRange.end}
              onChange={(e) => setOptions(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, end: e.target.value }
              }))}
            />
          </div>
        </div>

        {/* Export Options */}
        <div>
          <label className="block text-sm font-medium mb-3">Include Options</label>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={options.includeDetails}
                onCheckedChange={(checked) => setOptions(prev => ({ 
                  ...prev, 
                  includeDetails: checked as boolean 
                }))}
              />
              <label className="text-sm">Include client details and contact information</label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={options.includeNotes}
                onCheckedChange={(checked) => setOptions(prev => ({ 
                  ...prev, 
                  includeNotes: checked as boolean 
                }))}
              />
              <label className="text-sm">Include appointment notes and special instructions</label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={options.includeCancelled}
                onCheckedChange={(checked) => setOptions(prev => ({ 
                  ...prev, 
                  includeCancelled: checked as boolean 
                }))}
              />
              <label className="text-sm">Include cancelled appointments</label>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <div className="pt-4">
          <Button 
            onClick={handleExport}
            className="w-full"
            size="lg"
          >
            {getFormatIcon(options.format)}
            <span className="ml-2">Export Calendar</span>
          </Button>
        </div>

        {/* Preview */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-2">Export Preview</h4>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <div>Format: {formatOptions.find(f => f.value === options.format)?.label}</div>
            <div>
              Date Range: {new Date(options.dateRange.start).toLocaleDateString()} - {new Date(options.dateRange.end).toLocaleDateString()}
            </div>
            <div>
              Options: {[
                options.includeDetails && 'Details',
                options.includeNotes && 'Notes',
                options.includeCancelled && 'Cancelled'
              ].filter(Boolean).join(', ') || 'Basic information only'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}