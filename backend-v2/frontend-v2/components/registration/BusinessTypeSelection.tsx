'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, Building, Users } from 'lucide-react'

export type BusinessType = 'solo' | 'single_location' | 'multi_location'

interface BusinessTypeSelectionProps {
  selectedType: BusinessType | null
  onSelect: (type: BusinessType) => void
  onNext: () => void
  onBack?: () => void
}

const businessTypes = [
  {
    id: 'solo' as BusinessType,
    title: 'Individual Barber',
    subtitle: 'Solo practitioner',
    description: 'Perfect for independent barbers who work alone and want to manage their personal appointments and build their client base.',
    icon: User,
    features: [
      'Personal booking calendar',
      'Client management & history',
      'Payment processing with Stripe',
      'SMS & email notifications',
      'Mobile app access',
      'Basic analytics & reporting'
    ],
    color: 'blue',
    pricing: 'Starting at $19/month'
  },
  {
    id: 'single_location' as BusinessType,
    title: 'Barbershop Owner',
    subtitle: 'Single location business',
    description: 'Ideal for barbershop owners managing one location with multiple chairs, staff, and want to grow their business.',
    icon: Building,
    features: [
      'Multi-chair management',
      'Staff scheduling & permissions',
      'Advanced business analytics',
      'Customer loyalty programs',
      'Marketing automation',
      'Team collaboration tools'
    ],
    color: 'green',
    pricing: 'Scales with chairs'
  },
  {
    id: 'multi_location' as BusinessType,
    title: 'Enterprise Multi-location',
    subtitle: 'Multiple locations',
    description: 'Built for enterprise owners managing multiple barbershops, franchises, or chains across different locations.',
    icon: Users,
    features: [
      'Multi-location dashboard',
      'Franchise management tools',
      'Enterprise reporting & insights',
      'Custom integrations & API',
      'Advanced user management',
      'Dedicated account manager'
    ],
    color: 'purple',
    pricing: 'Volume discounts available'
  }
]

