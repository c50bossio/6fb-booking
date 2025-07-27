'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { X, Cookie, Shield, BarChart3 } from 'lucide-react'

interface CookieConsentProps {
  onAcceptAll?: () => void
  onRejectAll?: () => void
  onManagePreferences?: () => void
}

export function UXOptimizedCookieConsent({
  onAcceptAll,
  onRejectAll,
  onManagePreferences
}: CookieConsentProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Check if user has already made a choice
    const hasConsent = localStorage.getItem('6fb-cookie-consent')
    if (!hasConsent) {
      // Show after a brief delay to avoid blocking initial page load
      const timer = setTimeout(() => setIsVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAcceptAll = () => {
    localStorage.setItem('6fb-cookie-consent', 'all')
    localStorage.setItem('6fb-analytics-consent', 'true')
    localStorage.setItem('6fb-marketing-consent', 'true')
    setIsVisible(false)
    onAcceptAll?.()
    
    // Update Google Consent Mode
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        'analytics_storage': 'granted',
        'ad_storage': 'granted',
        'ad_user_data': 'granted',
        'ad_personalization': 'granted',
        'functionality_storage': 'granted',
        'personalization_storage': 'granted'
      })
    }
  }

  const handleRejectAll = () => {
    localStorage.setItem('6fb-cookie-consent', 'essential')
    localStorage.setItem('6fb-analytics-consent', 'false')
    localStorage.setItem('6fb-marketing-consent', 'false')
    setIsVisible(false)
    onRejectAll?.()
  }

  const handleClose = () => {
    // Treat close as reject all for clarity
    handleRejectAll()
  }

  if (!isVisible) return null

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
    >
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md">
        <Card className="border-2 border-primary/20 shadow-2xl">
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cookie className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 
                  id="cookie-consent-title"
                  className="text-lg font-semibold text-gray-900 dark:text-white"
                >
                  Cookie Preferences
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close cookie consent"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Description */}
            <p 
              id="cookie-consent-description"
              className="text-sm text-gray-600 dark:text-gray-300 mb-4"
            >
              We use cookies to enhance your experience, analyze site usage, and assist in marketing efforts.
            </p>

            {/* Cookie Categories - Only show if details expanded */}
            {showDetails && (
              <div className="space-y-3 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" aria-hidden="true" />
                  <span className="text-sm font-medium">Essential Cookies</span>
                  <span className="text-xs text-gray-500">(Always Active)</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-500" aria-hidden="true" />
                  <span className="text-sm font-medium">Analytics & Performance</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 pl-6">
                  Help us understand how you use our platform to improve your experience.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* Primary Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleAcceptAll}
                  className="flex-1 h-11 text-sm font-medium"
                  aria-describedby="accept-all-description"
                >
                  Accept All
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRejectAll}
                  className="flex-1 h-11 text-sm font-medium"
                  aria-describedby="reject-all-description"
                >
                  Reject All
                </Button>
              </div>

              {/* Secondary Action */}
              <Button
                variant="ghost"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full h-10 text-sm text-gray-600 dark:text-gray-300"
              >
                {showDetails ? 'Hide Details' : 'Manage Preferences'}
              </Button>
            </div>

            {/* Screen reader descriptions */}
            <div className="sr-only">
              <p id="accept-all-description">
                Accept all cookies including analytics and marketing cookies
              </p>
              <p id="reject-all-description">
                Reject all non-essential cookies, only essential cookies will be used
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default UXOptimizedCookieConsent