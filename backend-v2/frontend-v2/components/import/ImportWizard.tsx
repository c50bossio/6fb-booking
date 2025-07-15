'use client'

import { useState, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import FileUpload from './FileUpload'
import DataPreview from './DataPreview'
import ImportProgress from './ImportProgress'

export interface ImportedData {
  filename: string
  headers: string[]
  data: Record<string, any>[]
  fileType: 'csv' | 'excel' | 'json'
}

export interface FieldMapping {
  [originalField: string]: string // maps to our schema field
}

export interface ImportStep {
  id: number
  title: string
  description: string
  completed: boolean
}

const steps: ImportStep[] = [
  {
    id: 1,
    title: 'Upload File',
    description: 'Select and upload your customer data file',
    completed: false
  },
  {
    id: 2,
    title: 'Preview Data',
    description: 'Review and map your data fields',
    completed: false
  },
  {
    id: 3,
    title: 'Import',
    description: 'Import your customers into the system',
    completed: false
  }
]

export default function ImportWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [importSteps, setImportSteps] = useState(steps)
  const [importedData, setImportedData] = useState<ImportedData | null>(null)
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({})
  const [importProgress, setImportProgress] = useState({
    isImporting: false,
    progress: 0,
    total: 0,
    completed: 0,
    errors: [],
    results: null
  })

  const updateStepCompletion = useCallback((stepId: number, completed: boolean) => {
    setImportSteps(prev => 
      prev.map(step => 
        step.id === stepId ? { ...step, completed } : step
      )
    )
  }, [])

  const handleFileUpload = useCallback((data: ImportedData) => {
    setImportedData(data)
    updateStepCompletion(1, true)
    setCurrentStep(2)
  }, [updateStepCompletion])

  const handleDataMapped = useCallback((mapping: FieldMapping) => {
    setFieldMapping(mapping)
    updateStepCompletion(2, true)
    setCurrentStep(3)
  }, [updateStepCompletion])

  const handleImportComplete = useCallback((results: any) => {
    updateStepCompletion(3, true)
    setImportProgress(prev => ({
      ...prev,
      isImporting: false,
      results
    }))
  }, [updateStepCompletion])

  const handleStartOver = useCallback(() => {
    setCurrentStep(1)
    setImportedData(null)
    setFieldMapping({})
    setImportProgress({
      isImporting: false,
      progress: 0,
      total: 0,
      completed: 0,
      errors: [],
      results: null
    })
    setImportSteps(steps.map(step => ({ ...step, completed: false })))
  }, [])

  const goToStep = useCallback((stepId: number) => {
    if (stepId <= currentStep || importSteps[stepId - 1]?.completed) {
      setCurrentStep(stepId)
    }
  }, [currentStep, importSteps])

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Import Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {importSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => goToStep(step.id)}
                    disabled={step.id > currentStep && !step.completed}
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                      ${step.completed 
                        ? 'bg-green-600 text-white' 
                        : step.id === currentStep 
                          ? 'bg-blue-600 text-white' 
                          : step.id < currentStep 
                            ? 'bg-gray-300 text-gray-600 hover:bg-gray-400 cursor-pointer' 
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    {step.completed ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step.id
                    )}
                  </button>
                  <div className="mt-2 text-center">
                    <div className={`text-sm font-medium ${step.id === currentStep ? 'text-blue-600' : 'text-gray-700'}`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 max-w-24">
                      {step.description}
                    </div>
                  </div>
                </div>
                {index < importSteps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${step.completed ? 'bg-green-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <FileUpload 
            onFileUpload={handleFileUpload}
            isLoading={false}
          />
        )}

        {currentStep === 2 && importedData && (
          <DataPreview
            data={importedData}
            onDataMapped={handleDataMapped}
            existingMapping={fieldMapping}
          />
        )}

        {currentStep === 3 && importedData && (
          <ImportProgress
            importedData={importedData}
            fieldMapping={fieldMapping}
            onImportComplete={handleImportComplete}
            progress={importProgress}
            onProgressUpdate={setImportProgress}
          />
        )}
      </div>

      {/* Action Buttons */}
      <Card>
        <CardContent>
          <div className="flex justify-between">
            <div>
              {importProgress.results && (
                <Button
                  onClick={handleStartOver}
                  variant="secondary"
                  size="md"
                >
                  Import More Data
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              {currentStep > 1 && !importProgress.isImporting && (
                <Button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  variant="secondary"
                  size="md"
                >
                  Previous
                </Button>
              )}
              {currentStep < 3 && importSteps[currentStep - 1]?.completed && (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  variant="primary"
                  size="md"
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}