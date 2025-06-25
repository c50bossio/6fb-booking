'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useHapticFeedback } from '@/hooks/useMobileDetection'

interface MobileInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  icon?: React.ReactNode
  error?: string
  required?: boolean
  autoComplete?: string
  inputMode?: 'text' | 'tel' | 'email' | 'numeric' | 'decimal'
  theme?: 'light' | 'dark'
}

export function MobileInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  icon,
  error,
  required = false,
  autoComplete,
  inputMode,
  theme = 'light'
}: MobileInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { selectionChanged } = useHapticFeedback()

  const handleFocus = () => {
    setIsFocused(true)
    selectionChanged()
  }

  const handleBlur = () => {
    setIsFocused(false)
  }

  return (
    <div className="space-y-2">
      <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          className={`
            w-full px-4 py-4 rounded-lg border-2 transition-all text-base
            ${icon ? 'pl-12' : ''}
            ${error
              ? 'border-red-500 focus:border-red-500'
              : isFocused
                ? 'border-[#20D9D2]'
                : theme === 'dark'
                  ? 'border-[#2C2D3A] focus:border-[#20D9D2]'
                  : 'border-gray-200 focus:border-[#20D9D2]'
            }
            ${theme === 'dark'
              ? 'bg-[#24252E] text-white placeholder-[#8B92A5]'
              : 'bg-white text-gray-900 placeholder-gray-400'
            }
          `}
          style={{ fontSize: '16px' }} // Prevent zoom on iOS
        />
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            <XMarkIcon className="w-5 h-5 text-red-500" />
          </motion.div>
        )}
        {!error && value && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            <CheckIcon className="w-5 h-5 text-green-500" />
          </motion.div>
        )}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-500"
        >
          {error}
        </motion.p>
      )}
    </div>
  )
}

interface MobileTextAreaProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  maxLength?: number
  theme?: 'light' | 'dark'
}

export function MobileTextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength,
  theme = 'light'
}: MobileTextAreaProps) {
  const [isFocused, setIsFocused] = useState(false)
  const { selectionChanged } = useHapticFeedback()

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          {label}
        </label>
        {maxLength && (
          <span className={`text-xs ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-500'}`}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          setIsFocused(true)
          selectionChanged()
        }}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={`
          w-full px-4 py-3 rounded-lg border-2 transition-all text-base resize-none
          ${isFocused
            ? 'border-[#20D9D2]'
            : theme === 'dark'
              ? 'border-[#2C2D3A] focus:border-[#20D9D2]'
              : 'border-gray-200 focus:border-[#20D9D2]'
          }
          ${theme === 'dark'
            ? 'bg-[#24252E] text-white placeholder-[#8B92A5]'
            : 'bg-white text-gray-900 placeholder-gray-400'
          }
        `}
        style={{ fontSize: '16px' }}
      />
    </div>
  )
}

interface MobileFormSectionProps {
  clientInfo?: {
    name: string
    email: string
    phone: string
    notes?: string
  }
  onUpdate: (field: string, value: string) => void
  errors?: { [key: string]: string }
  theme?: 'light' | 'dark'
}

export function MobileClientDetailsForm({
  clientInfo,
  onUpdate,
  errors = {},
  theme = 'light'
}: MobileFormSectionProps) {
  const { notificationOccurred } = useHapticFeedback()

  // Auto-format phone number
  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3]
    }
    return value
  }

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value)
    onUpdate('phone', formatted)
  }

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      notificationOccurred('error')
    }
  }, [errors])

  return (
    <div className="space-y-6">
      <MobileInput
        label="Full Name"
        value={clientInfo?.name || ''}
        onChange={(value) => onUpdate('name', value)}
        placeholder="John Doe"
        icon={<UserIcon className="w-5 h-5 text-gray-400" />}
        error={errors.name}
        required
        autoComplete="name"
        theme={theme}
      />

      <MobileInput
        label="Email Address"
        value={clientInfo?.email || ''}
        onChange={(value) => onUpdate('email', value)}
        type="email"
        placeholder="john@example.com"
        icon={<EnvelopeIcon className="w-5 h-5 text-gray-400" />}
        error={errors.email}
        required
        autoComplete="email"
        inputMode="email"
        theme={theme}
      />

      <MobileInput
        label="Phone Number"
        value={clientInfo?.phone || ''}
        onChange={handlePhoneChange}
        type="tel"
        placeholder="(555) 123-4567"
        icon={<PhoneIcon className="w-5 h-5 text-gray-400" />}
        error={errors.phone}
        required
        autoComplete="tel"
        inputMode="tel"
        theme={theme}
      />

      <MobileTextArea
        label="Special Requests (Optional)"
        value={clientInfo?.notes || ''}
        onChange={(value) => onUpdate('notes', value)}
        placeholder="Any specific requests or preferences for your appointment..."
        rows={3}
        maxLength={200}
        theme={theme}
      />

      {/* Privacy Notice */}
      <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-[#24252E]' : 'bg-gray-50'}`}>
        <p className={`text-xs ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-600'}`}>
          Your information is secure and will only be used for booking purposes.
          We'll send appointment reminders to your email and phone.
        </p>
      </div>
    </div>
  )
}
