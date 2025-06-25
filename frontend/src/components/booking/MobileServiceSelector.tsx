'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScissorsIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckIcon,
  ChevronDownIcon,
  StarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import type { Service } from '@/lib/api/services'

interface MobileServiceSelectorProps {
  services: Service[]
  selectedService?: Service
  onServiceSelect: (service: Service) => void
  theme?: 'light' | 'dark'
}

export default function MobileServiceSelector({
  services,
  selectedService,
  onServiceSelect,
  theme = 'light'
}: MobileServiceSelectorProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Group services by category
  const groupedServices = services.reduce((acc, service) => {
    const category = service.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(service)
    return acc
  }, {} as Record<string, Service[]>)

  // Filter services based on search
  const filteredServices = searchQuery
    ? services.filter(service =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null

  // Get popular services
  const popularServices = services.filter(service => service.isPopular).slice(0, 3)

  const handleServiceSelect = (service: Service) => {
    onServiceSelect(service)
    // Haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search services..."
          className={`
            w-full px-4 py-3 pl-10 rounded-lg border transition-colors
            ${theme === 'dark'
              ? 'bg-[#24252E] border-[#2C2D3A] text-white placeholder-[#8B92A5] focus:border-[#20D9D2]'
              : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#20D9D2]'
            }
          `}
        />
        <ScissorsIcon className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
      </div>

      {/* Popular Services - Quick Selection */}
      {!searchQuery && popularServices.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <SparklesIcon className="w-4 h-4 text-[#20D9D2]" />
            <span>Popular Choices</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {popularServices.map((service) => (
              <motion.button
                key={service.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleServiceSelect(service)}
                className={`
                  relative p-4 rounded-lg border-2 transition-all text-left
                  ${selectedService?.id === service.id
                    ? 'border-[#20D9D2] bg-[#20D9D2]/10 dark:bg-[#20D9D2]/20'
                    : theme === 'dark'
                      ? 'border-[#2C2D3A] bg-[#24252E] active:bg-[#2C2D3A]'
                      : 'border-gray-200 bg-white active:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-3">
                    <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {service.name}
                    </h4>
                    <div className="flex items-center space-x-3 mt-1 text-sm">
                      <span className={`flex items-center ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-500'}`}>
                        <ClockIcon className="w-3.5 h-3.5 mr-1" />
                        {service.duration} min
                      </span>
                      <span className="flex items-center font-medium text-[#20D9D2]">
                        ${service.price}
                      </span>
                    </div>
                  </div>
                  {selectedService?.id === service.id && (
                    <div className="flex-shrink-0 w-6 h-6 bg-[#20D9D2] text-white rounded-full flex items-center justify-center">
                      <CheckIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchQuery && filteredServices && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-[#8B92A5]">
            {filteredServices.length} result{filteredServices.length !== 1 ? 's' : ''} found
          </p>
          <div className="grid grid-cols-1 gap-2">
            {filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                isSelected={selectedService?.id === service.id}
                onSelect={() => handleServiceSelect(service)}
                theme={theme}
              />
            ))}
          </div>
        </div>
      )}

      {/* Categorized Services */}
      {!searchQuery && (
        <div className="space-y-2">
          {Object.entries(groupedServices).map(([category, categoryServices]) => (
            <div key={category} className="border border-gray-200 dark:border-[#2C2D3A] rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                className={`
                  w-full px-4 py-3 flex items-center justify-between transition-colors
                  ${theme === 'dark'
                    ? 'bg-[#24252E] hover:bg-[#2C2D3A] text-white'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                  }
                `}
              >
                <span className="font-medium">{category}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 dark:text-[#8B92A5]">
                    {categoryServices.length} services
                  </span>
                  <ChevronDownIcon
                    className={`w-4 h-4 transition-transform ${
                      expandedCategory === category ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              <AnimatePresence>
                {expandedCategory === category && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-2 space-y-2 bg-white dark:bg-[#1A1B23]">
                      {categoryServices.map((service) => (
                        <ServiceCard
                          key={service.id}
                          service={service}
                          isSelected={selectedService?.id === service.id}
                          onSelect={() => handleServiceSelect(service)}
                          theme={theme}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* Selected Service Summary */}
      {selectedService && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-[#20D9D2]/10 dark:bg-[#20D9D2]/20 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#20D9D2] font-medium mb-1">Selected Service</p>
              <p className="font-medium text-gray-900 dark:text-white">{selectedService.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-[#8B92A5]">{selectedService.duration} min</p>
              <p className="font-semibold text-[#20D9D2]">${selectedService.price}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// Service Card Component
interface ServiceCardProps {
  service: Service
  isSelected: boolean
  onSelect: () => void
  theme: 'light' | 'dark'
}

function ServiceCard({ service, isSelected, onSelect, theme }: ServiceCardProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`
        relative p-4 rounded-lg border transition-all text-left w-full
        ${isSelected
          ? 'border-[#20D9D2] bg-[#20D9D2]/10 dark:bg-[#20D9D2]/20'
          : theme === 'dark'
            ? 'border-[#2C2D3A] bg-[#24252E] active:bg-[#2C2D3A]'
            : 'border-gray-200 bg-white active:bg-gray-50'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 pr-3">
          <div className="flex items-start space-x-2">
            <ScissorsIcon className="w-5 h-5 text-[#20D9D2] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {service.name}
              </h4>
              {service.description && (
                <p className={`text-sm mt-1 line-clamp-2 ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-600'}`}>
                  {service.description}
                </p>
              )}
              <div className="flex items-center space-x-3 mt-2">
                <span className={`text-sm flex items-center ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-500'}`}>
                  <ClockIcon className="w-3.5 h-3.5 mr-1" />
                  {service.duration} min
                </span>
                <span className="text-sm font-semibold text-[#20D9D2]">
                  ${service.price}
                </span>
                {service.isPopular && (
                  <span className="text-xs px-2 py-0.5 bg-[#20D9D2]/20 text-[#20D9D2] rounded-full">
                    Popular
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        {isSelected && (
          <div className="flex-shrink-0 w-6 h-6 bg-[#20D9D2] text-white rounded-full flex items-center justify-center">
            <CheckIcon className="w-4 h-4" />
          </div>
        )}
      </div>
    </motion.button>
  )
}
