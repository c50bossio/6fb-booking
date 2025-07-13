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
  Building2, 
  Save, 
  X, 
  Calendar, 
  DollarSign,
  Users,
  MapPin,
  AlertTriangle,
  Clock,
  CheckCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface OrganizationFormData {
  name: string
  type: 'headquarters' | 'location' | 'franchise' | 'independent'
  billing_plan: 'individual' | 'studio' | 'salon' | 'enterprise'
  address?: string
  city?: string
  state?: string
  phone?: string
  email?: string
  website?: string
  description?: string
  trial_duration_days?: number
}

interface OrganizationFormProps {
  organization?: any
  isOpen: boolean
  onClose: () => void
  onSave: (data: OrganizationFormData) => Promise<void>
  mode: 'create' | 'edit'
}

export default function OrganizationForm({ 
  organization, 
  isOpen, 
  onClose, 
  onSave, 
  mode 
}: OrganizationFormProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: organization?.name || '',
    type: organization?.type || 'independent',
    billing_plan: organization?.billing_plan || 'individual',
    address: organization?.address || '',
    city: organization?.city || '',
    state: organization?.state || '',
    phone: organization?.phone || '',
    email: organization?.email || '',
    website: organization?.website || '',
    description: organization?.description || '',
    trial_duration_days: organization?.trial_duration_days || 30
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Organization name is required'
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Valid email address is required'
    }

    if (formData.phone && !/^[\d\s\-\(\)\+]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format'
    }

    if (formData.trial_duration_days && (formData.trial_duration_days < 1 || formData.trial_duration_days > 365)) {
      newErrors.trial_duration_days = 'Trial duration must be between 1 and 365 days'
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
        description: `Organization ${mode === 'create' ? 'created' : 'updated'} successfully`,
      })
      onClose()
    } catch (error) {
      console.error('Failed to save organization:', error)
      toast({
        title: 'Error',
        description: `Failed to ${mode} organization`,
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof OrganizationFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const getBillingPlanFeatures = (plan: string) => {
    switch (plan) {
      case 'individual':
        return ['1 User', 'Basic Booking', 'Email Support']
      case 'studio':
        return ['Up to 5 Users', 'Advanced Analytics', 'SMS Notifications', 'Priority Support']
      case 'salon':
        return ['Up to 15 Users', 'Multi-Location', 'Marketing Tools', 'API Access']
      case 'enterprise':
        return ['Unlimited Users', 'White-Label', 'Custom Integrations', 'Dedicated Support']
      default:
        return []
    }
  }

  const getBillingPlanPrice = (plan: string) => {
    switch (plan) {
      case 'individual': return '$29/month'
      case 'studio': return '$99/month'
      case 'salon': return '$299/month'
      case 'enterprise': return 'Custom pricing'
      default: return ''
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              {mode === 'create' ? 'Create Organization' : 'Edit Organization'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {mode === 'create' 
                ? 'Set up a new organization with billing and location management'
                : 'Update organization details and configuration'
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
                  Essential organization details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Organization Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Elite Barbershop Group"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="contact@elitebarbershop.com"
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                  )}
                </div>

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
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://elitebarbershop.com"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Brief description of the organization..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuration</CardTitle>
                <CardDescription>
                  Organization type, billing plan, and business settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="type">Organization Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleInputChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="headquarters">Headquarters</SelectItem>
                      <SelectItem value="location">Single Location</SelectItem>
                      <SelectItem value="franchise">Franchise</SelectItem>
                      <SelectItem value="independent">Independent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="billing_plan">Billing Plan</Label>
                  <Select
                    value={formData.billing_plan}
                    onValueChange={(value) => handleInputChange('billing_plan', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="salon">Salon</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Plan Details */}
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">
                        {getBillingPlanPrice(formData.billing_plan)}
                      </Badge>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {getBillingPlanFeatures(formData.billing_plan).map((feature, index) => (
                        <li key={index} className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {formData.billing_plan !== 'enterprise' && (
                  <div>
                    <Label htmlFor="trial_duration_days">Trial Duration (Days)</Label>
                    <Input
                      id="trial_duration_days"
                      type="number"
                      min="1"
                      max="365"
                      value={formData.trial_duration_days}
                      onChange={(e) => handleInputChange('trial_duration_days', parseInt(e.target.value) || 30)}
                      className={errors.trial_duration_days ? 'border-red-500' : ''}
                    />
                    {errors.trial_duration_days && (
                      <p className="text-sm text-red-500 mt-1">{errors.trial_duration_days}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address Information
              </CardTitle>
              <CardDescription>
                Primary business address (optional for multi-location organizations)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-3">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="123 Main Street"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="New York"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="NY"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div>
              {mode === 'create' && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    New organizations start with a {formData.trial_duration_days}-day trial period
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
                    {mode === 'create' ? 'Create Organization' : 'Save Changes'}
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