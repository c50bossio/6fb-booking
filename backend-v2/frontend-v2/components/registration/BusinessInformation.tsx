'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BusinessType } from './BusinessTypeSelection'

export interface BusinessInfo {
  businessName: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
  }
  phone: string
  website?: string
  chairCount: number
  barberCount: number
  description?: string
}

interface BusinessInformationProps {
  businessType: BusinessType
  businessInfo: BusinessInfo
  onUpdate: (info: BusinessInfo) => void
  onNext: () => void
  onBack: () => void
}

export function BusinessInformation({ 
  businessType, 
  businessInfo, 
  onUpdate, 
  onNext, 
  onBack 
}: BusinessInformationProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [zipSuggestions, setZipSuggestions] = useState<{city: string, state: string} | null>(null)

  // Common US ZIP to City/State mappings (sample data - in production this would be from an API)
  const zipDatabase: Record<string, {city: string, state: string}> = {
    '10001': { city: 'New York', state: 'NY' },
    '90210': { city: 'Beverly Hills', state: 'CA' },
    '60601': { city: 'Chicago', state: 'IL' },
    '33101': { city: 'Miami', state: 'FL' },
    '75201': { city: 'Dallas', state: 'TX' },
    '30301': { city: 'Atlanta', state: 'GA' },
    '02101': { city: 'Boston', state: 'MA' }
  }

  const getTitle = () => {
    switch (businessType) {
      case 'single_location':
        return 'Tell us about your barbershop'
      case 'multi_location':
        return 'Tell us about your business'
      default:
        return 'Business Information'
    }
  }

  const getSubtitle = () => {
    switch (businessType) {
      case 'single_location':
        return 'Help us set up your barbershop profile and location details'
      case 'multi_location':
        return 'Set up your main business profile (you can add locations later)'
      default:
        return 'Business details'
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!businessInfo.businessName.trim()) {
      newErrors.businessName = 'Business name is required'
    }

    if (!businessInfo.address.street.trim()) {
      newErrors.street = 'Street address is required'
    }

    if (!businessInfo.address.city.trim()) {
      newErrors.city = 'City is required'
    }

    if (!businessInfo.address.state.trim()) {
      newErrors.state = 'State is required'
    }

    if (!businessInfo.address.zipCode.trim()) {
      newErrors.zipCode = 'ZIP code is required'
    } else if (!/^\d{5}(-\d{4})?$/.test(businessInfo.address.zipCode)) {
      newErrors.zipCode = 'Please enter a valid ZIP code'
    }

    if (!businessInfo.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(businessInfo.phone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    if (businessInfo.chairCount < 1) {
      newErrors.chairCount = 'Must have at least 1 chair'
    }

    if (businessInfo.barberCount < 1) {
      newErrors.barberCount = 'Must have at least 1 barber'
    }

    if (businessInfo.website && businessInfo.website.trim()) {
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
      if (!urlPattern.test(businessInfo.website)) {
        newErrors.website = 'Please enter a valid website URL'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onNext()
    }
  }

  const formatPhoneNumber = (value: string): string => {
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '')
    
    // Apply US phone number formatting
    if (cleaned.length <= 3) {
      return cleaned
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
    } else {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
    }
  }

  const handleZipCodeLookup = (zipCode: string) => {
    // Clean zip code (remove non-numeric)
    const cleanZip = zipCode.replace(/\D/g, '').slice(0, 5)
    
    if (cleanZip.length === 5 && zipDatabase[cleanZip]) {
      const suggestion = zipDatabase[cleanZip]
      setZipSuggestions(suggestion)
    } else {
      setZipSuggestions(null)
    }
  }

  const applyZipSuggestion = () => {
    if (zipSuggestions) {
      updateField('address.city', zipSuggestions.city)
      updateField('address.state', zipSuggestions.state)
      setZipSuggestions(null)
    }
  }

  const updateField = (field: string, value: any) => {
    // Special handling for phone number formatting
    if (field === 'phone') {
      value = formatPhoneNumber(value)
    }

    // Special handling for ZIP code lookup
    if (field === 'address.zipCode') {
      handleZipCodeLookup(value)
    }

    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      onUpdate({
        ...businessInfo,
        [parent]: {
          ...businessInfo[parent as keyof BusinessInfo],
          [child]: value
        }
      })
    } else {
      onUpdate({
        ...businessInfo,
        [field]: value
      })
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          {getTitle()}
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          {getSubtitle()}
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Business Details</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Business Name */}
          <div>
            <Label htmlFor="businessName">
              {businessType === 'multi_location' ? 'Company Name' : 'Business Name'} *
            </Label>
            <Input
              id="businessName"
              value={businessInfo.businessName}
              onChange={(e) => updateField('businessName', e.target.value)}
              placeholder={businessType === 'multi_location' ? 'e.g., Premier Barbershops LLC' : 'e.g., Tony\'s Barbershop'}
              className={errors.businessName ? 'border-red-500' : ''}
            />
            {errors.businessName && (
              <p className="text-sm text-red-600 mt-1">{errors.businessName}</p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {businessType === 'multi_location' ? 'Primary Location Address' : 'Business Address'}
            </h3>
            
            <div>
              <Label htmlFor="street">Street Address *</Label>
              <Input
                id="street"
                value={businessInfo.address.street}
                onChange={(e) => updateField('address.street', e.target.value)}
                placeholder="123 Main Street"
                className={errors.street ? 'border-red-500' : ''}
              />
              {errors.street && (
                <p className="text-sm text-red-600 mt-1">{errors.street}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={businessInfo.address.city}
                  onChange={(e) => updateField('address.city', e.target.value)}
                  placeholder="City"
                  className={errors.city ? 'border-red-500' : ''}
                />
                {errors.city && (
                  <p className="text-sm text-red-600 mt-1">{errors.city}</p>
                )}
              </div>

              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={businessInfo.address.state}
                  onChange={(e) => updateField('address.state', e.target.value)}
                  placeholder="CA"
                  className={errors.state ? 'border-red-500' : ''}
                />
                {errors.state && (
                  <p className="text-sm text-red-600 mt-1">{errors.state}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="zipCode">ZIP Code *</Label>
              <Input
                id="zipCode"
                value={businessInfo.address.zipCode}
                onChange={(e) => updateField('address.zipCode', e.target.value)}
                placeholder="12345"
                className={errors.zipCode ? 'border-red-500' : ''}
              />
              
              {/* ZIP Code Auto-fill Suggestion */}
              {zipSuggestions && (
                <div className="mt-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm text-green-700 dark:text-green-300">
                        Auto-fill: <strong>{zipSuggestions.city}, {zipSuggestions.state}</strong>
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={applyZipSuggestion}
                        className="text-xs px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => setZipSuggestions(null)}
                        className="text-xs px-3 py-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {errors.zipCode && (
                <p className="text-sm text-red-600 mt-1">{errors.zipCode}</p>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Contact Information</h3>
            
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={businessInfo.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="(555) 123-4567"
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                type="url"
                value={businessInfo.website || ''}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://www.yourbarbershop.com"
                className={errors.website ? 'border-red-500' : ''}
              />
              {errors.website && (
                <p className="text-sm text-red-600 mt-1">{errors.website}</p>
              )}
            </div>
          </div>

          {/* Business Size */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Business Size</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="chairCount">Number of Chairs *</Label>
                <Input
                  id="chairCount"
                  type="number"
                  min="1"
                  max="50"
                  value={businessInfo.chairCount}
                  onChange={(e) => updateField('chairCount', parseInt(e.target.value) || 1)}
                  className={errors.chairCount ? 'border-red-500' : ''}
                />
                {errors.chairCount && (
                  <p className="text-sm text-red-600 mt-1">{errors.chairCount}</p>
                )}
              </div>

              <div>
                <Label htmlFor="barberCount">Number of Barbers *</Label>
                <Input
                  id="barberCount"
                  type="number"
                  min="1"
                  max="50"
                  value={businessInfo.barberCount}
                  onChange={(e) => updateField('barberCount', parseInt(e.target.value) || 1)}
                  className={errors.barberCount ? 'border-red-500' : ''}
                />
                {errors.barberCount && (
                  <p className="text-sm text-red-600 mt-1">{errors.barberCount}</p>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Business Description (Optional)</Label>
            <textarea
              id="description"
              value={businessInfo.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Tell us about your barbershop, specialties, atmosphere, etc."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-6 max-w-2xl mx-auto">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        
        <Button onClick={handleSubmit}>
          Continue
        </Button>
      </div>
    </div>
  )
}

export default BusinessInformation