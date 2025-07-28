'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import '../styles/six-figure-barber-theme.css'
import { 
  Plus, 
  Check, 
  Star,
  Clock,
  Scissors,
  Sparkles,
  TrendingUp,
  Crown,
  Zap,
  Gift
} from 'lucide-react'

interface ServiceOption {
  id: string
  name: string
  description: string
  price: number
  duration: number
  category: 'essential' | 'premium' | 'luxury'
  icon: React.ReactNode
  popularAddOn?: boolean
  revenueBoost?: number
  recommended?: boolean
}

interface ServiceBundle {
  id: string
  name: string
  description: string
  services: string[]
  originalPrice: number
  bundlePrice: number
  savings: number
  badge: string
  popular?: boolean
}

interface ServiceCustomizationProps {
  selectedBarber: {
    id: number
    name: string
    tier: {
      name: string
      rate: number
    }
  }
  onServiceSelection?: (services: ServiceOption[], bundle?: ServiceBundle) => void
  onBookingProceed?: (totalPrice: number, services: ServiceOption[], bundle?: ServiceBundle) => void
}

const serviceOptions: ServiceOption[] = [
  {
    id: 'haircut',
    name: 'Premium Haircut',
    description: 'Precision cut with consultation',
    price: 65,
    duration: 45,
    category: 'essential',
    icon: <Scissors className="w-5 h-5" />,
    recommended: true
  },
  {
    id: 'beard-trim',
    name: 'Beard Trim & Shape',
    description: 'Professional beard sculpting',
    price: 35,
    duration: 20,
    category: 'essential',
    icon: <Star className="w-5 h-5" />,
    popularAddOn: true,
    revenueBoost: 15
  },
  {
    id: 'hot-towel',
    name: 'Hot Towel Treatment',
    description: 'Relaxing hot towel service',
    price: 25,
    duration: 15,
    category: 'premium',
    icon: <Sparkles className="w-5 h-5" />,
    popularAddOn: true,
    revenueBoost: 25
  },
  {
    id: 'scalp-massage',
    name: 'Scalp Massage',
    description: 'Therapeutic scalp treatment',
    price: 30,
    duration: 20,
    category: 'premium',
    icon: <Zap className="w-5 h-5" />,
    revenueBoost: 20
  },
  {
    id: 'straight-razor',
    name: 'Straight Razor Shave',
    description: 'Traditional straight razor experience',
    price: 45,
    duration: 30,
    category: 'luxury',
    icon: <Crown className="w-5 h-5" />,
    revenueBoost: 35
  },
  {
    id: 'grooming-package',
    name: 'Full Grooming Experience',
    description: 'Complete styling consultation',
    price: 85,
    duration: 75,
    category: 'luxury',
    icon: <Gift className="w-5 h-5" />,
    revenueBoost: 45
  }
]

const serviceBundles: ServiceBundle[] = [
  {
    id: 'gentleman-essentials',
    name: 'Gentleman Essentials',
    description: 'Perfect combination for the modern professional',
    services: ['haircut', 'beard-trim'],
    originalPrice: 100,
    bundlePrice: 85,
    savings: 15,
    badge: 'Most Popular',
    popular: true
  },
  {
    id: 'premium-experience',
    name: 'Premium Experience',
    description: 'Enhanced service with luxury touches',
    services: ['haircut', 'beard-trim', 'hot-towel'],
    originalPrice: 125,
    bundlePrice: 105,
    savings: 20,
    badge: 'Best Value'
  },
  {
    id: 'royal-treatment',
    name: 'Royal Treatment',
    description: 'Ultimate barbershop experience',
    services: ['haircut', 'straight-razor', 'scalp-massage', 'hot-towel'],
    originalPrice: 165,
    bundlePrice: 135,
    savings: 30,
    badge: 'Luxury'
  }
]

