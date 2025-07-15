'use client'

import { useState, useCallback, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import type { ImportedData } from './ImportWizard'

interface FileUploadProps {
  onFileUpload: (data: ImportedData) => void
  isLoading: boolean
}

export default function FileUpload({ onFileUpload, isLoading }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): boolean => {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json'
    ]
    const allowedExtensions = ['.csv', '.xls', '.xlsx', '.json']

    if (file.size > maxSize) {
      setUploadError('File size must be less than 10MB')
      return false
    }

    const hasValidType = allowedTypes.includes(file.type)
    const hasValidExtension = allowedExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    )

    if (!hasValidType && !hasValidExtension) {
      setUploadError('Please upload a CSV, Excel, or JSON file')
      return false
    }

    return true
  }, [])

  const getFileType = (file: File): 'csv' | 'excel' | 'json' => {
    const name = file.name.toLowerCase()
    if (name.endsWith('.json')) return 'json'
    if (name.endsWith('.csv')) return 'csv'
    return 'excel'
  }

  const parseCSV = (text: string): { headers: string[], data: Record<string, any>[] } => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length === 0) throw new Error('File is empty')

    const headers = lines[0].split(',').map(header => header.trim().replace(/['"]/g, ''))
    const data = lines.slice(1).map((line, index) => {
      const values = line.split(',').map(value => value.trim().replace(/['"]/g, ''))
      const row: Record<string, any> = {}
      
      headers.forEach((header, i) => {
        row[header] = values[i] || ''
      })
      
      return row
    }).filter(row => Object.values(row).some(value => value !== ''))

    return { headers, data }
  }

  const parseJSON = (text: string): { headers: string[], data: Record<string, any>[] } => {
    try {
      const jsonData = JSON.parse(text)
      let data: Record<string, any>[]

      if (Array.isArray(jsonData)) {
        data = jsonData
      } else if (jsonData.customers || jsonData.clients || jsonData.data) {
        data = jsonData.customers || jsonData.clients || jsonData.data
      } else {
        throw new Error('JSON format not recognized. Expected array or object with customers/clients/data property')
      }

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No data found in JSON file')
      }

      const headers = Array.from(new Set(
        data.flatMap(item => Object.keys(item))
      )).sort()

      return { headers, data }
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const parseExcel = async (file: File): Promise<{ headers: string[], data: Record<string, any>[] }> => {
    // For now, we'll provide instructions for CSV conversion
    // In a real implementation, you'd use a library like SheetJS
    throw new Error('Excel parsing not implemented. Please convert to CSV format and try again.')
  }

  const processFile = useCallback(async (file: File) => {
    setProcessing(true)
    setUploadError(null)

    try {
      if (!validateFile(file)) {
        setProcessing(false)
        return
      }

      const fileType = getFileType(file)
      let headers: string[]
      let data: Record<string, any>[]

      if (fileType === 'excel') {
        const result = await parseExcel(file)
        headers = result.headers
        data = result.data
      } else {
        const text = await file.text()
        if (fileType === 'json') {
          const result = parseJSON(text)
          headers = result.headers
          data = result.data
        } else {
          const result = parseCSV(text)
          headers = result.headers
          data = result.data
        }
      }

      if (data.length === 0) {
        throw new Error('No data found in file')
      }

      if (data.length > 10000) {
        throw new Error('File contains too many records. Maximum 10,000 records allowed.')
      }

      const importedData: ImportedData = {
        filename: file.name,
        headers,
        data,
        fileType
      }

      onFileUpload(importedData)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to process file')
    } finally {
      setProcessing(false)
    }
  }, [validateFile, onFileUpload])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processFile(files[0])
    }
  }, [processFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }, [processFile])

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Customer Data</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* File Upload Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
              ${processing ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".csv,.xlsx,.xls,.json"
              className="hidden"
              disabled={processing || isLoading}
            />
            
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {processing ? 'Processing file...' : 'Drop your file here'}
                </h3>
                <p className="text-gray-600 mb-4">
                  or click to browse your computer
                </p>
                
                <Button
                  onClick={openFileDialog}
                  disabled={processing || isLoading}
                  variant="primary"
                  size="md"
                >
                  {processing ? 'Processing...' : 'Choose File'}
                </Button>
              </div>
            </div>
          </div>

          {/* Supported Formats */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Supported Formats:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-700 dark:text-gray-300">CSV Files</div>
                <div className="text-gray-600">Comma-separated values (.csv)</div>
              </div>
              <div>
                <div className="font-medium text-gray-700 dark:text-gray-300">Excel Files</div>
                <div className="text-gray-600">Spreadsheet files (.xlsx, .xls)</div>
              </div>
              <div>
                <div className="font-medium text-gray-700 dark:text-gray-300">JSON Files</div>
                <div className="text-gray-600">JavaScript Object Notation (.json)</div>
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">File Requirements:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Maximum file size: 10MB</li>
              <li>• Maximum records: 10,000</li>
              <li>• First row should contain column headers</li>
              <li>• Required fields: First Name, Last Name, Email</li>
              <li>• Optional fields: Phone, Date of Birth, Notes, Tags</li>
            </ul>
          </div>

          {/* Sample Data Format */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">Sample CSV Format:</h4>
            <div className="text-sm font-mono text-yellow-800 bg-yellow-100 p-2 rounded border overflow-x-auto">
              First Name,Last Name,Email,Phone,Date of Birth,Notes<br />
              John,Doe,john@example.com,555-0123,1990-01-15,"Regular customer"<br />
              Jane,Smith,jane@example.com,555-0456,1985-03-22,"Prefers morning appointments"
            </div>
          </div>

          {/* Error Display */}
          {uploadError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <div className="font-medium text-red-900">Upload Error</div>
                  <div className="text-red-800 text-sm">{uploadError}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}