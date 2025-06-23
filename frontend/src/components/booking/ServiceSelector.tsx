'use client'

import { RadioGroup } from '@headlessui/react'
import { CheckIcon, ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import type { Service } from '@/lib/api/services'

interface ServiceSelectorProps {
  services: Service[]
  selectedService: Service | null
  onServiceSelect: (service: Service) => void
  loading?: boolean
  disabled?: boolean
}

export default function ServiceSelector({
  services,
  selectedService,
  onServiceSelect,
  loading = false,
  disabled = false
}: ServiceSelectorProps) {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-24 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    )
  }

  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    const category = service.category_name || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(service)
    return acc
  }, {} as Record<string, Service[]>)

  return (
    <div className="space-y-6">
      {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
        <div key={category}>
          <h3 className="text-sm font-medium text-gray-700 mb-3">{category}</h3>
          <RadioGroup value={selectedService} onChange={onServiceSelect} disabled={disabled}>
            <div className="space-y-2">
              {categoryServices.map((service) => (
                <RadioGroup.Option
                  key={service.id}
                  value={service}
                  className={({ active, checked }) =>
                    `${active ? 'ring-2 ring-teal-600 ring-offset-2' : ''}
                    ${checked ? 'bg-teal-50 border-teal-600' : 'bg-white border-gray-300'}
                    relative flex cursor-pointer rounded-lg border px-4 py-4 shadow-sm focus:outline-none
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`
                  }
                >
                  {({ active, checked }) => (
                    <>
                      <div className="flex flex-1 items-start">
                        <div className="flex-1">
                          <RadioGroup.Label
                            as="p"
                            className={`font-medium ${checked ? 'text-teal-900' : 'text-gray-900'}`}
                          >
                            {service.name}
                          </RadioGroup.Label>
                          {service.description && (
                            <RadioGroup.Description
                              as="p"
                              className={`mt-1 text-sm ${checked ? 'text-teal-700' : 'text-gray-500'}`}
                            >
                              {service.description}
                            </RadioGroup.Description>
                          )}
                          <div className="mt-2 flex items-center space-x-4 text-sm">
                            <div className="flex items-center text-gray-500">
                              <ClockIcon className="h-4 w-4 mr-1" />
                              {formatDuration(service.duration_minutes)}
                            </div>
                            {service.is_featured && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                Popular
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4 flex items-center">
                          <div className="text-right">
                            <p className={`text-lg font-semibold ${checked ? 'text-teal-900' : 'text-gray-900'}`}>
                              {formatPrice(service.base_price)}
                            </p>
                            {service.requires_deposit && (
                              <p className="text-xs text-gray-500">
                                Deposit required
                              </p>
                            )}
                          </div>
                          {checked && (
                            <div className="ml-3 flex h-5 w-5 items-center justify-center">
                              <CheckIcon className="h-5 w-5 text-teal-600" />
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </RadioGroup.Option>
              ))}
            </div>
          </RadioGroup>
        </div>
      ))}

      {selectedService && selectedService.requires_deposit && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> This service requires a{' '}
            {selectedService.deposit_type === 'percentage'
              ? `${selectedService.deposit_amount}%`
              : formatPrice(selectedService.deposit_amount || 0)}{' '}
            deposit to confirm your booking.
          </p>
        </div>
      )}
    </div>
  )
}
