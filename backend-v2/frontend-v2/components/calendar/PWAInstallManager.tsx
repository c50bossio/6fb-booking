'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { 
  DevicePhoneMobileIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CpuChipIcon,
  WifiIcon,
  BatteryIcon,
  ClockIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface BeforeInstallPromptEvent extends Event {
  platforms: Array<string>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface PWACapabilities {
  isInstallable: boolean
  isInstalled: boolean
  isStandalone: boolean
  supportsPush: boolean
  supportsSync: boolean
  supportsOffline: boolean
  platform: 'ios' | 'android' | 'desktop' | 'unknown'
  installMethod: 'prompt' | 'manual' | 'unavailable'
}

interface PWAInstallManagerProps {
  className?: string
  autoPrompt?: boolean
  showFeatures?: boolean
  onInstallStart?: () => void
  onInstallComplete?: () => void
  onInstallCancel?: () => void
}

export default function PWAInstallManager({
  className,
  autoPrompt = false,
  showFeatures = true,
  onInstallStart,
  onInstallComplete,
  onInstallCancel
}: PWAInstallManagerProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installPromptShown, setInstallPromptShown] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [installationStep, setInstallationStep] = useState(0)
  const [showPromptBanner, setShowPromptBanner] = useState(false)
  const [capabilities, setCapabilities] = useState<PWACapabilities>({
    isInstallable: false,
    isInstalled: false,
    isStandalone: false,
    supportsPush: false,
    supportsSync: false,
    supportsOffline: false,
    platform: 'unknown',
    installMethod: 'unavailable'
  })

  const installStepsRef = useRef([
    'Preparing installation...',
    'Checking device compatibility...',
    'Setting up offline storage...',
    'Configuring notifications...',
    'Finalizing installation...'
  ])

  // Detect platform and capabilities
  useEffect(() => {
    const detectPlatformAndCapabilities = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone ||
                          document.referrer.includes('android-app://')

      let platform: PWACapabilities['platform'] = 'unknown'
      let installMethod: PWACapabilities['installMethod'] = 'unavailable'

      // Detect platform
      if (/iphone|ipad|ipod/.test(userAgent)) {
        platform = 'ios'
        installMethod = 'manual' // iOS requires manual installation via Share menu
      } else if (/android/.test(userAgent)) {
        platform = 'android'
        installMethod = deferredPrompt ? 'prompt' : 'manual'
      } else if (!/mobi/.test(userAgent)) {
        platform = 'desktop'
        installMethod = deferredPrompt ? 'prompt' : 'manual'
      }

      setCapabilities({
        isInstallable: !!deferredPrompt || platform === 'ios',
        isInstalled: isStandalone,
        isStandalone,
        supportsPush: 'PushManager' in window && 'serviceWorker' in navigator,
        supportsSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
        supportsOffline: 'serviceWorker' in navigator && 'caches' in window,
        platform,
        installMethod
      })
    }

    detectPlatformAndCapabilities()

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleDisplayModeChange = () => detectPlatformAndCapabilities()
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleDisplayModeChange)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange)
      } else {
        mediaQuery.removeListener(handleDisplayModeChange)
      }
    }
  }, [deferredPrompt])

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const installEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(installEvent)
      
      // Show prompt banner if auto-prompt is enabled
      if (autoPrompt && !installPromptShown) {
        setShowPromptBanner(true)
      }
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setShowPromptBanner(false)
      setCapabilities(prev => ({ ...prev, isInstalled: true, isStandalone: true }))
      onInstallComplete?.()
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [autoPrompt, installPromptShown, onInstallComplete])

  // Handle PWA installation
  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return

    setIsInstalling(true)
    setInstallationStep(0)
    onInstallStart?.()

    try {
      // Simulate installation steps for better UX
      for (let i = 0; i < installStepsRef.current.length; i++) {
        setInstallationStep(i)
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Trigger the install prompt
      await deferredPrompt.prompt()
      
      // Wait for user choice
      const choiceResult = await deferredPrompt.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt')
        setDeferredPrompt(null)
        setShowPromptBanner(false)
        setInstallPromptShown(true)
      } else {
        console.log('User dismissed the install prompt')
        onInstallCancel?.()
      }
    } catch (error) {
      console.error('Installation failed:', error)
      onInstallCancel?.()
    } finally {
      setIsInstalling(false)
      setInstallationStep(0)
    }
  }, [deferredPrompt, onInstallStart, onInstallCancel])

  // Handle manual installation (iOS/fallback)
  const handleManualInstall = useCallback(() => {
    setInstallPromptShown(true)
    onInstallStart?.()
  }, [onInstallStart])

  // Dismiss install banner
  const dismissBanner = useCallback(() => {
    setShowPromptBanner(false)
    setInstallPromptShown(true)
  }, [])

  // Get platform-specific installation instructions
  const getInstallInstructions = () => {
    switch (capabilities.platform) {
      case 'ios':
        return {
          title: 'Install BookedBarber App',
          steps: [
            'Tap the Share button at the bottom of your screen',
            'Scroll down and tap "Add to Home Screen"',
            'Tap "Add" in the top-right corner',
            'The app will appear on your home screen'
          ],
          icon: ShareIcon
        }
      case 'android':
        return {
          title: 'Install BookedBarber App',
          steps: [
            'Tap "Install" when prompted',
            'Or use the menu (⋮) and select "Install app"',
            'Confirm installation in the popup',
            'The app will appear in your app drawer'
          ],
          icon: ArrowDownTrayIcon
        }
      case 'desktop':
        return {
          title: 'Install BookedBarber App',
          steps: [
            'Click the install icon in your address bar',
            'Or use the menu and select "Install BookedBarber"',
            'Confirm installation in the dialog',
            'The app will open in its own window'
          ],
          icon: ArrowDownTrayIcon
        }
      default:
        return {
          title: 'Install App',
          steps: ['Installation not available on this platform'],
          icon: ExclamationTriangleIcon
        }
    }
  }

  const instructions = getInstallInstructions()
  const InstructionIcon = instructions.icon

  // PWA features list
  const pwaFeatures = [
    {
      icon: WifiIcon,
      title: 'Offline Access',
      description: 'Access your calendar even without internet',
      available: capabilities.supportsOffline
    },
    {
      icon: DevicePhoneMobileIcon,
      title: 'Native Experience',
      description: 'App-like experience on your device',
      available: true
    },
    {
      icon: ClockIcon,
      title: 'Fast Loading',
      description: 'Instant startup and smooth performance',
      available: true
    },
    {
      icon: BatteryIcon,
      title: 'Battery Optimized',
      description: 'Efficient power usage compared to browser',
      available: true
    },
    {
      icon: StarIcon,
      title: 'Home Screen Access',
      description: 'Quick access from your home screen',
      available: true
    },
    {
      icon: CpuChipIcon,
      title: 'Background Sync',
      description: 'Sync data when connection is restored',
      available: capabilities.supportsSync
    }
  ]

  // Don't show if already installed or not installable
  if (capabilities.isInstalled || (!capabilities.isInstallable && !capabilities.isStandalone)) {
    return null
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Install Banner */}
      {showPromptBanner && !installPromptShown && (
        <Alert className="border-l-4 border-l-blue-500">
          <DevicePhoneMobileIcon className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>Install BookedBarber</strong>
                <p className="text-sm text-gray-600">
                  Get the app experience with offline access and faster loading
                </p>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" onClick={handleInstall}>
                  Install
                </Button>
                <Button variant="ghost" size="sm" onClick={dismissBanner}>
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Installation Progress */}
      {isInstalling && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <ArrowDownTrayIcon className="h-5 w-5 text-blue-600 animate-pulse" />
              <div className="flex-1">
                <div className="font-medium text-sm">Installing BookedBarber...</div>
                <div className="text-xs text-gray-600 mb-2">
                  {installStepsRef.current[installationStep]}
                </div>
                <Progress 
                  value={(installationStep + 1) / installStepsRef.current.length * 100} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Install Card */}
      {!showPromptBanner && !capabilities.isInstalled && (
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center space-x-2">
              <DevicePhoneMobileIcon className="h-5 w-5 text-purple-600" />
              <span>Install BookedBarber App</span>
              <Badge variant="secondary">PWA</Badge>
            </CardTitle>
            <p className="text-sm text-gray-600">
              Get the full app experience with offline access, faster loading, and native features
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Installation Instructions */}
            <div>
              <h4 className="font-medium text-sm mb-3 flex items-center space-x-2">
                <InstructionIcon className="h-4 w-4" />
                <span>How to Install</span>
              </h4>
              <ol className="space-y-2">
                {instructions.steps.map((step, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm">
                    <span className="bg-purple-100 text-purple-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              {capabilities.installMethod === 'prompt' ? (
                <Button onClick={handleInstall} disabled={isInstalling}>
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Install Now
                </Button>
              ) : (
                <Button onClick={handleManualInstall}>
                  <ShareIcon className="h-4 w-4 mr-2" />
                  Show Instructions
                </Button>
              )}
              
              <Button variant="outline" onClick={dismissBanner}>
                Maybe Later
              </Button>
            </div>

            {/* PWA Features */}
            {showFeatures && (
              <div>
                <h4 className="font-medium text-sm mb-3">App Features</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pwaFeatures.map((feature, index) => (
                    <div 
                      key={index}
                      className={cn(
                        "flex items-start space-x-3 p-3 rounded-lg border",
                        feature.available 
                          ? "bg-green-50 border-green-200" 
                          : "bg-gray-50 border-gray-200"
                      )}
                    >
                      <feature.icon className={cn(
                        "h-5 w-5 mt-0.5",
                        feature.available ? "text-green-600" : "text-gray-400"
                      )} />
                      <div className="flex-1">
                        <div className={cn(
                          "font-medium text-sm",
                          feature.available ? "text-gray-900" : "text-gray-500"
                        )}>
                          {feature.title}
                          {feature.available && (
                            <CheckCircleIcon className="h-3 w-3 inline text-green-600 ml-1" />
                          )}
                        </div>
                        <div className={cn(
                          "text-xs",
                          feature.available ? "text-gray-600" : "text-gray-400"
                        )}>
                          {feature.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Platform Info */}
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span>Platform: {capabilities.platform}</span>
                <span>Method: {capabilities.installMethod}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Already Installed Message */}
      {capabilities.isInstalled && (
        <Alert>
          <CheckCircleIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>BookedBarber is installed!</strong> You're using the app version with offline support and enhanced performance.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// Hook for PWA capabilities
export function usePWACapabilities() {
  const [capabilities, setCapabilities] = useState<PWACapabilities>({
    isInstallable: false,
    isInstalled: false,
    isStandalone: false,
    supportsPush: false,
    supportsSync: false,
    supportsOffline: false,
    platform: 'unknown',
    installMethod: 'unavailable'
  })

  useEffect(() => {
    const detectCapabilities = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone ||
                          document.referrer.includes('android-app://')

      let platform: PWACapabilities['platform'] = 'unknown'
      if (/iphone|ipad|ipod/.test(userAgent)) {
        platform = 'ios'
      } else if (/android/.test(userAgent)) {
        platform = 'android'
      } else if (!/mobi/.test(userAgent)) {
        platform = 'desktop'
      }

      setCapabilities({
        isInstallable: 'beforeinstallprompt' in window || platform === 'ios',
        isInstalled: isStandalone,
        isStandalone,
        supportsPush: 'PushManager' in window && 'serviceWorker' in navigator,
        supportsSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
        supportsOffline: 'serviceWorker' in navigator && 'caches' in window,
        platform,
        installMethod: 'beforeinstallprompt' in window ? 'prompt' : 'manual'
      })
    }

    detectCapabilities()

    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleChange = () => detectCapabilities()
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      mediaQuery.addListener(handleChange)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange)
      } else {
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [])

  return capabilities
}

// Component for PWA status indicator
export function PWAStatusIndicator({ className }: { className?: string }) {
  const capabilities = usePWACapabilities()

  if (!capabilities.isStandalone) return null

  return (
    <Badge variant="secondary" className={cn("text-xs", className)}>
      <DevicePhoneMobileIcon className="h-3 w-3 mr-1" />
      App Mode
    </Badge>
  )
}