export function BusinessTypeSelection({ 
  selectedType, 
  onSelect, 
  onNext, 
  onBack 
}: BusinessTypeSelectionProps) {
  
  // DEBUG: Log component render and businessTypes array
  console.log('[BusinessTypeSelection] Component rendering...')
  console.log('[BusinessTypeSelection] businessTypes array:', businessTypes)
  console.log('[BusinessTypeSelection] businessTypes length:', businessTypes.length)

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <div className="text-center space-y-2 sm:space-y-3 md:space-y-4 px-3 sm:px-4 md:px-0">
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white leading-tight">
          What best describes your business?
        </h2>
        <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Choose the option that best fits your barbering business model. You can always upgrade later.
        </p>
      </div>

      {/* Enhanced Mobile-first Responsive Grid */}
      <div className="grid gap-4 sm:gap-5 md:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:gap-8 px-4 sm:px-6 md:px-0">
        {businessTypes.map((type) => {
          console.log('[BusinessTypeSelection] Mapping type:', type.id, type.title)
          const Icon = type.icon
          const isSelected = selectedType === type.id
          
          return (
            <Card 
              key={type.id}
              interactive={true}
              className={`
                relative cursor-pointer transition-all duration-300 ease-out transform group overflow-hidden
                min-h-[340px] sm:min-h-[360px] md:min-h-[380px] lg:min-h-[420px]
                touch-manipulation select-none
                /* Enhanced mobile touch targets with minimum 44px */
                min-w-[290px] sm:min-w-0
                /* Enhanced mobile touch feedback */
                active:scale-[0.98] active:shadow-md transition-transform duration-150
                /* Enhanced mobile touch feedback */
                ${isSelected 
                  ? 'ring-2 ring-offset-2 sm:ring-offset-4 ring-offset-white dark:ring-offset-gray-900 scale-[1.01] sm:scale-[1.02] shadow-xl sm:shadow-2xl shadow-black/10' 
                  : 'hover:shadow-xl hover:scale-[1.01] hover:-translate-y-1 sm:hover:-translate-y-2 active:scale-[0.98] active:shadow-lg'
                }
                ${type.id === 'solo' && isSelected ? 'ring-blue-500 bg-gradient-to-br from-blue-50 via-blue-50/80 to-blue-100/60 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-700' : ''}
                ${type.id === 'single_location' && isSelected ? 'ring-green-500 bg-gradient-to-br from-green-50 via-green-50/80 to-green-100/60 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-700' : ''}
                ${type.id === 'multi_location' && isSelected ? 'ring-purple-500 bg-gradient-to-br from-purple-50 via-purple-50/80 to-purple-100/60 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-700' : ''}
                focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 sm:focus-within:ring-offset-4
                before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300
              `}
              onClick={() => onSelect(type.id)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(type.id)
                }
              }}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`Select ${type.title}`}
            >
              {/* Mobile-optimized Selection indicator */}
              {isSelected && (
                <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-10">
                  <div className={`w-7 h-7 sm:w-6 sm:h-6 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-300 shadow-lg ${
                    type.id === 'solo' ? 'bg-blue-500' :
                    type.id === 'single_location' ? 'bg-green-500' : 'bg-purple-500'
                  }`}>
                    <svg className="w-4 h-4 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
              
              {/* Mobile-optimized Icon with enhanced styling */}
              <div className="relative z-10 p-3 sm:p-4 md:p-6">
                <div className="text-center mb-4 sm:mb-6">
                  <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl mb-2 sm:mb-3 md:mb-4 transition-all duration-300 transform group-hover:scale-105 sm:group-hover:scale-110 ${
                    isSelected
                      ? type.id === 'solo'
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                        : type.id === 'single_location'
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                        : 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
                  }`}>
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                  </div>
                  
                  <h3 className={`text-base sm:text-lg md:text-xl font-bold mb-1 sm:mb-2 transition-colors duration-300 leading-tight ${
                    isSelected
                      ? type.id === 'solo'
                        ? 'text-blue-900 dark:text-blue-100'
                        : type.id === 'single_location'
                        ? 'text-green-900 dark:text-green-100'
                        : 'text-purple-900 dark:text-purple-100'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {type.title}
                  </h3>
                  
                  <p className={`text-xs sm:text-sm font-medium mb-2 sm:mb-3 transition-colors duration-300 ${
                    isSelected
                      ? type.id === 'solo'
                        ? 'text-blue-700 dark:text-blue-300'
                        : type.id === 'single_location'
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-purple-700 dark:text-purple-300'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {type.subtitle}
                  </p>
                </div>
                
                <div className="space-y-2 sm:space-y-3 md:space-y-4">
                  <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2 sm:line-clamp-none">
                    {type.description}
                  </p>
                  
                  {/* Mobile-optimized Features list */}
                  <div className="space-y-1.5 sm:space-y-2">
                    <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Key Features</h4>
                    <ul className="space-y-1.5 sm:space-y-2">
                      {type.features.slice(0, 3).map((feature, index) => (
                        <li key={index} className="flex items-start text-xs text-gray-600 dark:text-gray-400">
                          <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mt-1.5 mr-2 sm:mr-2.5 flex-shrink-0 transition-colors duration-300 ${
                            isSelected
                              ? type.id === 'solo'
                                ? 'bg-blue-500'
                                : type.id === 'single_location'
                                ? 'bg-green-500'
                                : 'bg-purple-500'
                              : 'bg-gray-400 dark:bg-gray-600'
                          }`} />
                          <span className="leading-tight">{feature}</span>
                        </li>
                      ))}
                      {type.features.length > 3 && (
                        <li className="text-xs text-gray-500 dark:text-gray-400 italic pl-3.5 sm:pl-4">
                          +{type.features.length - 3} more features
                        </li>
                      )}
                    </ul>
                  </div>
                  
                  {/* Mobile-optimized Pricing */}
                  <div className={`mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700 transition-colors duration-300 ${
                    isSelected
                      ? type.id === 'solo'
                        ? 'border-blue-200 dark:border-blue-700'
                        : type.id === 'single_location'
                        ? 'border-green-200 dark:border-green-700'
                        : 'border-purple-200 dark:border-purple-700'
                      : ''
                  }`}>
                    <div className={`inline-flex items-center px-3 py-2 sm:py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                      isSelected
                        ? type.id === 'solo'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                          : type.id === 'single_location'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {type.pricing}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Enhanced Mobile Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-4 md:gap-0 pt-6 sm:pt-6 px-4 sm:px-6 md:px-0">
        {onBack && (
          <Button 
            variant="outline" 
            onClick={onBack}
            className="order-2 sm:order-1 w-full sm:w-auto min-h-[56px] sm:min-h-[48px] md:min-h-[44px] touch-manipulation text-base sm:text-sm font-medium active:scale-95 transition-transform duration-150"
          >
            Back
          </Button>
        )}
        
        <div className="hidden sm:flex flex-1" />
        
        <Button 
          onClick={() => selectedType && onNext()}
          disabled={!selectedType}
          className={`order-1 sm:order-2 w-full sm:w-auto min-w-[160px] px-6 sm:px-8 min-h-[56px] sm:min-h-[48px] md:min-h-[44px] touch-manipulation transition-all duration-300 text-base sm:text-sm font-semibold ${
            selectedType 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 shadow-lg hover:shadow-xl active:shadow-md active:scale-95 transform' 
              : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
          }`}
        >
          {selectedType ? (
            <>
              <span className="block sm:inline">Continue Setup</span>
              <svg className="w-4 h-4 ml-2 hidden sm:inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          ) : (
            'Select your business type'
          )}
        </Button>
      </div>
      
      {selectedType && (
        <div className="text-center px-4 sm:px-0">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You can change this later in your account settings
          </p>
        </div>
      )}
    </div>
  )
}

export default BusinessTypeSelection