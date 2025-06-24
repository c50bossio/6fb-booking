/**
 * Service Worker Provider Component
 * Handles service worker registration and provides offline functionality
 */
'use client'

import React, { useEffect, useState } from 'react'
import { serviceWorkerManager } from '@/lib/serviceWorker/serviceWorkerManager'
import OfflineIndicator from '@/components/offline/OfflineIndicator'
import { errorTracker } from '@/lib/monitoring/errorTracking'

interface ServiceWorkerProviderProps {
  children: React.ReactNode
}

export default function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const [isRegistered, setIsRegistered] = useState(false)
  const [registrationError, setRegistrationError] = useState<string | null>(null)

  useEffect(() => {
    // Only register service worker in production or when explicitly enabled
    const shouldRegister = 
      process.env.NODE_ENV === 'production' || 
      process.env.NEXT_PUBLIC_ENABLE_SW === 'true'

    if (!shouldRegister) {
      console.log('[SWP] Service worker registration skipped in development')
      return
    }

    let mounted = true

    const registerServiceWorker = async () => {
      try {
        console.log('[SWP] Registering service worker...')
        
        const success = await serviceWorkerManager.register()
        
        if (mounted) {
          if (success) {
            setIsRegistered(true)
            console.log('[SWP] Service worker registered successfully')
            
            // Report successful registration
            errorTracker.captureError(new Error('Service worker registered'), {
              category: 'performance',
              severity: 'low',
              context: {
                component: 'ServiceWorkerProvider',
                action: 'sw_registration_success'
              },
              tags: ['service_worker', 'offline', 'success']
            })
          } else {
            setRegistrationError('Registration failed')
            console.warn('[SWP] Service worker registration failed')
          }
        }
      } catch (error) {
        console.error('[SWP] Service worker registration error:', error)
        
        if (mounted) {
          setRegistrationError(error instanceof Error ? error.message : 'Unknown error')
          
          // Report registration error
          errorTracker.captureError(
            error instanceof Error ? error : new Error('SW registration failed'),
            {
              category: 'javascript',
              severity: 'medium',
              context: {
                component: 'ServiceWorkerProvider',
                action: 'sw_registration_error'
              },
              tags: ['service_worker', 'offline', 'error']
            }
          )
        }
      }
    }

    // Register service worker
    registerServiceWorker()

    // Setup event listeners
    const handleRegistered = () => {
      if (mounted) {
        setIsRegistered(true)
        setRegistrationError(null)
      }
    }

    const handleError = (event: any) => {
      if (mounted) {
        setRegistrationError(event.error?.message || 'Service worker error')
        
        // Report runtime error
        errorTracker.captureError(
          event.error || new Error('Service worker runtime error'),
          {
            category: 'javascript',
            severity: 'medium',
            context: {
              component: 'ServiceWorkerProvider',
              action: 'sw_runtime_error'
            },
            tags: ['service_worker', 'runtime_error']
          }
        )
      }
    }

    const handleUpdateReady = () => {
      console.log('[SWP] Service worker update ready')
      
      // Optionally show update notification
      // This could be enhanced with a toast notification
      if (window.confirm('A new version is available. Would you like to update?')) {
        serviceWorkerManager.skipWaiting()
      }
    }

    const handleOffline = () => {
      console.log('[SWP] Application went offline')
      
      // Track offline events for analytics
      errorTracker.captureError(new Error('Application offline'), {
        category: 'network',
        severity: 'low',
        context: {
          component: 'ServiceWorkerProvider',
          action: 'went_offline'
        },
        tags: ['offline', 'network_status']
      })
    }

    const handleOnline = () => {
      console.log('[SWP] Application back online')
      
      // Track online events for analytics
      errorTracker.captureError(new Error('Application online'), {
        category: 'network',
        severity: 'low',
        context: {
          component: 'ServiceWorkerProvider',
          action: 'back_online'
        },
        tags: ['online', 'network_status']
      })
    }

    // Register event listeners
    serviceWorkerManager.on('registered', handleRegistered)
    serviceWorkerManager.on('error', handleError)
    serviceWorkerManager.on('updateReady', handleUpdateReady)
    serviceWorkerManager.on('offline', handleOffline)
    serviceWorkerManager.on('online', handleOnline)

    // Prefetch important routes after registration
    if (isRegistered) {
      const importantRoutes = [
        '/dashboard',
        '/dashboard/appointments',
        '/dashboard/calendar',
        '/dashboard/clients',
        '/dashboard/analytics'
      ]
      
      serviceWorkerManager.prefetchRoutes(importantRoutes)
        .then(() => console.log('[SWP] Important routes prefetched'))
        .catch(err => console.warn('[SWP] Route prefetching failed:', err))
    }

    return () => {
      mounted = false
      serviceWorkerManager.off('registered', handleRegistered)
      serviceWorkerManager.off('error', handleError)
      serviceWorkerManager.off('updateReady', handleUpdateReady)
      serviceWorkerManager.off('offline', handleOffline)
      serviceWorkerManager.off('online', handleOnline)
    }
  }, [isRegistered])

  // Provide service worker context to child components
  return (
    <>
      {children}
      {/* Offline indicator - only show if service worker is registered */}
      {isRegistered && <OfflineIndicator />}
      
      {/* Development error display */}
      {process.env.NODE_ENV === 'development' && registrationError && (
        <div className="fixed bottom-4 left-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-sm z-50">
          <strong className="font-bold">Service Worker Error:</strong>
          <span className="block sm:inline"> {registrationError}</span>
        </div>
      )}
    </>
  )
}

// Hook to access service worker functionality in components
export function useServiceWorkerContext() {
  return {
    serviceWorkerManager,
    isSupported: serviceWorkerManager.isServiceWorkerSupported,
    isRegistered: serviceWorkerManager.isServiceWorkerRegistered
  }
}