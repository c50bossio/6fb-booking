'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface FieldMapperProps {
  sourceFields: string[]
  targetFields: {
    field: string
    label: string
    required: boolean
    type: string
  }[]
  onMappingComplete: (mapping: Record<string, string>) => void
  existingMapping?: Record<string, string>
  sampleData?: Record<string, any>[]
}

export default function FieldMapper({
  sourceFields,
  targetFields,
  onMappingComplete,
  existingMapping = {},
  sampleData = []
}: FieldMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>(existingMapping)
  const [draggedField, setDraggedField] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Record<string, string>>({})

  // Auto-suggest mappings based on field names
  useEffect(() => {
    const autoSuggestions: Record<string, string> = {}
    
    sourceFields.forEach(sourceField => {
      const sourceLower = sourceField.toLowerCase().replace(/[^a-z0-9]/g, '')
      
      targetFields.forEach(targetField => {
        const targetLower = targetField.field.toLowerCase().replace(/[^a-z0-9]/g, '')
        
        // Direct match
        if (sourceLower === targetLower) {
          autoSuggestions[sourceField] = targetField.field
        }
        // Common variations
        else if (
          (sourceLower.includes('first') && targetLower === 'firstname') ||
          (sourceLower.includes('last') && targetLower === 'lastname') ||
          (sourceLower.includes('phone') && targetLower === 'phone') ||
          (sourceLower.includes('email') && targetLower === 'email') ||
          (sourceLower.includes('address') && targetLower === 'address') ||
          (sourceLower.includes('city') && targetLower === 'city') ||
          (sourceLower.includes('state') && targetLower === 'state') ||
          (sourceLower.includes('zip') && targetLower === 'zipcode') ||
          (sourceLower.includes('postal') && targetLower === 'zipcode')
        ) {
          autoSuggestions[sourceField] = targetField.field
        }
      })
    })
    
    setSuggestions(autoSuggestions)
    
    // Apply suggestions if no existing mapping
    if (Object.keys(existingMapping).length === 0) {
      setMapping(autoSuggestions)
    }
  }, [sourceFields, targetFields, existingMapping])

  const handleDragStart = (field: string) => {
    setDraggedField(field)
  }

  const handleDragEnd = () => {
    setDraggedField(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetField: string) => {
    e.preventDefault()
    if (draggedField) {
      setMapping(prev => ({
        ...prev,
        [draggedField]: targetField
      }))
    }
  }

  const handleSelectChange = (sourceField: string, value: string) => {
    if (value === '') {
      const newMapping = { ...mapping }
      delete newMapping[sourceField]
      setMapping(newMapping)
    } else {
      setMapping(prev => ({
        ...prev,
        [sourceField]: value
      }))
    }
  }

  const handleAutoMap = () => {
    setMapping(suggestions)
  }

  const handleClearAll = () => {
    setMapping({})
  }

  const handleConfirm = () => {
    onMappingComplete(mapping)
  }

  const getMappedSourceField = (targetField: string) => {
    return Object.entries(mapping).find(([_, target]) => target === targetField)?.[0]
  }

  const isValidMapping = () => {
    const requiredFields = targetFields.filter(f => f.required)
    return requiredFields.every(field => 
      Object.values(mapping).includes(field.field)
    )
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Map Your Fields</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Drag and drop your file columns to match our customer fields, or use the dropdowns to select mappings.
            Required fields are marked with an asterisk (*).
          </p>
          <div className="flex gap-3">
            <Button
              onClick={handleAutoMap}
              variant="secondary"
              size="sm"
              disabled={Object.keys(suggestions).length === 0}
            >
              Auto-Map Fields
            </Button>
            <Button
              onClick={handleClearAll}
              variant="ghost"
              size="sm"
              disabled={Object.keys(mapping).length === 0}
            >
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your File Columns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sourceFields.map(field => (
                <div
                  key={field}
                  draggable
                  onDragStart={() => handleDragStart(field)}
                  onDragEnd={handleDragEnd}
                  className={`
                    p-3 bg-gray-50 rounded-lg cursor-move border-2 transition-all
                    ${mapping[field] ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'}
                    ${draggedField === field ? 'opacity-50' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                      <span className="font-medium text-gray-800">{field}</span>
                    </div>
                    {mapping[field] && (
                      <span className="text-sm text-green-600">
                        → {targetFields.find(f => f.field === mapping[field])?.label}
                      </span>
                    )}
                  </div>
                  {sampleData.length > 0 && sampleData[0][field] && (
                    <div className="mt-1 text-xs text-gray-500 truncate">
                      Sample: {String(sampleData[0][field])}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Target Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {targetFields.map(field => {
                const mappedSource = getMappedSourceField(field.field)
                return (
                  <div
                    key={field.field}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, field.field)}
                    className={`
                      p-3 rounded-lg border-2 transition-all
                      ${mappedSource ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}
                      ${draggedField ? 'border-dashed hover:border-blue-400' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-gray-800">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">({field.type})</span>
                      </div>
                      {mappedSource && (
                        <button
                          onClick={() => handleSelectChange(mappedSource, '')}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    <select
                      value={mappedSource || ''}
                      onChange={(e) => {
                        if (mappedSource) {
                          handleSelectChange(mappedSource, '')
                        }
                        if (e.target.value) {
                          handleSelectChange(e.target.value, field.field)
                        }
                      }}
                      className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Select a column --</option>
                      {sourceFields.map(sourceField => (
                        <option 
                          key={sourceField} 
                          value={sourceField}
                          disabled={mapping[sourceField] && mapping[sourceField] !== field.field}
                        >
                          {sourceField}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mapping Summary */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              {isValidMapping() ? (
                <div className="flex items-center text-green-600">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">All required fields are mapped</span>
                </div>
              ) : (
                <div className="flex items-center text-yellow-600">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="font-medium">Please map all required fields</span>
                </div>
              )}
            </div>
            <Button
              onClick={handleConfirm}
              variant="primary"
              size="md"
              disabled={!isValidMapping()}
            >
              Confirm Mapping
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}