'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  UserIcon,
  StarIcon,
  CheckIcon,
  UserGroupIcon,
  SparklesIcon,
  ClockIcon,
  TrophyIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface Barber {
  id: string
  name: string
  avatar?: string
  rating: number
  reviewCount: number
  specialties: string[]
  experience: string
  availability: { [date: string]: string[] }
  isRecommended?: boolean
  nextAvailable?: string
}

interface MobileBarberSelectorProps {
  barbers: Barber[]
  selectedBarber?: Barber
  onBarberSelect: (barber: Barber | null) => void
  selectedService?: any
  theme?: 'light' | 'dark'
}

export default function MobileBarberSelector({
  barbers,
  selectedBarber,
  onBarberSelect,
  selectedService,
  theme = 'light'
}: MobileBarberSelectorProps) {
  const [showAllBarbers, setShowAllBarbers] = useState(false)

  // Sort barbers by recommendation and rating
  const sortedBarbers = [...barbers].sort((a, b) => {
    if (a.isRecommended && !b.isRecommended) return -1
    if (!a.isRecommended && b.isRecommended) return 1
    return b.rating - a.rating
  })

  // Get recommended barbers
  const recommendedBarbers = sortedBarbers.filter(barber => barber.isRecommended)
  const otherBarbers = sortedBarbers.filter(barber => !barber.isRecommended)

  const handleBarberSelect = (barber: Barber | null) => {
    onBarberSelect(barber)
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
  }

  const renderRating = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <StarIconSolid key={i} className="w-4 h-4 text-yellow-400" />
        )
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative w-4 h-4">
            <StarIcon className="absolute inset-0 w-4 h-4 text-gray-300" />
            <div className="absolute inset-0 w-2 h-4 overflow-hidden">
              <StarIconSolid className="w-4 h-4 text-yellow-400" />
            </div>
          </div>
        )
      } else {
        stars.push(
          <StarIcon key={i} className="w-4 h-4 text-gray-300" />
        )
      }
    }
    return stars
  }

  return (
    <div className="space-y-4">
      {/* No Preference Option */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => handleBarberSelect(null)}
        className={`
          w-full p-4 rounded-lg border-2 transition-all
          ${!selectedBarber
            ? 'border-[#20D9D2] bg-[#20D9D2]/10 dark:bg-[#20D9D2]/20'
            : theme === 'dark'
              ? 'border-[#2C2D3A] bg-[#24252E] active:bg-[#2C2D3A]'
              : 'border-gray-200 bg-white active:bg-gray-50'
          }
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#20D9D2] to-[#1FA39A] rounded-full flex items-center justify-center">
              <UserGroupIcon className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                No Preference
              </h4>
              <p className={`text-sm ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-600'}`}>
                We'll match you with the best available barber
              </p>
            </div>
          </div>
          {!selectedBarber && (
            <div className="flex-shrink-0 w-6 h-6 bg-[#20D9D2] text-white rounded-full flex items-center justify-center">
              <CheckIcon className="w-4 h-4" />
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-center space-x-2 text-xs text-[#20D9D2]">
          <SparklesIcon className="w-3.5 h-3.5" />
          <span>Recommended for first-time customers</span>
        </div>
      </motion.button>

      {/* Recommended Barbers */}
      {recommendedBarbers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <TrophyIcon className="w-4 h-4 text-[#20D9D2]" />
            <span>Top Rated Barbers</span>
          </div>
          <div className="space-y-2">
            {recommendedBarbers.map((barber) => (
              <BarberCard
                key={barber.id}
                barber={barber}
                isSelected={selectedBarber?.id === barber.id}
                onSelect={() => handleBarberSelect(barber)}
                theme={theme}
                renderRating={renderRating}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Barbers */}
      {otherBarbers.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowAllBarbers(!showAllBarbers)}
            className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            <span>Other Barbers ({otherBarbers.length})</span>
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform ${showAllBarbers ? 'rotate-180' : ''}`}
            />
          </button>

          {showAllBarbers && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2"
            >
              {otherBarbers.map((barber) => (
                <BarberCard
                  key={barber.id}
                  barber={barber}
                  isSelected={selectedBarber?.id === barber.id}
                  onSelect={() => handleBarberSelect(barber)}
                  theme={theme}
                  renderRating={renderRating}
                />
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* Selected Barber Summary */}
      {selectedBarber && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-[#20D9D2]/10 dark:bg-[#20D9D2]/20 rounded-lg"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {selectedBarber.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <p className="text-sm text-[#20D9D2] font-medium">Selected Barber</p>
              <p className="font-medium text-gray-900 dark:text-white">{selectedBarber.name}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// Barber Card Component
interface BarberCardProps {
  barber: Barber
  isSelected: boolean
  onSelect: () => void
  theme: 'light' | 'dark'
  renderRating: (rating: number) => React.ReactNode[]
}

function BarberCard({ barber, isSelected, onSelect, theme, renderRating }: BarberCardProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`
        w-full p-4 rounded-lg border transition-all text-left
        ${isSelected
          ? 'border-[#20D9D2] bg-[#20D9D2]/10 dark:bg-[#20D9D2]/20'
          : theme === 'dark'
            ? 'border-[#2C2D3A] bg-[#24252E] active:bg-[#2C2D3A]'
            : 'border-gray-200 bg-white active:bg-gray-50'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {barber.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1">
            <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {barber.name}
            </h4>

            {/* Rating */}
            <div className="flex items-center space-x-2 mt-1">
              <div className="flex items-center space-x-0.5">
                {renderRating(barber.rating)}
              </div>
              <span className={`text-sm ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-600'}`}>
                {barber.rating} ({barber.reviewCount})
              </span>
            </div>

            {/* Experience */}
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-600'}`}>
              {barber.experience} experience
            </p>

            {/* Specialties */}
            <div className="flex flex-wrap gap-1 mt-2">
              {barber.specialties.slice(0, 2).map((specialty, index) => (
                <span
                  key={index}
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    theme === 'dark'
                      ? 'bg-violet-900/50 text-violet-300'
                      : 'bg-violet-100 text-violet-800'
                  }`}
                >
                  {specialty}
                </span>
              ))}
              {barber.specialties.length > 2 && (
                <span className={`text-xs ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-500'}`}>
                  +{barber.specialties.length - 2}
                </span>
              )}
            </div>

            {/* Next Available */}
            {barber.nextAvailable && (
              <div className="flex items-center space-x-1 mt-2 text-xs text-[#20D9D2]">
                <ClockIcon className="w-3.5 h-3.5" />
                <span>Next available: {barber.nextAvailable}</span>
              </div>
            )}
          </div>
        </div>

        {isSelected && (
          <div className="flex-shrink-0 w-6 h-6 bg-[#20D9D2] text-white rounded-full flex items-center justify-center ml-2">
            <CheckIcon className="w-4 h-4" />
          </div>
        )}
      </div>

      {barber.isRecommended && (
        <div className="mt-2 flex items-center justify-center space-x-1 text-xs text-[#20D9D2]">
          <StarIcon className="w-3.5 h-3.5" />
          <span>Highly Recommended</span>
        </div>
      )}
    </motion.button>
  )
}

// Import ChevronDownIcon
import { ChevronDownIcon } from '@heroicons/react/24/outline'
