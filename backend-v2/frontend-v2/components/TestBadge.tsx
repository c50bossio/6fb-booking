'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'

interface TestBadgeProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * TestBadge component
 * Shows a "TEST" badge to mark test data items
 */
export function TestBadge({ className = '', size = 'sm' }: TestBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  }

  return (
    <Badge 
      variant="secondary" 
      className={`bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 font-medium ${sizeClasses[size]} ${className}`}
    >
      TEST
    </Badge>
  )
}

/**
 * Hook to determine if an item is test data
 */
export function useIsTestData(item: any): boolean {
  // Check various ways an item might be marked as test data
  return !!(
    item?.is_test_data || 
    item?.isTestData ||
    item?.test_data ||
    item?.email?.includes('@testdata.com') ||
    item?.email?.includes('@testbarber.com')
  )
}