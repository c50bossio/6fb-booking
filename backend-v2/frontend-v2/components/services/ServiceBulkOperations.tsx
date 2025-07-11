'use client'

import { useState } from 'react'
import { 
  Package, 
  Edit, 
  Trash2, 
  ToggleLeft, 
  ToggleRight,
  Tag,
  Clock,
  DollarSign,
  Copy,
  Download,
  Upload,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Badge } from '@/components/ui/Badge'
import { Checkbox } from '@/components/ui/checkbox'
import { type Service } from '@/lib/api'

interface ServiceBulkOperationsProps {
  services: Service[]
  selectedServices: number[]
  onBulkAction: (action: string, data?: any) => Promise<void>
}

export default function ServiceBulkOperations({
  services,
  selectedServices,
  onBulkAction
}: ServiceBulkOperationsProps) {
  const [operation, setOperation] = useState<string>('edit-price')
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<any>(null)
  
  // Bulk edit form state
  const [bulkData, setBulkData] = useState({
    priceAdjustment: { type: 'percentage', value: 10 },
    durationAdjustment: { type: 'fixed', value: 0 },
    category: '',
    status: 'no-change',
    tags: '',
    bookingSettings: {
      requireDeposit: false,
      depositAmount: 0,
      cancellationWindow: 24
    }
  })

  const selectedServiceData = services.filter(s => selectedServices.includes(s.id))

  const operations = [
    { value: 'edit-price', label: 'Adjust Pricing', icon: DollarSign },
    { value: 'edit-duration', label: 'Change Duration', icon: Clock },
    { value: 'edit-category', label: 'Update Category', icon: Tag },
    { value: 'toggle-status', label: 'Toggle Active Status', icon: ToggleLeft },
    { value: 'duplicate', label: 'Duplicate Services', icon: Copy },
    { value: 'delete', label: 'Delete Services', icon: Trash2 },
    { value: 'export', label: 'Export Selected', icon: Download },
    { value: 'edit-settings', label: 'Booking Settings', icon: Settings }
  ]

  const handleExecute = async () => {
    if (selectedServices.length === 0) return
    
    setProcessing(true)
    try {
      await onBulkAction(operation, {
        serviceIds: selectedServices,
        data: bulkData
      })
      
      setResults({
        success: true,
        message: `Successfully applied ${operation} to ${selectedServices.length} services`
      })
    } catch (error) {
      setResults({
        success: false,
        message: `Failed to apply operation: ${error.message}`
      })
    } finally {
      setProcessing(false)
    }
  }

  const renderOperationForm = () => {
    switch (operation) {
      case 'edit-price':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Adjustment Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setBulkData({
                    ...bulkData,
                    priceAdjustment: { ...bulkData.priceAdjustment, type: 'percentage' }
                  })}
                  className={`p-3 rounded-lg border-2 ${
                    bulkData.priceAdjustment.type === 'percentage'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <Percent className="w-4 h-4 mx-auto mb-1" />
                  <span className="text-sm">Percentage</span>
                </button>
                <button
                  onClick={() => setBulkData({
                    ...bulkData,
                    priceAdjustment: { ...bulkData.priceAdjustment, type: 'fixed' }
                  })}
                  className={`p-3 rounded-lg border-2 ${
                    bulkData.priceAdjustment.type === 'fixed'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <DollarSign className="w-4 h-4 mx-auto mb-1" />
                  <span className="text-sm">Fixed Amount</span>
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                {bulkData.priceAdjustment.type === 'percentage' ? 'Percentage Change' : 'Amount Change'}
              </label>
              <Input
                type="number"
                value={bulkData.priceAdjustment.value}
                onChange={(e) => setBulkData({
                  ...bulkData,
                  priceAdjustment: { ...bulkData.priceAdjustment, value: parseFloat(e.target.value) }
                })}
                placeholder={bulkData.priceAdjustment.type === 'percentage' ? 'e.g., 10 for 10%' : 'e.g., 5 for $5'}
              />
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                This will {bulkData.priceAdjustment.value >= 0 ? 'increase' : 'decrease'} prices by{' '}
                {bulkData.priceAdjustment.type === 'percentage' 
                  ? `${Math.abs(bulkData.priceAdjustment.value)}%`
                  : `$${Math.abs(bulkData.priceAdjustment.value)}`
                } for {selectedServices.length} selected services.
              </p>
            </div>
          </div>
        )

      case 'edit-duration':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Duration Change (minutes)</label>
              <Input
                type="number"
                value={bulkData.durationAdjustment.value}
                onChange={(e) => setBulkData({
                  ...bulkData,
                  durationAdjustment: { ...bulkData.durationAdjustment, value: parseInt(e.target.value) }
                })}
                placeholder="e.g., 15 to add 15 minutes, -15 to reduce"
              />
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                This will {bulkData.durationAdjustment.value >= 0 ? 'add' : 'reduce'}{' '}
                {Math.abs(bulkData.durationAdjustment.value)} minutes to each selected service.
              </p>
            </div>
          </div>
        )

      case 'edit-category':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">New Category</label>
              <Select
                value={bulkData.category}
                onValueChange={(value) => setBulkData({ ...bulkData, category: value })}
              >
                <option value="">Select Category</option>
                <option value="haircuts">Haircuts</option>
                <option value="beard_services">Beard Services</option>
                <option value="hair_treatments">Hair Treatments</option>
                <option value="packages">Packages</option>
                <option value="premium_services">Premium Services</option>
              </Select>
            </div>
          </div>
        )

      case 'toggle-status':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                This will toggle the active status of all selected services:
              </p>
              <ul className="mt-2 space-y-1">
                <li className="text-sm">• Active services → Inactive</li>
                <li className="text-sm">• Inactive services → Active</li>
              </ul>
            </div>
          </div>
        )

      case 'delete':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-800 font-medium mb-2">
                ⚠️ Warning: This action cannot be undone!
              </p>
              <p className="text-sm text-red-700">
                You are about to delete {selectedServices.length} services. 
                Services with existing bookings will be deactivated instead of deleted.
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Selection Summary */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="font-medium">
                {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            {selectedServices.length > 0 && (
              <div className="flex gap-2">
                <Badge variant="blue">
                  Total Value: ${selectedServiceData.reduce((sum, s) => sum + s.base_price, 0).toFixed(2)}
                </Badge>
                <Badge variant="blue">
                  Avg Duration: {Math.round(selectedServiceData.reduce((sum, s) => sum + s.duration_minutes, 0) / selectedServiceData.length)}min
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Operation Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Choose Bulk Operation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {operations.map((op) => {
              const Icon = op.icon
              return (
                <button
                  key={op.value}
                  onClick={() => setOperation(op.value)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    operation === op.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  disabled={selectedServices.length === 0}
                >
                  <Icon className="w-5 h-5 mx-auto mb-2" />
                  <p className="text-sm font-medium">{op.label}</p>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Operation Form */}
      {selectedServices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {operations.find(op => op.value === operation)?.label} Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderOperationForm()}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && (
        <Card className={results.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {results.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <p className={results.success ? 'text-green-800' : 'text-red-800'}>
                {results.message}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          variant="primary"
          onClick={handleExecute}
          disabled={selectedServices.length === 0 || processing}
          className="flex-1"
        >
          {processing ? 'Processing...' : 'Execute Operation'}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setOperation('edit-price')
            setBulkData({
              priceAdjustment: { type: 'percentage', value: 10 },
              durationAdjustment: { type: 'fixed', value: 0 },
              category: '',
              status: 'no-change',
              tags: '',
              bookingSettings: {
                requireDeposit: false,
                depositAmount: 0,
                cancellationWindow: 24
              }
            })
            setResults(null)
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  )
}