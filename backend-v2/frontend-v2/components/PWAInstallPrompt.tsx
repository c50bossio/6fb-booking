'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Download, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if user has dismissed the prompt before
    const hasPromptBeenDismissed = localStorage.getItem('pwa-prompt-dismissed')
    if (hasPromptBeenDismissed) {
      return
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show our custom prompt after a delay
      setTimeout(() => setShowPrompt(true), 2000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
      setIsInstalled(true)
    } else {
      console.log('User dismissed the install prompt')
    }

    // Clear the deferredPrompt for reuse
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-prompt-dismissed', 'true')
  }

  if (!showPrompt || isInstalled) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-96">
      <Card className="shadow-lg border-primary-200 dark:border-primary-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
              <Smartphone className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Install BookedBarber</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Install our app for a faster experience with offline access and push notifications
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Install
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-muted-foreground"
                >
                  Not now
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Service Worker Registration Hook - DISABLED IN DEVELOPMENT
export function useServiceWorker() {
  const [isRegistered, setIsRegistered] = useState(false)
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)

  useEffect(() => {
    // ALWAYS disable service worker in development mode
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    if (isDevelopment) {
      console.log('🛠️ Service Worker COMPLETELY DISABLED in development mode')
      
      // Aggressively unregister any existing service workers
      if ('serviceWorker' in navigator) {
        // Clear all caches first
        caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              console.log('🗑️ Clearing cache:', cacheName)
              return caches.delete(cacheName)
            })
          )
        }).then(() => {
          console.log('✅ All caches cleared in development mode')
        }).catch(error => {
          console.log('Cache clearing completed with some errors (expected)')
        })
        
        // Unregister all service workers
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            console.log('🗑️ Unregistering service worker:', registration.scope)
            registration.unregister().then((success) => {
              console.log('✅ Service worker unregistered:', success)
              // Force page reload after unregistration
              if (success) {
                console.log('🔄 Reloading page to complete service worker removal')
                setTimeout(() => window.location.reload(), 1000)
              }
            }).catch((error) => {
              console.error('❌ Failed to unregister service worker:', error)
            })
          })
        })
        
        // Prevent any controller from functioning
        if (navigator.serviceWorker.controller) {
          console.log('🛑 Terminating existing service worker controller')
          navigator.serviceWorker.controller.postMessage({ type: 'TERMINATE' })
        }
      }
      return
    }
    
    // Only register service worker in production
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration)
          setIsRegistered(true)

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setIsUpdateAvailable(true)
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })

      // Handle controller change
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true
          window.location.reload()
        }
      })
    }
  }, [])

  const updateServiceWorker = () => {
    if (isUpdateAvailable) {
      navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' })
    }
  }

  return {
    isRegistered,
    isUpdateAvailable,
    updateServiceWorker
  }
}