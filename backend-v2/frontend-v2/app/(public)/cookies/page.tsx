'use client'

import React, { useState } from 'react'
import { format } from 'date-fns'
import { Cookie, Shield, BarChart3, Target, Zap, Settings, Eye, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import useCookieConsent from '@/hooks/useCookieConsent'
import LegalDocument, { LegalSection, LegalList } from '@/components/LegalDocument'

const CookiePolicyPage = () => {
  const lastUpdated = new Date('2025-07-02')
  const effectiveDate = new Date('2025-07-02')
  
  const {
    preferences,
    updateConsent,
    isSaving,
    hasConsent,
  } = useCookieConsent()

  const [tempCategories, setTempCategories] = useState(preferences.categories)

  const handleCategoryChange = (category: keyof typeof preferences.categories, enabled: boolean) => {
    setTempCategories(prev => ({
      ...prev,
      [category]: category === 'necessary' ? true : enabled,
    }))
  }

  const handleSavePreferences = async () => {
    await updateConsent(tempCategories)
  }

  const relatedDocuments = [
    {
      title: 'Privacy Policy',
      href: '/privacy',
      description: 'How we collect, use, and protect your personal information'
    },
    {
      title: 'Terms of Service',
      href: '/terms',
      description: 'Our terms and conditions for using BookedBarber'
    }
  ]

  const contactInfo = {
    email: 'privacy@bookedbarber.com',
    address: '[Your Business Address]'
  }

  const cookieCategories = {
    necessary: {
      title: 'Necessary Cookies',
      description: 'Essential for the website to function properly. These cannot be disabled.',
      icon: Shield,
      color: 'green',
      cookies: [
        {
          name: 'auth-token',
          purpose: 'User authentication and session management',
          duration: '30 days',
          provider: 'BookedBarber',
        },
        {
          name: 'csrf-token',
          purpose: 'Security protection against cross-site request forgery',
          duration: 'Session',
          provider: 'BookedBarber',
        },
        {
          name: 'cookie-consent',
          purpose: 'Stores your cookie preferences',
          duration: '1 year',
          provider: 'BookedBarber',
        },
      ],
    },
    analytics: {
      title: 'Analytics Cookies',
      description: 'Help us understand how visitors use our website to improve performance.',
      icon: BarChart3,
      color: 'blue',
      cookies: [
        {
          name: '_ga',
          purpose: 'Distinguishes unique users for analytics',
          duration: '2 years',
          provider: 'Google Analytics',
        },
        {
          name: '_ga_*',
          purpose: 'Stores campaign and user session information',
          duration: '2 years',
          provider: 'Google Analytics',
        },
        {
          name: '_gid',
          purpose: 'Distinguishes users for 24-hour period',
          duration: '24 hours',
          provider: 'Google Analytics',
        },
      ],
    },
    marketing: {
      title: 'Marketing Cookies',
      description: 'Used to show you relevant ads and measure campaign effectiveness.',
      icon: Target,
      color: 'purple',
      cookies: [
        {
          name: '_fbp',
          purpose: 'Facebook pixel for conversion tracking',
          duration: '90 days',
          provider: 'Meta (Facebook)',
        },
        {
          name: '_fbc',
          purpose: 'Stores Facebook click ID for attribution',
          duration: '90 days',
          provider: 'Meta (Facebook)',
        },
        {
          name: 'fr',
          purpose: 'Facebook advertising and measurement',
          duration: '90 days',
          provider: 'Meta (Facebook)',
        },
      ],
    },
    functional: {
      title: 'Functional Cookies',
      description: 'Enable enhanced functionality and personalization features.',
      icon: Zap,
      color: 'orange',
      cookies: [
        {
          name: 'theme-preference',
          purpose: 'Remembers your light/dark mode preference',
          duration: '1 year',
          provider: 'BookedBarber',
        },
        {
          name: 'language-preference',
          purpose: 'Stores your preferred language setting',
          duration: '1 year',
          provider: 'BookedBarber',
        },
        {
          name: 'calendar-sync',
          purpose: 'Manages calendar integration preferences',
          duration: '6 months',
          provider: 'BookedBarber',
        },
      ],
    },
  }

  const getColorClasses = (color: string) => {
    const colorMap = {
      green: 'text-green-600 bg-green-100',
      blue: 'text-blue-600 bg-blue-100',
      purple: 'text-purple-600 bg-purple-100',
      orange: 'text-orange-600 bg-orange-100',
    }
    return colorMap[color as keyof typeof colorMap] || 'text-gray-600 bg-gray-100'
  }

  const hasUnsavedChanges = JSON.stringify(tempCategories) !== JSON.stringify(preferences.categories)

  return (
    <LegalDocument
      title="Cookie Policy"
      lastUpdated={lastUpdated}
      effectiveDate={effectiveDate}
      icon={<Cookie className="h-12 w-12 text-primary" />}
      relatedDocuments={relatedDocuments}
      contactInfo={contactInfo}
    >
      <LegalSection title="What Are Cookies?">
        <p>
          Cookies are small text files stored on your device when you visit a website. They help websites 
          remember your preferences, analyze usage patterns, and provide personalized experiences.
        </p>
        <p>
          We use cookies responsibly and give you full control over which types you allow. You can change 
          your preferences at any time using the controls below.
        </p>
      </LegalSection>

      <LegalSection title="Your Cookie Preferences">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Manage Your Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(cookieCategories).map(([key, category]) => {
              const Icon = category.icon
              const isRequired = key === 'necessary'
              const enabled = tempCategories[key as keyof typeof tempCategories]

              return (
                <div key={key} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getColorClasses(category.color)}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">{category.title}</h3>
                        <p className="text-sm text-gray-600">{category.description}</p>
                        {isRequired && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">
                            Always Required
                          </span>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => handleCategoryChange(key as keyof typeof preferences.categories, checked)}
                      disabled={isRequired}
                    />
                  </div>

                  {/* Cookie Details */}
                  <div className="ml-14 space-y-2">
                    {category.cookies.map((cookie, index) => (
                      <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono font-medium">{cookie.name}</span>
                            <p className="text-gray-600 mt-1">{cookie.purpose}</p>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-gray-500">Duration: {cookie.duration}</div>
                            <div className="text-gray-500">Provider: {cookie.provider}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {hasUnsavedChanges && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <RefreshCw className="h-4 w-4" />
                  <span className="font-medium">Unsaved Changes</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  You have unsaved changes to your cookie preferences.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleSavePreferences}
                disabled={!hasUnsavedChanges || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setTempCategories(preferences.categories)}
                disabled={!hasUnsavedChanges}
              >
                Reset Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </LegalSection>

      {preferences.hasConsented && (
        <LegalSection title="Current Status">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Your Current Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">Consent Date</h4>
                  <p className="text-sm text-gray-600">
                    {format(new Date(preferences.consentDate), 'PPpp')}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Policy Version</h4>
                  <p className="text-sm text-gray-600">{preferences.version}</p>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium mb-2">Active Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(preferences.categories).map(([key, enabled]) => {
                    if (!enabled) return null
                    const category = cookieCategories[key as keyof typeof cookieCategories]
                    const Icon = category.icon
                    return (
                      <span
                        key={key}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${getColorClasses(category.color)}`}
                      >
                        <Icon className="h-3 w-3" />
                        {category.title}
                      </span>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </LegalSection>
      )}

      <LegalSection title="Cookie Categories">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Essential Cookies (Always Active)</h4>
            <p className="text-sm text-gray-600 mb-3">Required for the website to function properly. These cannot be disabled.</p>
            <LegalList items={[
              '<strong>session_id</strong>: Maintain user session (Duration: Session, Provider: BookedBarber)',
              '<strong>csrf_token</strong>: Security - prevent CSRF attacks (Duration: 24 hours, Provider: BookedBarber)',
              '<strong>auth_token</strong>: Authentication state (Duration: 7 days, Provider: BookedBarber)'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">Functional Cookies</h4>
            <p className="text-sm text-gray-600 mb-3">Remember your preferences and settings.</p>
            <LegalList items={[
              '<strong>language</strong>: Language preference (Duration: 1 year, Provider: BookedBarber)',
              '<strong>timezone</strong>: Timezone settings (Duration: 1 year, Provider: BookedBarber)',
              '<strong>theme</strong>: UI theme preference (Duration: 1 year, Provider: BookedBarber)'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">Analytics Cookies</h4>
            <p className="text-sm text-gray-600 mb-3">Help us understand how visitors use our website.</p>
            <LegalList items={[
              '<strong>_ga</strong>: Google Analytics - user tracking (Duration: 2 years, Provider: Google)',
              '<strong>_gid</strong>: Google Analytics - user distinction (Duration: 24 hours, Provider: Google)',
              '<strong>_gat</strong>: Google Analytics - throttle requests (Duration: 1 minute, Provider: Google)'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">Marketing Cookies</h4>
            <p className="text-sm text-gray-600 mb-3">Used to deliver personalized advertisements.</p>
            <LegalList items={[
              '<strong>_fbp</strong>: Facebook Pixel - ad targeting (Duration: 3 months, Provider: Meta)',
              '<strong>fr</strong>: Facebook - ad delivery (Duration: 3 months, Provider: Meta)',
              '<strong>gtm</strong>: Google Tag Manager (Duration: 2 years, Provider: Google)'
            ]} />
          </div>
        </div>
      </LegalSection>

      <LegalSection title="How to Manage Cookies in Your Browser">
        <p className="mb-4">
          You can also control cookies directly in your browser settings. Note that disabling certain 
          cookies may affect website functionality.
        </p>
        
        <Card className="mb-6">
          <CardContent className="space-y-4">
            <p>
              You can also control cookies directly in your browser settings. Note that disabling certain 
              cookies may affect website functionality.
            </p>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Popular Browsers</h4>
                <ul className="space-y-1 text-sm">
                  <li>
                    <a 
                      href="https://support.google.com/chrome/answer/95647" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Google Chrome
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Mozilla Firefox
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Safari
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Microsoft Edge
                    </a>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Opt-out Tools</h4>
                <ul className="space-y-1 text-sm">
                  <li>
                    <a 
                      href="https://tools.google.com/dlpage/gaoptout" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Google Analytics Opt-out
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://www.facebook.com/settings?tab=ads" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Facebook Ad Preferences
                    </a>
                  </li>
                  <li>
                    <a 
                      href="http://optout.networkadvertising.org/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      NAI Opt-out Tool
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </LegalSection>

      <LegalSection title="Third-Party Services">
        <p className="mb-4">
          Some cookies are set by third-party services we use to provide enhanced functionality:
        </p>
        
        <div className="space-y-3">
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-medium">Google Analytics</h4>
            <p className="text-sm text-gray-600">
              Helps us understand website usage patterns. 
              <a href="https://policies.google.com/privacy" className="text-primary hover:underline ml-1">
                Google Privacy Policy
              </a>
            </p>
          </div>
          
          <div className="border-l-4 border-purple-500 pl-4">
            <h4 className="font-medium">Meta Pixel</h4>
            <p className="text-sm text-gray-600">
              Enables advertising on Facebook and Instagram. 
              <a href="https://www.facebook.com/privacy/explanation" className="text-primary hover:underline ml-1">
                Meta Privacy Policy
              </a>
            </p>
          </div>
          
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-medium">Stripe</h4>
            <p className="text-sm text-gray-600">
              Secure payment processing. 
              <a href="https://stripe.com/privacy" className="text-primary hover:underline ml-1">
                Stripe Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </LegalSection>

      <LegalSection title="Legal Compliance">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">GDPR Compliance</h4>
            <p className="text-sm text-gray-600 mb-2">For EU users, we ensure:</p>
            <LegalList items={[
              'Prior consent for non-essential cookies',
              'Granular control over cookie categories',
              'Easy withdrawal of consent',
              'Clear information about each cookie type'
            ]} />
          </div>

          <div>
            <h4 className="font-medium mb-2">CCPA Compliance</h4>
            <p className="text-sm text-gray-600 mb-2">For California residents:</p>
            <LegalList items={[
              'Right to know what information is collected',
              'Right to opt-out of data sharing',
              'Non-discrimination for exercising rights'
            ]} />
          </div>
        </div>
      </LegalSection>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-center text-blue-800 font-medium">
          We are committed to transparency in our use of cookies and respect your right to control your data.
        </p>
      </div>
    </LegalDocument>
  )
}

export default CookiePolicyPage