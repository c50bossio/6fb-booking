'use client'

import React, { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ChartBarIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { AnalyticsNavigation } from './shared/AnalyticsNavigation'

interface AnalyticsLayoutProps {
  children: ReactNode
  title?: string
  description?: string
  userRole?: string
  showNavigation?: boolean
  navigationVariant?: 'tabs' | 'cards' | 'sidebar'
  headerActions?: ReactNode
}

export function AnalyticsLayout({
  children,
  title = 'Analytics',
  description = 'Track performance and insights across your business',
  userRole,
  showNavigation = true,
  navigationVariant = 'tabs',
  headerActions
}: AnalyticsLayoutProps) {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push('/dashboard')}
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeftIcon className="w-4 h-4" />}
              >
                Dashboard
              </Button>
              <div className="border-l border-gray-300 dark:border-gray-600 h-6" />
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <ChartBarIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {title}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {description}
                  </p>
                </div>
              </div>
            </div>
            {headerActions && (
              <div className="flex items-center space-x-3">
                {headerActions}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        {showNavigation && (
          <div className="mb-6">
            <AnalyticsNavigation 
              userRole={userRole} 
              variant={navigationVariant}
            />
          </div>
        )}

        {/* Content */}
        <div className={navigationVariant === 'sidebar' ? 'grid grid-cols-1 lg:grid-cols-4 gap-6' : ''}>
          {navigationVariant === 'sidebar' && showNavigation && (
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <AnalyticsNavigation 
                  userRole={userRole} 
                  variant="sidebar"
                />
              </div>
            </div>
          )}
          <div className={navigationVariant === 'sidebar' ? 'lg:col-span-3' : ''}>
            {children}
          </div>
        </div>
      </div>
    </main>
  )
}

// Sub-layout for specific analytics sections
interface AnalyticsSectionLayoutProps {
  children: ReactNode
  sectionTitle: string
  sectionDescription?: string
  filters?: ReactNode
  actions?: ReactNode
}

export function AnalyticsSectionLayout({
  children,
  sectionTitle,
  sectionDescription,
  filters,
  actions
}: AnalyticsSectionLayoutProps) {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {sectionTitle}
            </h2>
            {sectionDescription && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {sectionDescription}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center space-x-3">
              {actions}
            </div>
          )}
        </div>
        
        {filters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {filters}
          </div>
        )}
      </div>

      {/* Section Content */}
      {children}
    </div>
  )
}