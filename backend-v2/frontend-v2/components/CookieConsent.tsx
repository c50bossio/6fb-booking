'use client'

import React, { useState, useEffect } from 'react'
import { Cookie, Settings, X, ChevronDown, ChevronUp, Shield, BarChart3, Target, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import useCookieConsent, { type CookieCategories } from '@/hooks/useCookieConsent'
import { initializeScripts } from '@/lib/scriptLoader'
import { cn } from '@/lib/utils'

interface CookieConsentProps {
  className?: string
}

const CookieConsent: React.FC<CookieConsentProps> = ({ className }) => {
  const {
    shouldShowBanner,
    preferences,
    isLoading,
    isSaving,
    acceptAll,
    rejectAll,
    updateConsent,
  } = useCookieConsent()

  const [showDetails, setShowDetails] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [tempCategories, setTempCategories] = useState<CookieCategories>(preferences.categories)

  // Update temp categories when preferences change
  useEffect(() => {
    setTempCategories(preferences.categories)
  }, [preferences.categories])

  // Initialize scripts when consent changes
  useEffect(() => {
    if (preferences.hasConsented) {
      initializeScripts(preferences.categories)
    }
  }, [preferences])

  // Don't render if consent already given or still loading
  if (!shouldShowBanner || isLoading) {
    return null
  }

  const handleAcceptAll = async () => {
    await acceptAll()
  }

  const handleRejectAll = async () => {
    await rejectAll()
  }

  const handleSavePreferences = async () => {
    await updateConsent(tempCategories)
    setShowPreferences(false)
  }

  const handleCategoryChange = (category: keyof CookieCategories, enabled: boolean) => {
    setTempCategories(prev => ({
      ...prev,
      [category]: category === 'necessary' ? true : enabled, // Necessary always true
    }))
  }

  const categoryInfo = {
    necessary: {
      title: 'Necessary Cookies',
      description: 'Essential for the website to function properly. These cannot be disabled.',
      icon: Shield,
      examples: 'Authentication, security, basic functionality',
    },
    analytics: {
      title: 'Analytics Cookies',
      description: 'Help us understand how visitors use our website to improve performance.',
      icon: BarChart3,
      examples: 'Google Analytics, page views, user behavior',
    },
    marketing: {
      title: 'Marketing Cookies',
      description: 'Used to show you relevant ads and measure campaign effectiveness.',
      icon: Target,
      examples: 'Meta Pixel, Google Ads, retargeting',
    },
    functional: {
      title: 'Functional Cookies',
      description: 'Enable enhanced functionality and personalization features.',
      icon: Zap,
      examples: 'Calendar integration, preferences, chat widgets',
    },
  }

  return (
    <>
      {/* Cookie Banner */}
      {shouldShowBanner && (
        <div
          className={cn(
            'fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
            'shadow-lg transform transition-transform duration-300 ease-out',
            className
          )}
          role="region"
          aria-label="Cookie consent banner"
          aria-live="polite"
          aria-atomic="true"
        >
            <div className="container mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <Cookie className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <h3 id="cookie-banner-title" className="font-semibold text-foreground">
                        We value your privacy
                      </h3>
                      <p id="cookie-banner-description" className="text-sm text-muted-foreground mt-1">
                        We use cookies to enhance your experience, analyze site usage, and assist in marketing efforts.
                        {!showDetails && (
                          <button
                            type="button"
                            className="ml-1 text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm"
                            onClick={() => setShowDetails(!showDetails)}
                            aria-expanded={showDetails}
                            aria-controls="cookie-details"
                            aria-describedby="learn-more-description"
                          >
                            Learn more
                            <span id="learn-more-description" className="sr-only">
                              Show detailed information about cookie categories and preferences
                            </span>
                            <ChevronDown className="h-3 w-3 inline ml-1" aria-hidden="true" />
                          </button>
                        )}
                      </p>

                      {/* Expandable Details */}
                      {showDetails && (
                        <div
                          id="cookie-details"
                          className="transition-all duration-200 ease-out"
                        >
                            <div className="mt-3 pt-3 border-t border-border">
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {Object.entries(categoryInfo).map(([key, info]) => {
                                  const Icon = info.icon
                                  const enabled = key === 'necessary' ? true : tempCategories[key as keyof CookieCategories]
                                  
                                  return (
                                    <div key={key} className="flex items-start gap-2">
                                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
                                      <div className="text-xs">
                                        <div className="font-medium text-foreground flex items-center gap-2">
                                          {info.title}
                                          {key !== 'necessary' && (
                                            <Switch
                                              checked={enabled}
                                              onCheckedChange={(checked) => handleCategoryChange(key as keyof CookieCategories, checked)}
                                              aria-label={`Toggle ${info.title}`}
                                              size="sm"
                                            />
                                          )}
                                          {key === 'necessary' && (
                                            <span className="text-xs text-muted-foreground">(Required)</span>
                                          )}
                                        </div>
                                        <p className="text-muted-foreground mt-0.5">{info.description}</p>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                              
                              <div className="mt-3 flex items-center gap-2">
                                <button
                                  type="button"
                                  className="text-xs text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm p-1"
                                  onClick={() => setShowDetails(false)}
                                  aria-expanded={showDetails}
                                  aria-controls="cookie-details"
                                  aria-label="Hide detailed cookie information"
                                >
                                  <ChevronUp className="h-3 w-3 inline mr-1" aria-hidden="true" />
                                  Show less
                                </button>
                              </div>
                            </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:flex-shrink-0" role="group" aria-label="Cookie consent actions">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRejectAll}
                    disabled={isSaving}
                    className="w-full sm:w-auto"
                    aria-describedby="reject-all-description"
                  >
                    Reject All
                    <span id="reject-all-description" className="sr-only">
                      Reject all non-essential cookies and use only necessary cookies
                    </span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreferences(true)}
                    disabled={isSaving}
                    className="w-full sm:w-auto"
                    aria-describedby="manage-prefs-description"
                  >
                    <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
                    Manage Preferences
                    <span id="manage-prefs-description" className="sr-only">
                      Open detailed preferences to customize which cookie categories to enable
                    </span>
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={handleAcceptAll}
                    disabled={isSaving}
                    className="w-full sm:w-auto"
                    aria-describedby="accept-all-description"
                  >
                    Accept All
                    <span id="accept-all-description" className="sr-only">
                      Accept all cookies including analytics, marketing, and functional cookies
                    </span>
                  </Button>
                </div>
              </div>
            </div>
        </div>
      )}

      {/* Preferences Modal */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent 
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          aria-labelledby="preferences-title"
          aria-describedby="preferences-description"
        >
          <DialogHeader>
            <DialogTitle id="preferences-title" className="flex items-center gap-2">
              <Settings className="h-5 w-5" aria-hidden="true" />
              Cookie Preferences
            </DialogTitle>
            <DialogDescription id="preferences-description">
              Customize your cookie settings. You can change these preferences at any time in your privacy settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4" role="group" aria-label="Cookie category preferences">
            {Object.entries(categoryInfo).map(([key, info]) => {
              const Icon = info.icon
              const isRequired = key === 'necessary'
              const enabled = isRequired ? true : tempCategories[key as keyof CookieCategories]

              return (
                <Card 
                  key={key} 
                  className={cn(isRequired && 'bg-muted/50')}
                  role="region"
                  aria-labelledby={`${key}-title`}
                  aria-describedby={`${key}-description ${key}-examples`}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                        <span id={`${key}-title`}>{info.title}</span>
                        {isRequired && (
                          <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 bg-muted rounded" aria-label="This category is required and cannot be disabled">
                            Required
                          </span>
                        )}
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) => handleCategoryChange(key as keyof CookieCategories, checked)}
                        disabled={isRequired}
                        aria-label={`${isRequired ? 'Required' : 'Toggle'} ${info.title} cookies`}
                        aria-describedby={`${key}-description`}
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p id={`${key}-description`} className="text-sm text-muted-foreground mb-2">
                      {info.description}
                    </p>
                    <div id={`${key}-examples`} className="text-xs text-muted-foreground">
                      <strong>Examples:</strong> {info.examples}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-4 border-t" role="group" aria-label="Preference actions">
            <Button
              variant="outline"
              onClick={() => setShowPreferences(false)}
              disabled={isSaving}
              aria-label="Cancel changes and close preferences"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePreferences}
              disabled={isSaving}
              aria-label={isSaving ? 'Saving your cookie preferences...' : 'Save your cookie preferences'}
            >
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="font-medium mb-2">About your privacy:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Your preferences are stored locally and on our servers for compliance</li>
              <li>You can change these settings at any time</li>
              <li>Necessary cookies cannot be disabled as they are essential for the site to function</li>
              <li>View our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> and <a href="/cookies" className="text-primary hover:underline">Cookie Policy</a> for more details</li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CookieConsent