export function ServiceCustomization({ 
  selectedBarber, 
  onServiceSelection,
  onBookingProceed 
}: ServiceCustomizationProps) {
  const [selectedServices, setSelectedServices] = useState<ServiceOption[]>([])
  const [selectedBundle, setSelectedBundle] = useState<ServiceBundle | null>(null)
  const [view, setView] = useState<'individual' | 'bundles'>('bundles')

  const toggleService = (service: ServiceOption) => {
    const isSelected = selectedServices.find(s => s.id === service.id)
    let newServices: ServiceOption[]
    
    if (isSelected) {
      newServices = selectedServices.filter(s => s.id !== service.id)
    } else {
      newServices = [...selectedServices, service]
    }
    
    setSelectedServices(newServices)
    setSelectedBundle(null) // Clear bundle when customizing individual services
    onServiceSelection?.(newServices)
  }

  const selectBundle = (bundle: ServiceBundle) => {
    const bundleServices = serviceOptions.filter(service => 
      bundle.services.includes(service.id)
    )
    setSelectedServices(bundleServices)
    setSelectedBundle(bundle)
    onServiceSelection?.(bundleServices, bundle)
  }

  const getTotalPrice = () => {
    if (selectedBundle) {
      return selectedBundle.bundlePrice
    }
    return selectedServices.reduce((total, service) => total + service.price, 0)
  }

  const getTotalDuration = () => {
    return selectedServices.reduce((total, service) => total + service.duration, 0)
  }

  const getPotentialRevenue = () => {
    const baseRevenue = getTotalPrice()
    const avgRevenueBoost = selectedServices.reduce((total, service) => 
      total + (service.revenueBoost || 0), 0
    ) / selectedServices.length || 0
    
    return {
      baseRevenue,
      potentialIncrease: Math.round(baseRevenue * (avgRevenueBoost / 100))
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'essential': return <Scissors className="w-4 h-4" />
      case 'premium': return <Star className="w-4 h-4" />
      case 'luxury': return <Crown className="w-4 h-4" />
      default: return <Scissors className="w-4 h-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'essential': return 'sfb-grey'
      case 'premium': return 'sfb-charcoal'
      case 'luxury': return 'sfb-teal'
      default: return 'sfb-grey'
    }
  }

  const revenue = getPotentialRevenue()

  return (
    <div className="space-y-6">
      {/* Header with Barber Context */}
      <div className="sfb-card-premium p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="sfb-heading-secondary text-xl font-bold">Service Selection</h2>
            <p className="sfb-text-premium">Booking with {selectedBarber.name} • ${selectedBarber.tier.rate} tier</p>
          </div>
          <div className="text-right">
            <div className="text-sm sfb-text-premium">Estimated Revenue Impact</div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--sfb-teal)' }} />
              <span className="font-bold" style={{ color: 'var(--sfb-teal)' }}>
                +${revenue.potentialIncrease} potential
              </span>
            </div>
          </div>
        </div>

        {/* Service View Toggle */}
        <div className="flex space-x-2">
          <button
            onClick={() => setView('bundles')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              view === 'bundles' 
                ? 'sfb-button-premium' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Service Bundles
          </button>
          <button
            onClick={() => setView('individual')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              view === 'individual' 
                ? 'sfb-button-premium' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Individual Services
          </button>
        </div>
      </div>

      {/* Service Bundles View */}
      {view === 'bundles' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5" style={{ color: 'var(--sfb-teal)' }} />
            <h3 className="sfb-heading-secondary font-semibold">Recommended Service Bundles</h3>
            <Badge className="sfb-badge-teal">Higher Value</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {serviceBundles.map((bundle) => (
              <Card 
                key={bundle.id}
                className={`cursor-pointer transition-all duration-200 ${
                  selectedBundle?.id === bundle.id 
                    ? 'sfb-card-elite border-2' 
                    : 'sfb-card-premium hover:border-teal-300'
                } ${bundle.popular ? 'sfb-pulse-teal' : ''}`}
                onClick={() => selectBundle(bundle)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold sfb-heading-secondary">{bundle.name}</h3>
                        {bundle.popular && (
                          <Badge className="sfb-badge-teal text-xs">
                            {bundle.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm sfb-text-premium">{bundle.description}</p>
                    </div>
                    {selectedBundle?.id === bundle.id && (
                      <Check className="w-5 h-5 text-white bg-teal-500 rounded-full p-0.5" />
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Included Services */}
                  <div className="space-y-1">
                    {bundle.services.map(serviceId => {
                      const service = serviceOptions.find(s => s.id === serviceId)
                      return service ? (
                        <div key={serviceId} className="flex items-center gap-2 text-sm">
                          {service.icon}
                          <span className="sfb-text-premium">{service.name}</span>
                        </div>
                      ) : null
                    })}
                  </div>

                  {/* Pricing */}
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold" style={{ color: 'var(--sfb-teal)' }}>
                          ${bundle.bundlePrice}
                        </div>
                        <div className="text-xs text-gray-500 line-through">
                          ${bundle.originalPrice}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">
                          Save ${bundle.savings}
                        </div>
                        <div className="text-xs text-gray-500">
                          {serviceBundles.find(b => b.id === bundle.id)?.services.reduce((total, serviceId) => {
                            const service = serviceOptions.find(s => s.id === serviceId)
                            return total + (service?.duration || 0)
                          }, 0)} min
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Individual Services View */}
      {view === 'individual' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-5 h-5" style={{ color: 'var(--sfb-teal)' }} />
            <h3 className="sfb-heading-secondary font-semibold">Customize Your Service</h3>
          </div>

          {/* Service Categories */}
          {['essential', 'premium', 'luxury'].map(category => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                {getCategoryIcon(category)}
                <h4 className="font-medium sfb-heading-secondary capitalize">
                  {category} Services
                </h4>
                {category === 'premium' && (
                  <Badge variant="outline" className="text-xs">High Revenue</Badge>
                )}
                {category === 'luxury' && (
                  <Badge className="sfb-badge-teal text-xs">Premium</Badge>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {serviceOptions
                  .filter(service => service.category === category)
                  .map((service) => {
                    const isSelected = selectedServices.find(s => s.id === service.id)
                    
                    return (
                      <Card
                        key={service.id}
                        className={`cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'sfb-card-elite border-2' 
                            : 'sfb-card-premium hover:border-teal-300'
                        }`}
                        onClick={() => toggleService(service)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {service.icon}
                                <h4 className="font-medium sfb-heading-secondary">
                                  {service.name}
                                </h4>
                                {service.recommended && (
                                  <Badge variant="outline" className="text-xs">
                                    Recommended
                                  </Badge>
                                )}
                                {service.popularAddOn && (
                                  <Badge className="sfb-badge-teal text-xs">
                                    Popular Add-On
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm sfb-text-premium mb-2">
                                {service.description}
                              </p>
                              
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {service.duration} min
                                </div>
                                {service.revenueBoost && (
                                  <div className="flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    +{service.revenueBoost}% revenue
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right ml-4">
                              <div className="text-lg font-bold" style={{ color: 'var(--sfb-teal)' }}>
                                ${service.price}
                              </div>
                              {isSelected && (
                                <Check className="w-5 h-5 text-white bg-teal-500 rounded-full p-0.5 mt-1 ml-auto" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selection Summary & Booking */}
      {selectedServices.length > 0 && (
        <div className="sfb-card-premium p-6">
          <h3 className="sfb-heading-secondary font-semibold mb-4">Booking Summary</h3>
          
          <div className="space-y-3 mb-6">
            {selectedServices.map((service) => (
              <div key={service.id} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {service.icon}
                  <span className="sfb-text-premium">{service.name}</span>
                </div>
                <span className="font-medium">${service.price}</span>
              </div>
            ))}
            
            {selectedBundle && (
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center text-sm text-green-600">
                  <span>Bundle Savings</span>
                  <span>-${selectedBundle.savings}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-6 p-4 rounded-lg" style={{ background: 'var(--sfb-grey-light)' }}>
            <div>
              <div className="sfb-heading-secondary font-bold">Total: ${getTotalPrice()}</div>
              <div className="text-sm sfb-text-premium">
                Duration: {getTotalDuration()} minutes
              </div>
              {revenue.potentialIncrease > 0 && (
                <div className="text-sm" style={{ color: 'var(--sfb-teal)' }}>
                  +${revenue.potentialIncrease} revenue potential
                </div>
              )}
            </div>
            
            <button
              onClick={() => onBookingProceed?.(getTotalPrice(), selectedServices, selectedBundle || undefined)}
              className="sfb-button-premium px-6 py-3 rounded-lg font-medium"
            >
              Book Appointment - ${getTotalPrice()}
            </button>
          </div>
          
          {selectedBundle && (
            <div className="text-center">
              <Badge className="sfb-badge-teal">
                🎉 {selectedBundle.badge} Bundle Selected - Save ${selectedBundle.savings}!
              </Badge>
            </div>
          )}
        </div>
      )}
    </div>
  )
}