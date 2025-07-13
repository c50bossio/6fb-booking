'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  MapPin, 
  Save, 
  X, 
  Building2,
  DollarSign,
  Clock,
  Users,
  Scissors,
  CheckCircle,
  AlertTriangle,
  Wrench
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface LocationFormData {
  name: string
  code: string
  address: string
  city: string
  state: string
  zip_code: string
  phone?: string
  email?: string
  status: 'active' | 'inactive' | 'coming_soon' | 'closed'
  compensation_model: 'booth_rental' | 'commission' | 'hybrid' | 'custom'
  total_chairs: number
  active_chairs: number
  timezone: string
  currency: string
  business_hours: Record<string, any>
  compensation_config: Record<string, any>
  description?: string
}

interface LocationFormProps {
  location?: any
  organization?: any
  isOpen: boolean
  onClose: () => void
  onSave: (data: LocationFormData) => Promise<void>
  mode: 'create' | 'edit'
}

const DEFAULT_BUSINESS_HOURS = {
  monday: { open: '09:00', close: '18:00', closed: false },
  tuesday: { open: '09:00', close: '18:00', closed: false },
  wednesday: { open: '09:00', close: '18:00', closed: false },
  thursday: { open: '09:00', close: '18:00', closed: false },
  friday: { open: '09:00', close: '18:00', closed: false },
  saturday: { open: '09:00', close: '16:00', closed: false },
  sunday: { open: '10:00', close: '16:00', closed: true }
}

const DEFAULT_COMPENSATION_CONFIG = {
  booth_rental: {
    weekly_rate: 150,
    monthly_rate: 600,
    deposit: 200
  },
  commission: {
    base_rate: 0.60,
    tier_1_rate: 0.65,
    tier_1_threshold: 1000,
    tier_2_rate: 0.70,
    tier_2_threshold: 2000
  },
  hybrid: {
    base_rental: 100,
    commission_rate: 0.40,
    minimum_weekly: 200
  }
}

