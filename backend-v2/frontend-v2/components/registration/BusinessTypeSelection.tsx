'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
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
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          What describes your business?
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Choose the option that best fits your barbering business model
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {businessTypes.map((type) => {
          const Icon = type.icon
          const isSelected = selectedType === type.id
          
          return (
            <Card 
              key={type.id}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? `ring-2 ring-${type.color}-500 bg-${type.color}-50 dark:bg-${type.color}-900/20` 
                  : 'hover:shadow-lg hover:scale-105'
              }`}
              onClick={() => onSelect(type.id)}
            >
              <CardHeader className="text-center">
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                  isSelected 
                    ? `bg-${type.color}-500 text-white` 
                    : `bg-${type.color}-100 text-${type.color}-600 dark:bg-${type.color}-900/30 dark:text-${type.color}-400`
                }`}>
                  <Icon className="w-8 h-8" />
                </div>
                <CardTitle className="text-xl font-bold">
                  {type.title}
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {type.subtitle}
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {type.description}
                </p>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    Key Features:
                  </h4>
                  <ul className="space-y-1">
                    {type.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          isSelected ? `bg-${type.color}-500` : `bg-${type.color}-400`
                        }`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Pricing Info */}
                <div className="mt-4 pt-4 border-t">
                  <div className={`text-center text-sm font-medium ${
                    isSelected 
                      ? `text-${type.color}-700 dark:text-${type.color}-300`
                      : `text-${type.color}-600 dark:text-${type.color}-400`
                  }`}>
                    {type.pricing}
                  </div>
                </div>
                
                {isSelected && (
                  <div className={`mt-4 p-2 rounded-md bg-${type.color}-100 dark:bg-${type.color}-900/40`}>
                    <p className={`text-xs text-${type.color}-700 dark:text-${type.color}-300 text-center font-medium`}>
                      ✓ Selected
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
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
          onClick={onNext}
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