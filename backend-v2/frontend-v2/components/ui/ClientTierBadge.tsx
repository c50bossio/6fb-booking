'use client'

import React from 'react'
import { 
  TrophyIcon,
  StarIcon,
  SparklesIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { 
  TrophyIcon as TrophyIconSolid,
  StarIcon as StarIconSolid,
  SparklesIcon as SparklesIconSolid,
  UserIcon as UserIconSolid,
} from '@heroicons/react/24/solid'

export type ClientTier = 'platinum' | 'gold' | 'silver' | 'bronze' | 'new'

interface ClientTierBadgeProps {
  tier: ClientTier
  size?: 'sm' | 'md' | 'lg'
  variant?: 'badge' | 'icon' | 'full'
  showLabel?: boolean
  className?: string
  solid?: boolean
}

export default function ClientTierBadge({
  tier,
  size = 'md',
  variant = 'badge',
  showLabel = true,
  className = '',
  solid = false
}: ClientTierBadgeProps) {
  
  const getTierConfig = (tier: ClientTier) => {
    const configs = {
      platinum: {
        label: 'Platinum',
        colors: {
          bg: 'bg-yellow-500',
          text: 'text-white',
          badgeBg: 'bg-yellow-100 dark:bg-yellow-900',
          badgeText: 'text-yellow-800 dark:text-yellow-200',
          border: 'border-yellow-500'
        },
        icon: solid ? TrophyIconSolid : TrophyIcon
      },
      gold: {
        label: 'Gold',
        colors: {
          bg: 'bg-yellow-400',
          text: 'text-white',
          badgeBg: 'bg-yellow-50 dark:bg-yellow-900/30',
          badgeText: 'text-yellow-700 dark:text-yellow-300',
          border: 'border-yellow-400'
        },
        icon: solid ? StarIconSolid : StarIcon
      },
      silver: {
        label: 'Silver',
        colors: {
          bg: 'bg-gray-400',
          text: 'text-white',
          badgeBg: 'bg-gray-100 dark:bg-gray-800',
          badgeText: 'text-gray-800 dark:text-gray-200',
          border: 'border-gray-400'
        },
        icon: solid ? SparklesIconSolid : SparklesIcon
      },
      bronze: {
        label: 'Bronze',
        colors: {
          bg: 'bg-orange-600',
          text: 'text-white',
          badgeBg: 'bg-orange-100 dark:bg-orange-900',
          badgeText: 'text-orange-800 dark:text-orange-200',
          border: 'border-orange-600'
        },
        icon: solid ? UserIconSolid : UserIcon
      },
      new: {
        label: 'New',
        colors: {
          bg: 'bg-green-500',
          text: 'text-white',
          badgeBg: 'bg-green-100 dark:bg-green-900',
          badgeText: 'text-green-800 dark:text-green-200',
          border: 'border-green-500'
        },
        icon: solid ? SparklesIconSolid : SparklesIcon
      }
    }
    
    return configs[tier] || configs.new
  }

  const getSizeConfig = (size: 'sm' | 'md' | 'lg') => {
    const configs = {
      sm: {
        iconSize: 'w-3 h-3',
        avatarSize: 'w-6 h-6',
        badgePadding: 'px-1.5 py-0.5',
        textSize: 'text-xs',
        fullPadding: 'px-2 py-1'
      },
      md: {
        iconSize: 'w-4 h-4',
        avatarSize: 'w-8 h-8',
        badgePadding: 'px-2 py-1',
        textSize: 'text-sm',
        fullPadding: 'px-3 py-1.5'
      },
      lg: {
        iconSize: 'w-5 h-5',
        avatarSize: 'w-10 h-10',
        badgePadding: 'px-3 py-1.5',
        textSize: 'text-base',
        fullPadding: 'px-4 py-2'
      }
    }
    
    return configs[size]
  }

  const tierConfig = getTierConfig(tier)
  const sizeConfig = getSizeConfig(size)
  const Icon = tierConfig.icon

  // Icon only variant
  if (variant === 'icon') {
    return (
      <div className={`
        ${sizeConfig.avatarSize} 
        ${tierConfig.colors.bg} 
        ${tierConfig.colors.text}
        rounded-full 
        flex 
        items-center 
        justify-center
        ${className}
      `}>
        <Icon className={sizeConfig.iconSize} />
      </div>
    )
  }

  // Badge variant (pill-shaped)
  if (variant === 'badge') {
    return (
      <span className={`
        inline-flex
        items-center
        ${sizeConfig.badgePadding}
        ${tierConfig.colors.badgeBg}
        ${tierConfig.colors.badgeText}
        ${sizeConfig.textSize}
        font-medium
        rounded-full
        capitalize
        ${className}
      `}>
        <Icon className={`${sizeConfig.iconSize} ${showLabel ? 'mr-1' : ''}`} />
        {showLabel && tierConfig.label}
      </span>
    )
  }

  // Full variant (with border and background)
  if (variant === 'full') {
    return (
      <div className={`
        inline-flex
        items-center
        ${sizeConfig.fullPadding}
        border-2
        ${tierConfig.colors.border}
        ${tierConfig.colors.badgeBg}
        ${tierConfig.colors.badgeText}
        ${sizeConfig.textSize}
        font-semibold
        rounded-lg
        ${className}
      `}>
        <div className={`
          ${sizeConfig.avatarSize}
          ${tierConfig.colors.bg}
          ${tierConfig.colors.text}
          rounded-full
          flex
          items-center
          justify-center
          mr-2
        `}>
          <Icon className={sizeConfig.iconSize} />
        </div>
        {showLabel && (
          <span className="capitalize">{tierConfig.label} Tier</span>
        )}
      </div>
    )
  }

  // Default to badge variant
  return (
    <span className={`
      inline-flex
      items-center
      ${sizeConfig.badgePadding}
      ${tierConfig.colors.badgeBg}
      ${tierConfig.colors.badgeText}
      ${sizeConfig.textSize}
      font-medium
      rounded-full
      capitalize
      ${className}
    `}>
      <Icon className={`${sizeConfig.iconSize} ${showLabel ? 'mr-1' : ''}`} />
      {showLabel && tierConfig.label}
    </span>
  )
}

// Utility function to get tier color for external use
export const getTierColor = (tier: ClientTier) => {
  const colorMap = {
    platinum: 'yellow',
    gold: 'yellow',
    silver: 'gray',
    bronze: 'orange',
    new: 'green'
  }
  return colorMap[tier] || colorMap.new
}

// Utility function to get tier priority (for sorting)
export const getTierPriority = (tier: ClientTier): number => {
  const priorities = {
    platinum: 5,
    gold: 4,
    silver: 3,
    bronze: 2,
    new: 1
  }
  return priorities[tier] || 0
}

// Component for displaying client tier with additional info
interface ClientTierDisplayProps {
  tier: ClientTier
  priority?: string
  confidence?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ClientTierDisplay({
  tier,
  priority,
  confidence,
  size = 'md',
  className = ''
}: ClientTierDisplayProps) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <ClientTierBadge tier={tier} size={size} variant="badge" />
      {priority && (
        <span className={`
          px-2 py-1 text-xs font-medium rounded-full
          bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200
        `}>
          {priority}
        </span>
      )}
      {confidence && (
        <span className={`
          text-xs text-gray-500 dark:text-gray-400
        `}>
          {(confidence * 100).toFixed(0)}% confident
        </span>
      )}
    </div>
  )
}

export { ClientTierBadge }