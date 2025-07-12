'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Scissors, 
  Save, 
  X, 
  DollarSign,
  Clock,
  Tag,
  Image,
  AlertTriangle,
  Info,
  CheckCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Service, ServiceCreateData } from '@/lib/api/catalog'

interface ServiceFormProps {
  service?: Service | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: ServiceCreateData) => Promise<void>
  mode: 'create' | 'edit'
}

const SERVICE_CATEGORIES = [
  { value: 'haircut', label: 'Haircut', description: 'Traditional and modern haircuts' },
  { value: 'shave', label: 'Shave', description: 'Traditional wet shaves and beard maintenance' },
  { value: 'beard', label: 'Beard', description: 'Beard trimming, shaping, and styling' },
  { value: 'hair_treatment', label: 'Hair Treatment', description: 'Specialized hair care treatments' },
  { value: 'styling', label: 'Styling', description: 'Hair styling and special occasion looks' },
  { value: 'color', label: 'Color', description: 'Hair coloring and highlighting services' },
  { value: 'package', label: 'Package', description: 'Service bundles and combinations' },
  { value: 'other', label: 'Other', description: 'Other specialized services' }
]

export default function ServiceForm({ 
  service, 
  isOpen, 
  onClose, 
  onSave, 
  mode 
}: ServiceFormProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState<ServiceCreateData>({
    name: service?.name || '',
    description: service?.description || '',
    category: service?.category || 'haircut',
    sku: service?.sku || '',
    base_price: service?.base_price || 0,
    min_price: service?.min_price || undefined,
    max_price: service?.max_price || undefined,
    duration_minutes: service?.duration_minutes || 30,
    buffer_time_minutes: service?.buffer_time_minutes || 0,
    is_active: service?.is_active ?? true,
    is_bookable_online: service?.is_bookable_online ?? true,
    max_advance_booking_days: service?.max_advance_booking_days || undefined,
    min_advance_booking_hours: service?.min_advance_booking_hours || undefined,
    is_package: service?.is_package || false,
    package_discount_percent: service?.package_discount_percent || undefined,
    package_discount_amount: service?.package_discount_amount || undefined,
    display_order: service?.display_order || 0,
    image_url: service?.image_url || '',
    location_id: service?.location_id || undefined
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [useVariablePricing, setUseVariablePricing] = useState(false)

  React.useEffect(() => {
    if (service?.min_price || service?.max_price) {
      setUseVariablePricing(true)
    }
  }, [service])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Service name is required'
    }

    if (!formData.category) {
      newErrors.category = 'Category is required'
    }

    if (formData.base_price <= 0) {
      newErrors.base_price = 'Base price must be greater than 0'
    }

    if (useVariablePricing) {
      if (formData.min_price && formData.min_price >= formData.base_price) {
        newErrors.min_price = 'Minimum price must be less than base price'
      }
      if (formData.max_price && formData.max_price <= formData.base_price) {
        newErrors.max_price = 'Maximum price must be greater than base price'
      }
    }

    if (formData.duration_minutes <= 0) {
      newErrors.duration_minutes = 'Duration must be greater than 0'
    }

    if (formData.buffer_time_minutes < 0) {
      newErrors.buffer_time_minutes = 'Buffer time cannot be negative'
    }

    if (formData.sku && !/^[A-Z0-9]{2,20}$/.test(formData.sku)) {
      newErrors.sku = 'SKU must be 2-20 uppercase letters and numbers'
    }

    if (formData.is_package) {
      if (!formData.package_discount_percent && !formData.package_discount_amount) {
        newErrors.package_discount = 'Package services must have a discount'
      }
      if (formData.package_discount_percent && (formData.package_discount_percent < 0 || formData.package_discount_percent > 100)) {
        newErrors.package_discount_percent = 'Discount percentage must be between 0 and 100'
      }
      if (formData.package_discount_amount && formData.package_discount_amount < 0) {
        newErrors.package_discount_amount = 'Discount amount cannot be negative'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please correct the errors below',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsLoading(true)
      
      // Clean up the data based on options
      const submitData = { ...formData }
      
      if (!useVariablePricing) {
        delete submitData.min_price
        delete submitData.max_price
      }
      
      if (!formData.is_package) {
        delete submitData.package_discount_percent
        delete submitData.package_discount_amount
      }
      
      await onSave(submitData)
      toast({
        title: 'Success',
        description: `Service ${mode === 'create' ? 'created' : 'updated'} successfully`,
      })
      onClose()
    } catch (error) {
      console.error('Failed to save service:', error)
      toast({
        title: 'Error',
        description: `Failed to ${mode} service`,
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof ServiceCreateData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const getCategoryDescription = (category: string) => {
    return SERVICE_CATEGORIES.find(cat => cat.value === category)?.description || ''
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Scissors className="h-6 w-6" />
              {mode === 'create' ? 'Add Service' : 'Edit Service'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {mode === 'create' 
                ? 'Create a new service for your barbershop'
                : 'Update service details and pricing'
              }
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
                <CardDescription>
                  Essential service details and description
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Service Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Classic Haircut"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Professional haircut with styling..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleInputChange('category', value)}
                  >
                    <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          <div>
                            <div className="font-medium">{category.label}</div>
                            <div className="text-xs text-muted-foreground">{category.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-red-500 mt-1">{errors.category}</p>
                  )}
                  {formData.category && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {getCategoryDescription(formData.category)}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="sku">SKU (Optional)</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value.toUpperCase())}
                    placeholder="HC001"
                    className={errors.sku ? 'border-red-500' : ''}
                  />
                  {errors.sku && (
                    <p className="text-sm text-red-500 mt-1">{errors.sku}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    Internal tracking code (2-20 characters)
                  </p>
                </div>

                <div>
                  <Label htmlFor="image_url">Image URL (Optional)</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => handleInputChange('image_url', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pricing and Duration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing & Duration
                </CardTitle>
                <CardDescription>
                  Service pricing and time requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="base_price">Base Price *</Label>
                  <Input
                    id="base_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.base_price}
                    onChange={(e) => handleInputChange('base_price', parseFloat(e.target.value) || 0)}
                    className={errors.base_price ? 'border-red-500' : ''}
                  />
                  {errors.base_price && (
                    <p className="text-sm text-red-500 mt-1">{errors.base_price}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="variable_pricing"
                    checked={useVariablePricing}
                    onCheckedChange={setUseVariablePricing}
                  />
                  <Label htmlFor="variable_pricing" className="text-sm">
                    Enable variable pricing (min/max range)
                  </Label>
                </div>

                {useVariablePricing && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="min_price">Minimum Price</Label>
                      <Input
                        id="min_price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.min_price || ''}
                        onChange={(e) => handleInputChange('min_price', parseFloat(e.target.value) || undefined)}
                        className={errors.min_price ? 'border-red-500' : ''}
                      />
                      {errors.min_price && (
                        <p className="text-sm text-red-500 mt-1">{errors.min_price}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="max_price">Maximum Price</Label>
                      <Input
                        id="max_price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.max_price || ''}
                        onChange={(e) => handleInputChange('max_price', parseFloat(e.target.value) || undefined)}
                        className={errors.max_price ? 'border-red-500' : ''}
                      />
                      {errors.max_price && (
                        <p className="text-sm text-red-500 mt-1">{errors.max_price}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="duration_minutes">Duration (minutes) *</Label>
                    <Input
                      id="duration_minutes"
                      type="number"
                      min="1"
                      value={formData.duration_minutes}
                      onChange={(e) => handleInputChange('duration_minutes', parseInt(e.target.value) || 0)}
                      className={errors.duration_minutes ? 'border-red-500' : ''}
                    />
                    {errors.duration_minutes && (
                      <p className="text-sm text-red-500 mt-1">{errors.duration_minutes}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDuration(formData.duration_minutes)}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="buffer_time_minutes">Buffer Time (minutes)</Label>
                    <Input
                      id="buffer_time_minutes"
                      type="number"
                      min="0"
                      value={formData.buffer_time_minutes}
                      onChange={(e) => handleInputChange('buffer_time_minutes', parseInt(e.target.value) || 0)}
                      className={errors.buffer_time_minutes ? 'border-red-500' : ''}
                    />
                    {errors.buffer_time_minutes && (
                      <p className="text-sm text-red-500 mt-1">{errors.buffer_time_minutes}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      Cleanup/prep time between appointments
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    min="0"
                    value={formData.display_order}
                    onChange={(e) => handleInputChange('display_order', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Order in which service appears in lists (0 = first)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Service Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Service Options</CardTitle>
              <CardDescription>
                Availability and booking configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                  />
                  <Label htmlFor="is_active" className="text-sm">
                    Service is active and available
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_bookable_online"
                    checked={formData.is_bookable_online}
                    onCheckedChange={(checked) => handleInputChange('is_bookable_online', checked)}
                  />
                  <Label htmlFor="is_bookable_online" className="text-sm">
                    Allow online booking
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_package"
                    checked={formData.is_package}
                    onCheckedChange={(checked) => handleInputChange('is_package', checked)}
                  />
                  <Label htmlFor="is_package" className="text-sm">
                    This is a service package
                  </Label>
                </div>
              </div>

              {/* Package Options */}
              {formData.is_package && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-4">
                  <h4 className="font-medium text-yellow-800">Package Configuration</h4>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="package_discount_percent">Discount Percentage</Label>
                      <Input
                        id="package_discount_percent"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.package_discount_percent || ''}
                        onChange={(e) => handleInputChange('package_discount_percent', parseFloat(e.target.value) || undefined)}
                        className={errors.package_discount_percent ? 'border-red-500' : ''}
                      />
                      {errors.package_discount_percent && (
                        <p className="text-sm text-red-500 mt-1">{errors.package_discount_percent}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="package_discount_amount">Discount Amount ($)</Label>
                      <Input
                        id="package_discount_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.package_discount_amount || ''}
                        onChange={(e) => handleInputChange('package_discount_amount', parseFloat(e.target.value) || undefined)}
                        className={errors.package_discount_amount ? 'border-red-500' : ''}
                      />
                      {errors.package_discount_amount && (
                        <p className="text-sm text-red-500 mt-1">{errors.package_discount_amount}</p>
                      )}
                    </div>
                  </div>
                  
                  {errors.package_discount && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.package_discount}</AlertDescription>
                    </Alert>
                  )}
                  
                  <p className="text-sm text-yellow-700">
                    Use either percentage or fixed amount discount, not both
                  </p>
                </div>
              )}

              {/* Booking Restrictions */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="max_advance_booking_days">Max Advance Booking (days)</Label>
                  <Input
                    id="max_advance_booking_days"
                    type="number"
                    min="1"
                    value={formData.max_advance_booking_days || ''}
                    onChange={(e) => handleInputChange('max_advance_booking_days', parseInt(e.target.value) || undefined)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Leave empty for no limit
                  </p>
                </div>
                <div>
                  <Label htmlFor="min_advance_booking_hours">Min Advance Booking (hours)</Label>
                  <Input
                    id="min_advance_booking_hours"
                    type="number"
                    min="0"
                    value={formData.min_advance_booking_hours || ''}
                    onChange={(e) => handleInputChange('min_advance_booking_hours', parseInt(e.target.value) || undefined)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Minimum notice required
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div>
              {mode === 'create' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Service will be created and available immediately
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {mode === 'create' ? 'Create Service' : 'Save Changes'}
                  </div>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}