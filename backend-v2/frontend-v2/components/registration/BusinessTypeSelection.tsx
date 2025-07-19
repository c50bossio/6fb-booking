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

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
          What best describes your business?
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Choose the option that best fits your barbering business model. You can always upgrade later.
        </p>
      </div>

      {/* Enhanced Mobile Grid with Better Touch Targets */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:gap-8">
        {businessTypes.map((type) => {
          const Icon = type.icon
          const isSelected = selectedType === type.id
          
          return (
            <div
              key={type.id}
              className={`
                relative cursor-pointer transition-all duration-300 transform group
                min-h-[300px] sm:min-h-[320px] md:min-h-[350px]
                touch-manipulation select-none
                ${isSelected 
                  ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 scale-[1.02] shadow-2xl' 
                  : 'hover:shadow-xl hover:scale-[1.01] hover:-translate-y-1 active:scale-[0.98] active:shadow-lg'
                }
                ${type.id === 'solo' && isSelected ? 'ring-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10' : ''}
                ${type.id === 'single_location' && isSelected ? 'ring-green-500 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10' : ''}
                ${type.id === 'multi_location' && isSelected ? 'ring-purple-500 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10' : ''}
                focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2
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
              <Card className="h-full border-0 shadow-none bg-transparent">
                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute -top-3 -right-3 z-10">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center
                      ${type.id === 'solo' ? 'bg-blue-500' : ''}
                      ${type.id === 'single_location' ? 'bg-green-500' : ''}
                      ${type.id === 'multi_location' ? 'bg-purple-500' : ''}
                      text-white shadow-lg
                    `}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}

                <CardHeader className="text-center space-y-3 pb-2">
                <div className={`
                  mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center transition-colors duration-200
                  ${type.id === 'solo' ? `${isSelected ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30'}` : ''}
                  ${type.id === 'single_location' ? `${isSelected ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30'}` : ''}
                  ${type.id === 'multi_location' ? `${isSelected ? 'bg-gradient-to-br from-purple-500 to-purple-600' : 'bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30'}` : ''}
                  shadow-lg
                `}>
                  <Icon className={`w-9 h-9 sm:w-10 sm:h-10 ${isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`} />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                    {type.title}
                  </CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {type.subtitle}
                  </p>
                </div>
              </CardHeader>
              
                <CardContent className="space-y-3 pt-3">
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3">
                  {type.description}
                </p>
                
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    What's Included:
                  </h4>
                  <ul className="space-y-1.5">
                    {type.features.slice(0, 4).map((feature, index) => (
                      <li key={index} className="flex items-start text-sm text-gray-600 dark:text-gray-400 group/item">
                        <svg className={`
                          w-4 h-4 mr-2 mt-0.5 flex-shrink-0 transition-colors
                          ${type.id === 'solo' ? `${isSelected ? 'text-blue-500' : 'text-blue-400'}` : ''}
                          ${type.id === 'single_location' ? `${isSelected ? 'text-green-500' : 'text-green-400'}` : ''}
                          ${type.id === 'multi_location' ? `${isSelected ? 'text-purple-500' : 'text-purple-400'}` : ''}
                        `} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="group-hover/item:text-gray-700 dark:group-hover/item:text-gray-300 transition-colors">
                          {feature}
                        </span>
                      </li>
                    ))}
                    {type.features.length > 4 && (
                      <li className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">
                        <span className="ml-6">+{type.features.length - 4} more features</span>
                      </li>
                    )}
                  </ul>
                </div>

                {/* Pricing Badge */}
                <div className={`
                  mt-4 py-2.5 px-4 rounded-xl text-center
                  ${type.id === 'solo' ? 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/10 border border-blue-200 dark:border-blue-800' : ''}
                  ${type.id === 'single_location' ? 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/10 border border-green-200 dark:border-green-800' : ''}
                  ${type.id === 'multi_location' ? 'bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/10 border border-purple-200 dark:border-purple-800' : ''}
                `}>
                  <p className={`
                    text-sm font-semibold
                    ${type.id === 'solo' ? 'text-blue-700 dark:text-blue-300' : ''}
                    ${type.id === 'single_location' ? 'text-green-700 dark:text-green-300' : ''}
                    ${type.id === 'multi_location' ? 'text-purple-700 dark:text-purple-300' : ''}
                  `}>
                    {type.pricing}
                  </p>
                </div>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>

      <div className="flex justify-between pt-6">
        {onBack && (
          <Button 
            variant="outline" 
            onClick={onBack}
          >
            Back
          </Button>
        )}
        
        <div className="flex-1" />
        
        <Button 
          onClick={() => selectedType && onNext()}
          disabled={!selectedType}
          className="min-w-[120px]"
        >
          {selectedType ? 'Continue' : 'Select an option'}
        </Button>
      </div>
      
      {selectedType && (
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You can change this later in your account settings
          </p>
        </div>
      )}
    </div>
  )
}

export default BusinessTypeSelection