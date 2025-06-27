'use client'

import { useState } from 'react'
import {
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  CodeBracketIcon,
  Cog6ToothIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  GlobeAltIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { schemaMarkupAPI, SchemaMarkup, SCHEMA_TYPES } from '@/lib/api/local-seo'

interface SchemaMarkupManagerProps {
  schemas: SchemaMarkup[]
  onSchemasUpdate: () => void
}

export default function SchemaMarkupManager({ schemas, onSchemasUpdate }: SchemaMarkupManagerProps) {
  const [showGenerator, setShowGenerator] = useState(false)
  const [selectedSchemaType, setSelectedSchemaType] = useState('local_business')
  const [businessData, setBusinessData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    website: '',
    hours: '',
    priceRange: '',
    services: '',
    logo: '',
    image: ''
  })
  const [generatedSchema, setGeneratedSchema] = useState<any>(null)
  const [validating, setValidating] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState<Set<string>>(new Set())

  const handleGenerateSchema = async () => {
    try {
      const response = await schemaMarkupAPI.generateSchema(selectedSchemaType, businessData)
      if (response.success) {
        setGeneratedSchema(response.schema)
      }
    } catch (error) {
      console.error('Error generating schema:', error)
    }
  }

  const handleSaveSchema = async () => {
    if (!generatedSchema) return

    try {
      await schemaMarkupAPI.updateSchema(generatedSchema.id || 'new', {
        schema_type: selectedSchemaType as any,
        json_ld: generatedSchema.json_ld,
        pages: ['home'],
        is_valid: true,
        validation_errors: [],
        implementation_status: 'pending' as const
      })
      setShowGenerator(false)
      setGeneratedSchema(null)
      onSchemasUpdate()
    } catch (error) {
      console.error('Error saving schema:', error)
    }
  }

  const handleValidateSchema = async (schemaId: string) => {
    setValidating(prev => new Set(prev).add(schemaId))
    try {
      await schemaMarkupAPI.validateSchema(schemaId)
      onSchemasUpdate()
    } catch (error) {
      console.error('Error validating schema:', error)
    } finally {
      setValidating(prev => {
        const newSet = new Set(prev)
        newSet.delete(schemaId)
        return newSet
      })
    }
  }

  const handleDeleteSchema = async (schemaId: string) => {
    if (confirm('Are you sure you want to delete this schema markup?')) {
      try {
        await schemaMarkupAPI.deleteSchema(schemaId)
        onSchemasUpdate()
      } catch (error) {
        console.error('Error deleting schema:', error)
      }
    }
  }

  const handleCopySchema = async (schemaId: string, jsonLd: any) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(jsonLd, null, 2))
      setCopied(prev => new Set(prev).add(schemaId))
      setTimeout(() => {
        setCopied(prev => {
          const newSet = new Set(prev)
          newSet.delete(schemaId)
          return newSet
        })
      }, 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  const getSchemaIcon = (type: string) => {
    switch (type) {
      case 'local_business':
      case 'barber_shop':
        return <BuildingStorefrontIcon className="h-5 w-5" />
      case 'organization':
        return <UserGroupIcon className="h-5 w-5" />
      case 'website':
        return <GlobeAltIcon className="h-5 w-5" />
      default:
        return <DocumentTextIcon className="h-5 w-5" />
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      implemented: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      needs_update: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
    }

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status === 'pending' && <Cog6ToothIcon className="h-3 w-3 mr-1" />}
        {status === 'implemented' && <CheckCircleIcon className="h-3 w-3 mr-1" />}
        {status === 'needs_update' && <ExclamationTriangleIcon className="h-3 w-3 mr-1" />}
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </span>
    )
  }

  const getValidationBadge = (isValid: boolean, errors: string[]) => {
    if (isValid) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
          <CheckCircleIcon className="h-3 w-3 mr-1" />
          Valid
        </span>
      )
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
        <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
        {errors.length} error{errors.length > 1 ? 's' : ''}
      </span>
    )
  }

  const getSchemaStats = () => {
    const totalSchemas = schemas.length
    const validSchemas = schemas.filter(s => s.is_valid).length
    const implementedSchemas = schemas.filter(s => s.implementation_status === 'implemented').length
    const errorCount = schemas.reduce((sum, s) => sum + s.validation_errors.length, 0)

    return {
      totalSchemas,
      validSchemas,
      implementedSchemas,
      errorCount
    }
  }

  const stats = getSchemaStats()

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl">
              <DocumentTextIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Total Schemas</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalSchemas}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Valid Schemas</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.validSchemas}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <CodeBracketIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Implemented</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.implementedSchemas}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl">
              <ExclamationTriangleIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Errors</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.errorCount}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Schema Markup</h2>
        <button
          onClick={() => setShowGenerator(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Generate Schema</span>
        </button>
      </div>

      {/* Schema Generator */}
      {showGenerator && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Schema Markup Generator</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Schema Type
                </label>
                <select
                  value={selectedSchemaType}
                  onChange={(e) => setSelectedSchemaType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {Object.entries(SCHEMA_TYPES).map(([key, value]) => (
                    <option key={value} value={value}>
                      {key.replace('_', ' ').charAt(0).toUpperCase() + key.replace('_', ' ').slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={businessData.name}
                    onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Your Barbershop"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={businessData.phone}
                    onChange={(e) => setBusinessData({ ...businessData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={businessData.address}
                    onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="123 Main St, City, State 12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={businessData.website}
                    onChange={(e) => setBusinessData({ ...businessData, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="https://yourbarbershop.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price Range
                  </label>
                  <input
                    type="text"
                    value={businessData.priceRange}
                    onChange={(e) => setBusinessData({ ...businessData, priceRange: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="$$"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={businessData.description}
                    onChange={(e) => setBusinessData({ ...businessData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Professional barbershop offering premium haircuts and grooming services..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowGenerator(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateSchema}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Generate Schema
                </button>
              </div>
            </div>

            {generatedSchema && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Generated Schema</h4>
                <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
                  <pre className="text-green-400 text-sm">
                    {JSON.stringify(generatedSchema.json_ld, null, 2)}
                  </pre>
                </div>
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => handleCopySchema('generated', generatedSchema.json_ld)}
                    className="flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={handleSaveSchema}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Save Schema
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schemas List */}
      <div className="space-y-4">
        {schemas.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8">
            <div className="text-center">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No schema markup found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Generate your first schema markup to help search engines understand your business.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowGenerator(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Generate Schema
                </button>
              </div>
            </div>
          </div>
        ) : (
          schemas.map((schema) => (
            <div key={schema.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getSchemaIcon(schema.schema_type)}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                      {schema.schema_type.replace('_', ' ')} Schema
                    </h3>
                  </div>
                  {getStatusBadge(schema.implementation_status)}
                  {getValidationBadge(schema.is_valid, schema.validation_errors)}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleValidateSchema(schema.id)}
                    disabled={validating.has(schema.id)}
                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
                    title="Validate Schema"
                  >
                    <ArrowPathIcon className={`h-5 w-5 ${validating.has(schema.id) ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleCopySchema(schema.id, schema.json_ld)}
                    className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                    title="Copy Schema"
                  >
                    <ClipboardDocumentIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteSchema(schema.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete Schema"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Implementation Pages</p>
                  <div className="flex flex-wrap gap-2">
                    {schema.pages.map((page, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                      >
                        {page}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Last Tested</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(schema.last_tested).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {schema.validation_errors.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Validation Errors:</h4>
                  <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                    {schema.validation_errors.map((error, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <ExclamationTriangleIcon className="h-3 w-3" />
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {copied.has(schema.id) && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Schema copied to clipboard!
                  </p>
                </div>
              )}

              <details className="group">
                <summary className="flex items-center space-x-2 cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                  <EyeIcon className="h-4 w-4" />
                  <span>View Schema Code</span>
                </summary>
                <div className="mt-3 bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
                  <pre className="text-green-400 text-sm">
                    {JSON.stringify(schema.json_ld, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
