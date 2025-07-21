'use client'

import React, { useState, useCallback } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'

export interface GuestInfo {
  name: string
  email: string
  phone: string
}

export interface ProgressiveGuestFormProps {
  guestInfo: GuestInfo
  onGuestInfoChange: (guestInfo: GuestInfo) => void
  onSubmit: () => Promise<void>
  onBack: () => void
  loading: boolean
  error?: string
  className?: string
  showProgress?: boolean
}

export default function ProgressiveGuestForm({
  guestInfo,
  onGuestInfoChange,
  onSubmit,
  onBack,
  loading,
  error,
  className,
  showProgress = true
}: ProgressiveGuestFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Calculate completion percentage
  const getCompletionPercentage = () => {
    const fields = [guestInfo.name, guestInfo.email, guestInfo.phone]
    const completedFields = fields.filter(field => field.trim().length > 0).length
    return Math.round((completedFields / fields.length) * 100)
  }

  // Basic validation
  const validateField = (name: string, value: string) => {
    const newErrors = { ...errors }

    switch (name) {
      case 'name':
        if (!value.trim()) {
          newErrors.name = 'Name is required'
        } else if (value.trim().split(' ').length < 2) {
          newErrors.name = 'Please enter first and last name'
        } else {
          delete newErrors.name
        }
        break
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!value.trim()) {
          newErrors.email = 'Email is required'
        } else if (!emailRegex.test(value)) {
          newErrors.email = 'Please enter a valid email'
        } else {
          delete newErrors.email
        }
        break
      case 'phone':
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/
        if (!value.trim()) {
          newErrors.phone = 'Phone number is required'
        } else if (!phoneRegex.test(value) || value.replace(/\D/g, '').length < 10) {
          newErrors.phone = 'Please enter a valid phone number'
        } else {
          delete newErrors.phone
        }
        break
    }

    setErrors(newErrors)
    return !newErrors[name]
  }

  const handleChange = (field: keyof GuestInfo, value: string) => {
    const newGuestInfo = { ...guestInfo, [field]: value }
    onGuestInfoChange(newGuestInfo)
    validateField(field, value)
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all fields
    const isNameValid = validateField('name', guestInfo.name)
    const isEmailValid = validateField('email', guestInfo.email)
    const isPhoneValid = validateField('phone', guestInfo.phone)

    if (isNameValid && isEmailValid && isPhoneValid) {
      await onSubmit()
    }
  }, [guestInfo, onSubmit])

  const isFormValid = Object.keys(errors).length === 0 && 
    guestInfo.name.trim() && 
    guestInfo.email.trim() && 
    guestInfo.phone.trim()

  const completionPercentage = getCompletionPercentage()

  return (
    <section className={className} aria-labelledby="guest-info-title">
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Go back to date and time selection"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 id="guest-info-title" className="text-2xl font-bold text-gray-900">
            Your Information
          </h2>
          <p className="text-gray-600">
            We'll need some details to confirm your booking.
          </p>
        </div>
      </div>

      {/* Form Progress Indicator */}
      {showProgress && (
        <div className="mb-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Booking Information Progress</span>
              <span>{completionPercentage}%</span>
            </div>
            <Progress 
              value={completionPercentage} 
              className="w-full"
            />
            {completionPercentage === 100 && isFormValid && (
              <p className="text-sm text-green-600">✓ All fields completed successfully</p>
            )}
          </div>
        </div>
      )}

      {/* General Form Error */}
      {error && (
        <div 
          className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
          role="alert"
        >
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-lg p-6 border">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="guest-name">Full Name *</Label>
            <Input
              id="guest-name"
              type="text"
              placeholder="Enter your first and last name"
              value={guestInfo.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={errors.name ? 'border-red-500' : ''}
              maxLength={100}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="guest-email">Email Address *</Label>
            <Input
              id="guest-email"
              type="email"
              placeholder="Enter your email address"
              value={guestInfo.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={errors.email ? 'border-red-500' : ''}
              maxLength={255}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Phone Field */}
          <div className="space-y-2">
            <Label htmlFor="guest-phone">Phone Number *</Label>
            <Input
              id="guest-phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={guestInfo.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className={errors.phone ? 'border-red-500' : ''}
              maxLength={20}
            />
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full py-3 px-6 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Creating Your Booking...
              </>
            ) : (
              <>Continue to Payment →</>
            )}
          </Button>

          {/* Form Help Text */}
          {!isFormValid && completionPercentage > 0 && (
            <div className="text-sm text-gray-600 text-center p-2 bg-blue-50 rounded border border-blue-200">
              Please complete all fields with valid information to continue
            </div>
          )}
        </form>
      </div>
    </section>
  )
}