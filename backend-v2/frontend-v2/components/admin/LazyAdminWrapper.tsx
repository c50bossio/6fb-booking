'use client'

import React, { Suspense } from 'react'
import { LazyComponents } from '@/lib/lazy-loading'
import { PageLoading } from '@/components/ui/LoadingSystem'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Lazy Admin Wrapper
 * 
 * Provides lazy loading for admin components to reduce bundle size
 * for non-admin users and improve initial page load performance.
 */

interface LazyAdminWrapperProps {
  children: React.ReactNode
  title?: string
  description?: string
  requiresAdmin?: boolean
}

const AdminLoadingFallback = () => (
  <div className="min-h-screen bg-gray-50 p-4">
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="flex items-center justify-center mt-8">
          <PageLoading message="Loading admin panel..." />
        </div>
      </CardContent>
    </Card>
  </div>
)

export function LazyAdminWrapper({ 
  children, 
  title = "Admin Panel", 
  description = "Loading administrative tools...",
  requiresAdmin = true 
}: LazyAdminWrapperProps) {
  return (
    <Suspense fallback={<AdminLoadingFallback />}>
      <div className="admin-wrapper">
        {children}
      </div>
    </Suspense>
  )
}

// Lazy-loaded admin components for better code splitting
export const LazyAdminComponents = {
  UserManagement: React.lazy(() => import('./UserManagement')),
  BookingSettings: React.lazy(() => import('./BookingSettings')),
  SystemSettings: React.lazy(() => import('./SystemSettings')),
  Analytics: React.lazy(() => import('./AdminAnalytics')),
  WebhookManager: React.lazy(() => import('./WebhookManager')),
}

// HOC for wrapping admin pages with lazy loading
export function withLazyAdmin<P extends object>(Component: React.ComponentType<P>) {
  return function LazyAdminPage(props: P) {
    return (
      <LazyAdminWrapper>
        <Suspense fallback={<AdminLoadingFallback />}>
          <Component {...props} />
        </Suspense>
      </LazyAdminWrapper>
    )
  }
}

export default LazyAdminWrapper