'use client'

import { NavigationExample } from '@/components/navigation/NavigationExample'

export default function TestNavigationPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="py-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Hierarchical Navigation Components Demo
          </h1>
          <NavigationExample />
        </div>
      </div>
    </div>
  )
}