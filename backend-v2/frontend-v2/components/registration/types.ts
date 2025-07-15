// Registration data types

export interface RegistrationData {
  // Personal Information
  email: string
  password: string
  confirmPassword: string
  name: string
  phone?: string
  
  // Business Information
  businessName?: string
  businessType?: 'individual' | 'shop' | 'enterprise'
  role?: 'client' | 'barber' | 'admin' | 'super_admin'
  
  // Preferences
  serviceTemplate?: string
  acceptTerms: boolean
  acceptMarketing: boolean
  
  // Additional metadata
  referralCode?: string
  timezone?: string
  
  // OAuth Information (optional)
  isOAuthUser?: boolean
  oauthProvider?: 'google' | 'facebook' | 'apple'
  oauthId?: string
  profilePicture?: string
}

export interface RegistrationStep {
  id: string
  title: string
  description: string
  fields: string[]
  optional?: boolean
}

export interface RegistrationProgress {
  currentStep: number
  totalSteps: number
  completedSteps: string[]
  isValid: boolean
}