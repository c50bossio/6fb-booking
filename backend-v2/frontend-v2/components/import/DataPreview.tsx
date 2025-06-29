'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import FieldMapper from './FieldMapper'
import type { ImportedData, FieldMapping } from './ImportWizard'

interface DataPreviewProps {
  data: ImportedData
  onDataMapped: (mapping: FieldMapping) => void
  existingMapping?: FieldMapping
}

// Define our customer schema fields
const CUSTOMER_SCHEMA_FIELDS = [
  { field: 'first_name', label: 'First Name', required: true, type: 'text' },
  { field: 'last_name', label: 'Last Name', required: true, type: 'text' },
  { field: 'email', label: 'Email', required: true, type: 'email' },
  { field: 'phone', label: 'Phone', required: false, type: 'phone' },
  { field: 'date_of_birth', label: 'Date of Birth', required: false, type: 'date' },
  { field: 'address', label: 'Address', required: false, type: 'text' },
  { field: 'city', label: 'City', required: false, type: 'text' },
  { field: 'state', label: 'State', required: false, type: 'text' },
  { field: 'zipcode', label: 'Zip Code', required: false, type: 'text' },
  { field: 'notes', label: 'Notes', required: false, type: 'text' },
  { field: 'tags', label: 'Tags', required: false, type: 'text' },
  { field: 'customer_type', label: 'Customer Type', required: false, type: 'text' }
]

export default function DataPreview({ data, onDataMapped, existingMapping = {} }: DataPreviewProps) {
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([])
  const [currentMapping, setCurrentMapping] = useState<FieldMapping>(existingMapping)

  // Generate preview data based on current mapping
  useEffect(() => {
    const preview = data.data.slice(0, 5).map(row => {
      const mappedRow: Record<string, any> = {}
      
      Object.entries(currentMapping).forEach(([originalField, schemaField]) => {
        if (schemaField) {
          mappedRow[schemaField] = row[originalField] || ''
        }
      })
      
      return mappedRow
    })
    
    setPreviewData(preview)
  }, [data.data, currentMapping])

  const handleMappingComplete = (mapping: FieldMapping) => {
    setCurrentMapping(mapping)
    onDataMapped(mapping)
  }

  return (
    <div className="space-y-6">
      {/* File Info */}
      <Card>
        <CardHeader>
          <CardTitle>File Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Filename</div>
              <div className="font-medium">{data.filename}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">File Type</div>
              <div className="font-medium uppercase">{data.fileType}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Records</div>
              <div className="font-medium">{data.data.length.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Columns</div>
              <div className="font-medium">{data.headers.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Field Mapper Component */}
      <FieldMapper
        sourceFields={data.headers}
        targetFields={CUSTOMER_SCHEMA_FIELDS}
        onMappingComplete={handleMappingComplete}
        existingMapping={existingMapping}
        sampleData={data.data.slice(0, 5)}
      />

      {/* Data Preview */}
      {Object.keys(currentMapping).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 mb-4">
              Preview of first 5 records with your field mapping applied:
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    {CUSTOMER_SCHEMA_FIELDS
                      .filter(field => Object.values(currentMapping).includes(field.field))
                      .map(field => (
                        <th key={field.field} className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-900">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {CUSTOMER_SCHEMA_FIELDS
                        .filter(field => Object.values(currentMapping).includes(field.field))
                        .map(field => (
                          <td key={field.field} className="border border-gray-300 px-3 py-2 text-sm text-gray-900">
                            {row[field.field] || '-'}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {previewData.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No data to preview. Please map at least one field.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}