/**
 * PWA Install Prompt Component
 * Handles Progressive Web App installation prompts and management
 */
'use client'

import React, { useState, useEffect } from 'react'
import { Download, X, Smartphone, Monitor } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface PWAInstallerProps {
  className?: string
  autoShow?: boolean
  minimized?: boolean
}

export default function PWAInstaller({ className, autoShow = true, minimized = false }: PWAInstallerProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [installationSupported, setInstallationSupported] = useState(false)
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('desktop')

  useEffect(() => {
    // Check if app is already installed or in standalone mode
    const checkInstallationStatus = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches
      const webkitStandalone = (window.navigator as any)?.standalone === true
      
      setIsStandalone(standalone || webkitStandalone)
      setIsInstalled(standalone || webkitStandalone)
    }

    // Detect device type
    const detectDeviceType = () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setDeviceType(isMobile ? 'mobile' : 'desktop')
    }

    checkInstallationStatus()
    detectDeviceType()

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      const promptEvent = event as BeforeInstallPromptEvent
      
      console.log('[PWA] Install prompt available')
      setDeferredPrompt(promptEvent)
      setInstallationSupported(true)
      
      // Show install prompt if auto-show is enabled and not already installed
      if (autoShow && !isInstalled) {
        setShowInstallPrompt(true)
      }
    }

    // Listen for app installation
    const handleAppInstalled = () => {
      console.log('[PWA] App installed successfully')
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Check if installation is supported on this platform
    const checkSupport = () => {
      const isSupported = 
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
      setInstallationSupported(isSupported)
    }

    checkSupport()

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [autoShow, isInstalled])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback instructions for unsupported browsers
      setShowInstallPrompt(true)
      return
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt()
      
      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice
      
      console.log('[PWA] User choice:', outcome)
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted installation')
      } else {
        console.log('[PWA] User dismissed installation')
      }
      
      // Clean up
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
      
    } catch (error) {
      console.error('[PWA] Installation error:', error)
    }
  }

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false)
    // Remember dismissal for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true')
  }

  // Don't show if already installed or dismissed
  if (isInstalled || !installationSupported) {
    return null
  }

  // Check if user has dismissed this session
  if (typeof window !== 'undefined' && sessionStorage.getItem('pwa-install-dismissed')) {
    return null
  }

  // Minimized version (for header/navbar)
  if (minimized) {
    return (
      <Button
        onClick={handleInstallClick}
        size="sm"
        variant="outline"
        className={`flex items-center space-x-2 ${className}`}
      >
        <Download className="h-4 w-4" />
        <span>Install App</span>
      </Button>
    )
  }

  // Full install prompt
  if (!showInstallPrompt && !deferredPrompt) {
    return null
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 ${className}`}>
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {deviceType === 'mobile' ? (
                <Smartphone className="h-6 w-6 text-[#20D9D2]" />
              ) : (
                <Monitor className="h-6 w-6 text-[#20D9D2]" />
              )}
            </div>
            
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Install 6FB Booking
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Get the full app experience with offline access, faster loading, and desktop notifications.
              </p>
              
              <div className="flex space-x-2">
                <Button
                  onClick={handleInstallClick}
                  size="sm"
                  className="bg-[#20D9D2] hover:bg-[#1BC5B8] text-white"
                >
                  <Download className="h-3 w-3 mr-2" />
                  Install
                </Button>
                <Button
                  onClick={dismissInstallPrompt}
                  size="sm"
                  variant="ghost"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Not now
                </Button>
              </div>
            </div>
            
            <button
              onClick={dismissInstallPrompt}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Installation instructions for unsupported browsers
export function PWAInstallInstructions({ onClose }: { onClose: () => void }) {
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop')

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceType('ios')
    } else if (/android/.test(userAgent)) {
      setDeviceType('android')
    } else {
      setDeviceType('desktop')
    }
  }, [])

  const getInstructions = () => {
    switch (deviceType) {
      case 'ios':
        return [
          'Tap the Share button in Safari',
          'Scroll down and tap "Add to Home Screen"',
          'Tap "Add" to install the app'
        ]
      case 'android':
        return [
          'Tap the menu button (⋮) in your browser',
          'Select "Add to Home screen" or "Install app"',
          'Tap "Install" to confirm'
        ]
      default:
        return [
          'Click the install icon in your address bar',
          'Or use the browser menu and select "Install app"',
          'Follow the prompts to complete installation'
        ]
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Install 6FB Booking
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Install the 6FB Booking app for a better experience:
            </p>

            <ul className="space-y-2">
              {getInstructions().map((instruction, index) => (
                <li key={index} className="flex items-start space-x-2 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 bg-[#20D9D2] text-white rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">{instruction}</span>
                </li>
              ))}
            </ul>

            <div className="pt-4">
              <Button
                onClick={onClose}
                className="w-full bg-[#20D9D2] hover:bg-[#1BC5B8] text-white"
              >
                Got it
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for PWA functionality
export function usePWA() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    const checkPWAStatus = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches
      const webkitStandalone = (window.navigator as any)?.standalone === true
      
      setIsStandalone(standalone || webkitStandalone)
      setIsInstalled(standalone || webkitStandalone)
    }

    const handleBeforeInstallPrompt = () => {
      setCanInstall(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setCanInstall(false)
    }

    checkPWAStatus()

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  return {
    isInstalled,
    isStandalone,
    canInstall,
    isSupported: 'serviceWorker' in navigator
  }
}