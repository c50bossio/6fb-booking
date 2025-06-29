'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ImportedData, FieldMapping } from './ImportWizard'
import { importClients } from '@/lib/api'

interface ImportProgressProps {
  importedData: ImportedData
  fieldMapping: FieldMapping
  onImportComplete: (results: any) => void
  progress: {
    isImporting: boolean
    progress: number
    total: number
    completed: number
    errors: any[]
    results: any
  }
  onProgressUpdate: (progress: any) => void
}

export default function ImportProgress({
  importedData,
  fieldMapping,
  onImportComplete,
  progress,
  onProgressUpdate
}: ImportProgressProps) {
  const [showDetails, setShowDetails] = useState(false)

  const startImport = async () => {
    onProgressUpdate({
      isImporting: true,
      progress: 0,
      total: importedData.data.length,
      completed: 0,
      errors: [],
      results: null
    })

    try {
      // Transform data based on field mapping
      const mappedData = importedData.data.map(row => {
        const mappedRow: Record<string, any> = {}
        Object.entries(fieldMapping).forEach(([originalField, mappedField]) => {
          if (mappedField && row[originalField] !== undefined) {
            mappedRow[mappedField] = row[originalField]
          }
        })
        return mappedRow
      })

      // Simulate batch processing with progress updates
      const batchSize = 50
      const batches = []
      for (let i = 0; i < mappedData.length; i += batchSize) {
        batches.push(mappedData.slice(i, i + batchSize))
      }

      let completed = 0
      const errors: any[] = []
      const successful: any[] = []

      for (const [index, batch] of batches.entries()) {
        try {
          // Import batch
          const result = await importClients(batch)
          
          if (result.successful) {
            successful.push(...result.successful)
          }
          if (result.errors) {
            errors.push(...result.errors)
          }

          completed += batch.length
          onProgressUpdate({
            isImporting: true,
            progress: (completed / importedData.data.length) * 100,
            total: importedData.data.length,
            completed,
            errors,
            results: null
          })

          // Small delay between batches to avoid overwhelming the server
          if (index < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        } catch (error) {
          console.error('Batch import error:', error)
          errors.push({
            batch: index,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      const results = {
        total: importedData.data.length,
        successful: successful.length,
        failed: errors.length,
        errors,
        successfulRecords: successful
      }

      onProgressUpdate({
        isImporting: false,
        progress: 100,
        total: importedData.data.length,
        completed: importedData.data.length,
        errors,
        results
      })

      onImportComplete(results)
    } catch (error) {
      console.error('Import error:', error)
      onProgressUpdate({
        isImporting: false,
        progress: 0,
        total: importedData.data.length,
        completed: 0,
        errors: [{
          general: error instanceof Error ? error.message : 'Import failed'
        }],
        results: null
      })
    }
  }

  const getProgressColor = () => {
    if (progress.errors.length > 0) return 'bg-yellow-500'
    if (progress.progress === 100) return 'bg-green-500'
    return 'bg-blue-500'
  }

  return (
    <div className="space-y-6">
      {/* Import Status */}
      <Card>
        <CardHeader>
          <CardTitle>Import Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {!progress.isImporting && !progress.results && (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ready to Import {importedData.data.length} Customers
              </h3>
              <p className="text-gray-600 mb-6">
                Click the button below to start importing your customer data
              </p>
              <Button
                onClick={startImport}
                variant="primary"
                size="lg"
                className="mx-auto"
              >
                Start Import
              </Button>
            </div>
          )}

          {progress.isImporting && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Importing... {progress.completed} of {progress.total}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {Math.round(progress.progress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`${getProgressColor()} h-3 rounded-full transition-all duration-300`}
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              {progress.errors.length > 0 && (
                <p className="text-sm text-yellow-600 mt-2">
                  {progress.errors.length} errors encountered
                </p>
              )}
            </div>
          )}

          {progress.results && (
            <div>
              <div className="flex items-center justify-center mb-6">
                {progress.results.failed === 0 ? (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Import Complete!</h3>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Import Completed with Warnings</h3>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{progress.results.total}</div>
                  <div className="text-sm text-gray-600">Total Records</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{progress.results.successful}</div>
                  <div className="text-sm text-gray-600">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{progress.results.failed}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
              </div>

              {progress.results.failed > 0 && (
                <div className="border-t pt-4">
                  <Button
                    onClick={() => setShowDetails(!showDetails)}
                    variant="secondary"
                    size="sm"
                    className="w-full"
                  >
                    {showDetails ? 'Hide' : 'Show'} Error Details
                  </Button>
                  
                  {showDetails && (
                    <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                      {progress.results.errors.map((error: any, index: number) => (
                        <div key={index} className="bg-red-50 border border-red-200 rounded p-3">
                          <p className="text-sm text-red-800">
                            {error.row ? `Row ${error.row}: ` : ''}
                            {error.message || error.error || JSON.stringify(error)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Summary */}
      {progress.results && progress.results.successful > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Import Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-700">
                  Successfully imported {progress.results.successful} customer records
                </span>
              </div>
              <div className="flex items-center text-sm">
                <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="text-gray-700">
                  Data imported from: {importedData.filename}
                </span>
              </div>
              <div className="flex items-center text-sm">
                <svg className="w-5 h-5 text-purple-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-700">
                  Import completed at: {new Date().toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}