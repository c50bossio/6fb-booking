'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/Switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { 
  PaintBrushIcon,
  PhotoIcon,
  EyeIcon,
  LinkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { getProfile } from '@/lib/api'

interface LandingPageSettings {
  enabled: boolean
  logo_url: string
  primary_color: string
  accent_color: string
  background_preset: string
  custom_headline: string
  show_testimonials: boolean
  testimonial_source: string
}

const BACKGROUND_PRESETS = [
  {
    id: 'professional_dark',
    name: 'Professional Dark',
    description: 'Clean dark theme with subtle gradients',
    preview: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)'
  },
  {
    id: 'modern_light',
    name: 'Modern Light',
    description: 'Bright, clean modern design',
    preview: 'linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%)'
  },
  {
    id: 'barbershop_classic',
    name: 'Barbershop Classic',
    description: 'Traditional barbershop aesthetics',
    preview: 'linear-gradient(135deg, #7c2d12 0%, #92400e 100%)'
  },
  {
    id: 'luxury_gold',
    name: 'Luxury Gold',
    description: 'Premium gold and black theme',
    preview: 'linear-gradient(135deg, #000000 0%, #facc15 100%)'
  },
  {
    id: 'minimalist_white',
    name: 'Minimalist White',
    description: 'Ultra-clean minimalist design',
    preview: 'linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)'
  }
]

export default function LandingPageSettings() {
  const [settings, setSettings] = useState<LandingPageSettings>({
    enabled: false,
    logo_url: '',
    primary_color: '#000000',
    accent_color: '#FFD700',
    background_preset: 'professional_dark',
    custom_headline: '',
    show_testimonials: true,
    testimonial_source: 'gmb_auto'
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [organizationSlug, setOrganizationSlug] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // Get user profile to get organization slug
      const profile = await getProfile()
      if (profile?.organization?.slug) {
        setOrganizationSlug(profile.organization.slug)
      }
      
      // Load landing page settings
      const response = await fetch('/api/v1/organizations/current/landing-page-settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      } else {
        // Use defaults if API call fails
        setSettings({
          enabled: false,
          logo_url: '',
          primary_color: '#000000',
          accent_color: '#FFD700',
          background_preset: 'professional_dark',
          custom_headline: '',
          show_testimonials: true,
          testimonial_source: 'gmb_auto'
        })
      }
    } catch (error) {
      console.error('Failed to load landing page settings:', error)
      // Use defaults on error
      setSettings({
        enabled: false,
        logo_url: '',
        primary_color: '#000000',
        accent_color: '#FFD700',
        background_preset: 'professional_dark',
        custom_headline: '',
        show_testimonials: true,
        testimonial_source: 'gmb_auto'
      })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/v1/organizations/current/landing-page-settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(settings)
      })
      
      if (response.ok) {
        toast({
          title: 'Settings saved',
          description: 'Your landing page settings have been updated successfully.',
        })
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const getLandingPageUrl = () => {
    const baseUrl = window.location.origin
    return `${baseUrl}/${organizationSlug}`
  }

  const getDirectBookingUrl = () => {
    const baseUrl = window.location.origin
    return `${baseUrl}/book/${organizationSlug}`
  }

  const previewLandingPage = () => {
    const url = getLandingPageUrl()
    window.open(url, '_blank')
  }

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast({
      title: 'Copied!',
      description: 'URL copied to clipboard'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-8"></div>
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Landing Page Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Customize your organization's landing page and booking experience</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={previewLandingPage}>
            <EyeIcon className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Landing Page URLs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Your Booking URLs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Landing Page URL</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={getLandingPageUrl()}
                readOnly
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={() => copyUrl(getLandingPageUrl())}>
                Copy
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Marketing funnel with testimonials and call-to-action</p>
          </div>
          
          <div>
            <Label className="text-sm font-medium">Direct Booking URL</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={getDirectBookingUrl()}
                readOnly
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={() => copyUrl(getDirectBookingUrl())}>
                Copy
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Direct to booking calendar (no landing page)</p>
          </div>
        </CardContent>
      </Card>

      {/* Enable/Disable Landing Page */}
      <Card>
        <CardHeader>
          <CardTitle>Landing Page Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.enabled ? (
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
              )}
              <div>
                <p className="font-medium">
                  {settings.enabled ? 'Landing page is enabled' : 'Landing page is disabled'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {settings.enabled 
                    ? 'Visitors will see your custom landing page before booking' 
                    : 'Visitors will go directly to the booking calendar'
                  }
                </p>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(enabled) => setSettings({ ...settings, enabled })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Branding Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PaintBrushIcon className="w-5 h-5" />
            Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="logo-url">Logo URL</Label>
            <Input
              id="logo-url"
              value={settings.logo_url}
              onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
              placeholder="https://your-domain.com/logo.png"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to use your business name as text</p>
          </div>

          <div>
            <Label htmlFor="headline">Custom Headline</Label>
            <Input
              id="headline"
              value={settings.custom_headline}
              onChange={(e) => setSettings({ ...settings, custom_headline: e.target.value })}
              placeholder="e.g., Premium Barbershop Experience"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to use default headline</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="primary-color"
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="w-16 h-10"
                />
                <Input
                  value={settings.primary_color}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="accent-color">Accent Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="accent-color"
                  type="color"
                  value={settings.accent_color}
                  onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                  className="w-16 h-10"
                />
                <Input
                  value={settings.accent_color}
                  onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Background Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhotoIcon className="w-5 h-5" />
            Background Theme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BACKGROUND_PRESETS.map((preset) => (
              <div
                key={preset.id}
                className={`
                  relative p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${settings.background_preset === preset.id 
                    ? 'border-blue-500 ring-2 ring-blue-200' 
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
                onClick={() => setSettings({ ...settings, background_preset: preset.id })}
              >
                <div
                  className="w-full h-20 rounded-md mb-3"
                  style={{ background: preset.preview }}
                ></div>
                <h3 className="font-medium text-sm">{preset.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{preset.description}</p>
                {settings.background_preset === preset.id && (
                  <div className="absolute top-2 right-2">
                    <CheckCircleIcon className="w-5 h-5 text-blue-500" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Testimonials Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Testimonials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Show testimonials</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Display customer reviews on your landing page</p>
            </div>
            <Switch
              checked={settings.show_testimonials}
              onCheckedChange={(show_testimonials) => setSettings({ ...settings, show_testimonials })}
            />
          </div>

          {settings.show_testimonials && (
            <div>
              <Label htmlFor="testimonial-source">Testimonial Source</Label>
              <Select
                value={settings.testimonial_source}
                onValueChange={(testimonial_source) => setSettings({ ...settings, testimonial_source })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmb_auto">Google My Business (Auto)</SelectItem>
                  <SelectItem value="custom">Custom Testimonials</SelectItem>
                  <SelectItem value="generic">Generic Testimonials</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Auto-sync testimonials from Google My Business or use custom ones
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}