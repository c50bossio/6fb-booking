'use client'

import React, { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BuildingStorefrontIcon,
  ChartBarIcon,
  CogIcon,
  UserIcon,
  ChevronDownIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { User } from '@/lib/api'
import { dashboardRouter } from '@/lib/dashboard-router'

interface DashboardSwitcherProps {
  user: User
  className?: string
  compact?: boolean
}

// Icon mapping for dashboard types
const DASHBOARD_ICONS = {
  '/admin': CogIcon,
  '/enterprise/dashboard': BuildingStorefrontIcon,
  '/dashboard': ChartBarIcon,
  '/client-dashboard': UserIcon,
  '/barber/earnings': ChartBarIcon
} as const

export function DashboardSwitcher({ user, className = '', compact = false }: DashboardSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  
  // Get dashboard configuration
  const config = dashboardRouter.getConfig(user)
  const options = dashboardRouter.getNavigationOptions(user)
  const recommendations = dashboardRouter.getRecommendations(user, pathname)
  
  // Don't render if user doesn't have multiple dashboard options
  if (!config.hasMultipleOptions) {
    return null
  }
  
  // Get current dashboard info
  const currentOption = options.find(option => option.isCurrent) || options[0]
  const IconComponent = DASHBOARD_ICONS[currentOption.route as keyof typeof DASHBOARD_ICONS] || ChartBarIcon
  
  const handleDashboardSwitch = (route: string) => {
    setIsOpen(false)
    if (route !== pathname) {
      router.push(route)
    }
  }
  
  if (compact) {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center space-x-2 ${className}`}
        >
          <IconComponent className="w-4 h-4" />
          <span className="hidden sm:inline">{currentOption.name}</span>
          <ChevronDownIcon className="w-3 h-3" />
        </Button>
        
        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
            <div className="p-2">
              {options.map((option) => (
                <button
                  key={option.route}
                  onClick={() => handleDashboardSwitch(option.route)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between group ${
                    option.isCurrent ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {React.createElement(DASHBOARD_ICONS[option.route as keyof typeof DASHBOARD_ICONS] || ChartBarIcon, {
                      className: `w-4 h-4 ${option.isCurrent ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`
                    })}
                    <div>
                      <div className="font-medium">{option.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{option.description}</div>
                    </div>
                  </div>
                  {option.isCurrent && (
                    <CheckIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  )}
                </button>
              ))}
              
              {recommendations.length > 0 && (
                <>
                  <hr className="my-2 border-gray-200 dark:border-gray-600" />
                  <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Recommended
                  </div>
                  {recommendations.map((rec, index) => (
                    <button
                      key={index}
                      onClick={() => handleDashboardSwitch(rec.route)}
                      className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                    >
                      <div className="font-medium text-primary-600 dark:text-primary-400">{rec.title}</div>
                      <div className="text-xs">{rec.reason}</div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }
  
  return (
    <Card className={`${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dashboard Options</h3>
          <IconComponent className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option.route}
              onClick={() => handleDashboardSwitch(option.route)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                option.isCurrent
                  ? 'border-primary-200 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {React.createElement(DASHBOARD_ICONS[option.route as keyof typeof DASHBOARD_ICONS] || ChartBarIcon, {
                    className: `w-5 h-5 ${
                      option.isCurrent 
                        ? 'text-primary-600 dark:text-primary-400' 
                        : 'text-gray-400'
                    }`
                  })}
                  <div>
                    <div className={`font-medium ${
                      option.isCurrent 
                        ? 'text-primary-600 dark:text-primary-400' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {option.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {option.description}
                    </div>
                  </div>
                </div>
                {option.isCurrent && (
                  <CheckIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                )}
                {option.isPrimary && !option.isCurrent && (
                  <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-2 py-1 rounded-full">
                    Primary
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default DashboardSwitcher