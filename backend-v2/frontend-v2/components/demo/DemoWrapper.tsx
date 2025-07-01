'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeftIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'

interface DemoWrapperProps {
  children: ReactNode
  title: string
  description: string
  demoFeatures?: string[]
  showBackButton?: boolean
  className?: string
}

export default function DemoWrapper({
  children,
  title,
  description,
  demoFeatures = [],
  showBackButton = true,
  className = ""
}: DemoWrapperProps) {
  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Demo Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/20 backdrop-blur rounded-full">
                <SparklesIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-sm">Demo Mode Active</div>
                <div className="text-xs text-purple-200">All data is simulated - feel free to explore!</div>
              </div>
            </div>
            {showBackButton && (
              <Link href="/demo">
                <Button variant="ghost" size="sm" className="!text-white hover:!bg-white/20">
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Back to Demo Hub
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{description}</p>
            </div>
            
            {demoFeatures.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 text-sm mb-2">
                  💡 Demo Features to Try:
                </h3>
                <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  {demoFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  )
}