export default function LocationForm({ 
  location, 
  organization,
  isOpen, 
  onClose, 
  onSave, 
  mode 
}: LocationFormProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState<LocationFormData>({
    name: location?.name || '',
    code: location?.code || '',
    address: location?.address || '',
    city: location?.city || '',
    state: location?.state || '',
    zip_code: location?.zip_code || '',
    phone: location?.phone || '',
    email: location?.email || '',
    status: location?.status || 'active',
    compensation_model: location?.compensation_model || 'commission',
    total_chairs: location?.total_chairs || 6,
    active_chairs: location?.active_chairs || 6,
    timezone: location?.timezone || 'America/New_York',
    currency: location?.currency || 'USD',
    business_hours: location?.business_hours || DEFAULT_BUSINESS_HOURS,
    compensation_config: location?.compensation_config || DEFAULT_COMPENSATION_CONFIG.commission,
    description: location?.description || ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Location name is required'
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Location code is required'
    } else if (!/^[A-Z0-9]{2,10}$/.test(formData.code)) {
      newErrors.code = 'Code must be 2-10 uppercase letters and numbers'
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required'
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required'
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required'
    }

    if (!formData.zip_code.trim()) {
      newErrors.zip_code = 'ZIP code is required'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address'
    }

    if (formData.phone && !/^[\d\s\-\(\)\+]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format'
    }

    if (formData.total_chairs < 1 || formData.total_chairs > 50) {
      newErrors.total_chairs = 'Total chairs must be between 1 and 50'
    }

    if (formData.active_chairs < 0 || formData.active_chairs > formData.total_chairs) {
      newErrors.active_chairs = 'Active chairs must be between 0 and total chairs'
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
      await onSave(formData)
      toast({
        title: 'Success',
        description: `Location ${mode === 'create' ? 'created' : 'updated'} successfully`,
      })
      onClose()
    } catch (error) {
      console.error('Failed to save location:', error)
      toast({
        title: 'Error',
        description: `Failed to ${mode} location`,
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof LocationFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Auto-update compensation config when model changes
    if (field === 'compensation_model') {
      setFormData(prev => ({
        ...prev,
        compensation_config: DEFAULT_COMPENSATION_CONFIG[value as keyof typeof DEFAULT_COMPENSATION_CONFIG] || {}
      }))
    }
  }

  const handleBusinessHoursChange = (day: string, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [day]: {
          ...prev.business_hours[day],
          [field]: value
        }
      }
    }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'coming_soon': return 'bg-blue-100 text-blue-800'
      case 'inactive': return 'bg-yellow-100 text-yellow-800'
      case 'closed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCompensationModelDescription = (model: string) => {
    switch (model) {
      case 'booth_rental':
        return 'Fixed weekly/monthly rental fee for chair space'
      case 'commission':
        return 'Percentage-based earnings from service revenue'
      case 'hybrid':
        return 'Combination of base rental and commission'
      case 'custom':
        return 'Custom compensation structure'
      default:
        return ''
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              {mode === 'create' ? 'Add Location' : 'Edit Location'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {mode === 'create' 
                ? `Add a new location to ${organization?.name}`
                : 'Update location details and configuration'
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
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Essential location details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Location Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Downtown Elite Barbershop"
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="code">Location Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                      placeholder="DTE001"
                      className={errors.code ? 'border-red-500' : ''}
                    />
                    {errors.code && (
                      <p className="text-sm text-red-500 mt-1">{errors.code}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Street Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="123 Main Street"
                    className={errors.address ? 'border-red-500' : ''}
                  />
                  {errors.address && (
                    <p className="text-sm text-red-500 mt-1">{errors.address}</p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="New York"
                      className={errors.city ? 'border-red-500' : ''}
                    />
                    {errors.city && (
                      <p className="text-sm text-red-500 mt-1">{errors.city}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="NY"
                      className={errors.state ? 'border-red-500' : ''}
                    />
                    {errors.state && (
                      <p className="text-sm text-red-500 mt-1">{errors.state}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="zip_code">ZIP Code *</Label>
                    <Input
                      id="zip_code"
                      value={formData.zip_code}
                      onChange={(e) => handleInputChange('zip_code', e.target.value)}
                      placeholder="10001"
                      className={errors.zip_code ? 'border-red-500' : ''}
                    />
                    {errors.zip_code && (
                      <p className="text-sm text-red-500 mt-1">{errors.zip_code}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                      className={errors.phone ? 'border-red-500' : ''}
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="downtown@elitebarbershop.com"
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Brief description of this location..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Operations Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Scissors className="h-5 w-5" />
                  Operations Configuration
                </CardTitle>
                <CardDescription>
                  Status, capacity, and operational settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="coming_soon">Coming Soon</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="mt-2">
                    <Badge className={getStatusColor(formData.status)}>
                      {formData.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="total_chairs">Total Chairs</Label>
                    <Input
                      id="total_chairs"
                      type="number"
                      min="1"
                      max="50"
                      value={formData.total_chairs}
                      onChange={(e) => handleInputChange('total_chairs', parseInt(e.target.value) || 0)}
                      className={errors.total_chairs ? 'border-red-500' : ''}
                    />
                    {errors.total_chairs && (
                      <p className="text-sm text-red-500 mt-1">{errors.total_chairs}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="active_chairs">Active Chairs</Label>
                    <Input
                      id="active_chairs"
                      type="number"
                      min="0"
                      max={formData.total_chairs}
                      value={formData.active_chairs}
                      onChange={(e) => handleInputChange('active_chairs', parseInt(e.target.value) || 0)}
                      className={errors.active_chairs ? 'border-red-500' : ''}
                    />
                    {errors.active_chairs && (
                      <p className="text-sm text-red-500 mt-1">{errors.active_chairs}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={formData.timezone}
                      onValueChange={(value) => handleInputChange('timezone', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => handleInputChange('currency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="CAD">CAD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compensation Model */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Compensation Model
              </CardTitle>
              <CardDescription>
                Configure how barbers are compensated at this location
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="compensation_model">Compensation Model</Label>
                <Select
                  value={formData.compensation_model}
                  onValueChange={(value) => handleInputChange('compensation_model', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="booth_rental">Booth Rental</SelectItem>
                    <SelectItem value="commission">Commission</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  {getCompensationModelDescription(formData.compensation_model)}
                </p>
              </div>

              {/* Model-specific configuration */}
              {formData.compensation_model === 'commission' && (
                <div className="grid gap-4 md:grid-cols-3 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-sm">Base Rate (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.compensation_config.base_rate * 100}
                      onChange={(e) => handleInputChange('compensation_config', {
                        ...formData.compensation_config,
                        base_rate: parseFloat(e.target.value) / 100
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Tier 1 Threshold ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.compensation_config.tier_1_threshold}
                      onChange={(e) => handleInputChange('compensation_config', {
                        ...formData.compensation_config,
                        tier_1_threshold: parseInt(e.target.value)
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Tier 1 Rate (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.compensation_config.tier_1_rate * 100}
                      onChange={(e) => handleInputChange('compensation_config', {
                        ...formData.compensation_config,
                        tier_1_rate: parseFloat(e.target.value) / 100
                      })}
                    />
                  </div>
                </div>
              )}

              {formData.compensation_model === 'booth_rental' && (
                <div className="grid gap-4 md:grid-cols-3 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-sm">Weekly Rate ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.compensation_config.weekly_rate}
                      onChange={(e) => handleInputChange('compensation_config', {
                        ...formData.compensation_config,
                        weekly_rate: parseInt(e.target.value)
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Monthly Rate ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.compensation_config.monthly_rate}
                      onChange={(e) => handleInputChange('compensation_config', {
                        ...formData.compensation_config,
                        monthly_rate: parseInt(e.target.value)
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Security Deposit ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.compensation_config.deposit}
                      onChange={(e) => handleInputChange('compensation_config', {
                        ...formData.compensation_config,
                        deposit: parseInt(e.target.value)
                      })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Business Hours
              </CardTitle>
              <CardDescription>
                Set operating hours for each day of the week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(formData.business_hours).map(([day, hours]) => (
                  <div key={day} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="w-20">
                      <Label className="capitalize font-medium">{day}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!hours.closed}
                        onChange={(e) => handleBusinessHoursChange(day, 'closed', !e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Open</span>
                    </div>
                    {!hours.closed && (
                      <>
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={hours.open}
                            onChange={(e) => handleBusinessHoursChange(day, 'open', e.target.value)}
                            className="w-32"
                          />
                          <span className="text-sm text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={hours.close}
                            onChange={(e) => handleBusinessHoursChange(day, 'close', e.target.value)}
                            className="w-32"
                          />
                        </div>
                      </>
                    )}
                    {hours.closed && (
                      <span className="text-sm text-muted-foreground italic">Closed</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div>
              {mode === 'create' && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Location will be created with {formData.active_chairs} active chairs
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
                    {mode === 'create' ? 'Create Location' : 'Save Changes'}
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