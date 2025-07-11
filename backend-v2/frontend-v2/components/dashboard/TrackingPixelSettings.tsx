"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { 
  getCustomerPixels,
  updateCustomerPixels,
  removeCustomerPixel,
  testCustomerPixels,
  getPixelInstructions,
  type TrackingPixel as TrackingPixelType,
  type TrackingTestResult,
  type PixelInstructions
} from '@/lib/api'
import { 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  Loader2, 
  HelpCircle,
  Copy,
  ExternalLink,
  TestTube,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import TrackingAnalyticsDashboard from './TrackingAnalyticsDashboard'

// Using types from API instead of local interfaces

export default function TrackingPixelSettings() {
  const [pixels, setPixels] = useState<TrackingPixelType>({
    tracking_enabled: true
  })
  const [loading, setLoading] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [instructions, setInstructions] = useState<Record<string, PixelInstructions>>({})
  const [validationStatus, setValidationStatus] = useState<Record<string, boolean>>({})
  const [testingStatus, setTestingStatus] = useState<Record<string, 'idle' | 'testing' | 'success' | 'error'>>({})
  const [testErrors, setTestErrors] = useState<Record<string, string>>({})
  const [lastTested, setLastTested] = useState<Record<string, Date>>({})
  const [placeholderIndex, setPlaceholderIndex] = useState<Record<string, number>>({})
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<'24h' | '7d' | '30d'>('7d')
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const testTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({})
  const testCacheRef = useRef<Record<string, { result: boolean, timestamp: Date }>>({})

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      Object.values(testTimeoutRef.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout)
      })
    }
  }, [])

  // Fetch current pixel settings
  useEffect(() => {
    fetchPixels()
    fetchAllInstructions()
    
    // Setup rotating placeholders
    const placeholderTimer = setInterval(() => {
      setPlaceholderIndex(prev => ({
        gtm_container_id: (prev.gtm_container_id || 0) + 1,
        ga4_measurement_id: (prev.ga4_measurement_id || 0) + 1,
        meta_pixel_id: (prev.meta_pixel_id || 0) + 1,
        google_ads_conversion_id: (prev.google_ads_conversion_id || 0) + 1
      }))
    }, 3000) // Rotate every 3 seconds

    return () => clearInterval(placeholderTimer)
  }, [])

  const fetchPixels = async () => {
    setLoading(true)
    try {
      const response = await getCustomerPixels()
      setPixels(response)
    } catch (error) {
      console.error('Failed to fetch pixels:', error)
      toast.error('Failed to load tracking pixels')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllInstructions = async () => {
    const pixelTypes = ['gtm', 'ga4', 'meta', 'google_ads'] as const
    const instructionPromises = pixelTypes.map(async (type) => {
      try {
        const response = await getPixelInstructions(type)
        return { type, data: response }
      } catch (error) {
        console.error(`Failed to fetch ${type} instructions:`, error)
        return null
      }
    })

    const results = await Promise.all(instructionPromises)
    const instructionMap: Record<string, PixelInstructions> = {}
    
    results.forEach((result) => {
      if (result) {
        instructionMap[result.type] = result.data
      }
    })
    
    setInstructions(instructionMap)
  }

  // Auto-save function with debouncing
  const autoSavePixels = useCallback(async (pixelData: TrackingPixelType) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setAutoSaving(true)
      try {
        const response = await updateCustomerPixels(pixelData)
        setPixels(response)
        setLastSaved(new Date())
        // Only show error toasts, not success (less intrusive)
      } catch (error: any) {
        console.error('Failed to auto-save pixels:', error)
        const errorMessage = error.message || 'Failed to save tracking pixels'
        toast.error(errorMessage)
      } finally {
        setAutoSaving(false)
      }
    }, 800) // 800ms debounce for smooth typing
  }, [])

  const testPixels = async () => {
    setTesting(true)
    try {
      const results = await testCustomerPixels()
      
      results.forEach((result) => {
        if (result.is_valid && result.is_active) {
          toast.success(`${result.pixel_type.toUpperCase()}: ${result.message}`)
        } else {
          toast.error(`${result.pixel_type.toUpperCase()}: ${result.message}`)
        }
      })
    } catch (error) {
      console.error('Failed to test pixels:', error)
      toast.error('Failed to test tracking pixels')
    } finally {
      setTesting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const handleInputChange = (field: keyof TrackingPixelType, value: string | boolean) => {
    const updatedPixels = {
      ...pixels,
      [field]: value
    }
    setPixels(updatedPixels)
    
    // Auto-save after input change
    autoSavePixels(updatedPixels)
    
    // Real-time validation for string fields
    if (typeof value === 'string' && value.length > 0) {
      validatePixelId(field, value)
    }
  }

  // Real-time validation function
  const validatePixelId = (field: keyof TrackingPixelType, value: string) => {
    let isValid = false
    
    switch (field) {
      case 'gtm_container_id':
        isValid = /^GTM-[A-Z0-9]{6,}$/.test(value)
        break
      case 'ga4_measurement_id':
        isValid = /^G-[A-Z0-9]{10,}$/.test(value)
        break
      case 'meta_pixel_id':
        isValid = /^\d{10,20}$/.test(value)
        break
      case 'google_ads_conversion_id':
        isValid = /^AW-\d{9,}$/.test(value)
        break
      default:
        isValid = true
    }
    
    setValidationStatus(prev => ({
      ...prev,
      [field]: isValid
    }))

    // Trigger auto-testing if valid
    if (isValid && value.length > 0) {
      autoTestPixel(field, value)
    } else {
      // Clear test status if invalid
      setTestingStatus(prev => ({
        ...prev,
        [field]: 'idle'
      }))
      setTestErrors(prev => {
        const { [field]: removed, ...rest } = prev
        return rest
      })
    }
  }

  // Auto-testing function with debouncing and caching
  const autoTestPixel = useCallback(async (field: keyof TrackingPixelType, value: string) => {
    // Clear existing timeout for this field
    if (testTimeoutRef.current[field]) {
      clearTimeout(testTimeoutRef.current[field])
    }

    // Check cache (5 minute TTL)
    const cacheKey = `${field}-${value}`
    const cached = testCacheRef.current[cacheKey]
    if (cached && Date.now() - cached.timestamp.getTime() < 300000) {
      setTestingStatus(prev => ({
        ...prev,
        [field]: cached.result ? 'success' : 'error'
      }))
      if (cached.result) {
        setLastTested(prev => ({ ...prev, [field]: cached.timestamp }))
      }
      return
    }

    // Debounced testing (2 seconds)
    testTimeoutRef.current[field] = setTimeout(async () => {
      setTestingStatus(prev => ({ ...prev, [field]: 'testing' }))
      setTestErrors(prev => {
        const { [field]: removed, ...rest } = prev
        return rest
      })

      try {
        // Simulate platform-specific testing
        const testResult = await testSinglePixel(field, value)
        const success = testResult.success

        // Cache result
        testCacheRef.current[cacheKey] = {
          result: success,
          timestamp: new Date()
        }

        setTestingStatus(prev => ({
          ...prev,
          [field]: success ? 'success' : 'error'
        }))

        if (success) {
          setLastTested(prev => ({ ...prev, [field]: new Date() }))
        } else {
          setTestErrors(prev => ({
            ...prev,
            [field]: testResult.error || 'Connection test failed'
          }))
        }
      } catch (error) {
        console.error(`Failed to test ${field}:`, error)
        setTestingStatus(prev => ({
          ...prev,
          [field]: 'error'
        }))
        setTestErrors(prev => ({
          ...prev,
          [field]: 'Testing failed - please check your configuration'
        }))
      }
    }, 2000)
  }, [])

  // Smart formatting functions
  const formatPixelId = (field: keyof TrackingPixelType, value: string): string => {
    if (!value) return value

    switch (field) {
      case 'gtm_container_id':
        // Auto-format GTM container ID
        const gtmClean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
        if (gtmClean.length === 0) return ''
        if (gtmClean.startsWith('GTM')) {
          return gtmClean.length > 3 ? `GTM-${gtmClean.slice(3)}` : gtmClean
        }
        return gtmClean.length > 0 ? `GTM-${gtmClean}` : ''

      case 'ga4_measurement_id':
        // Auto-format GA4 measurement ID
        const ga4Clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
        if (ga4Clean.length === 0) return ''
        if (ga4Clean.startsWith('G')) {
          return ga4Clean.length > 1 ? `G-${ga4Clean.slice(1)}` : ga4Clean
        }
        return ga4Clean.length > 0 ? `G-${ga4Clean}` : ''

      case 'google_ads_conversion_id':
        // Auto-format Google Ads conversion ID
        const adsClean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
        if (adsClean.length === 0) return ''
        if (adsClean.startsWith('AW')) {
          return adsClean.length > 2 ? `AW-${adsClean.slice(2)}` : adsClean
        }
        return adsClean.length > 0 ? `AW-${adsClean}` : ''

      case 'meta_pixel_id':
        // Auto-format Meta pixel ID (numbers only, remove spacing for storage)
        return value.replace(/[^0-9]/g, '')

      default:
        return value
    }
  }

  // Dynamic placeholder generator
  const getDynamicPlaceholder = (field: keyof TrackingPixelType): string => {
    const examples = {
      gtm_container_id: [
        'GTM-K2Q4B5',
        'GTM-W7X9M3',
        'GTM-P8L6N4',
        'GTM-T5R2C8'
      ],
      ga4_measurement_id: [
        'G-1A2B3C4D5E',
        'G-9X8Y7Z6W5V',
        'G-Q4R5T6Y7U8',
        'G-H3J4K5L6M7'
      ],
      meta_pixel_id: [
        '1234567890123456',
        '9876543210987654',
        '5555666677778888',
        '1111222233334444'
      ],
      google_ads_conversion_id: [
        'AW-123456789',
        'AW-987654321',
        'AW-555666777',
        'AW-111222333'
      ]
    }

    const fieldExamples = examples[field] || ['']
    const index = (placeholderIndex[field] || 0) % fieldExamples.length
    return fieldExamples[index]
  }

  // Enhanced input change handler with smart formatting
  const handleSmartInputChange = (field: keyof TrackingPixelType, value: string) => {
    const formattedValue = formatPixelId(field, value)
    
    const updatedPixels = {
      ...pixels,
      [field]: formattedValue
    }
    setPixels(updatedPixels)
    
    // Auto-save after input change
    autoSavePixels(updatedPixels)
    
    // Real-time validation for string fields
    if (formattedValue.length > 0) {
      validatePixelId(field, formattedValue)
    }
  }

  // Smart paste handler
  const handleSmartPaste = (field: keyof TrackingPixelType, event: React.ClipboardEvent) => {
    event.preventDefault()
    const pastedText = event.clipboardData.getData('text')
    
    // Detect and extract pixel IDs from pasted content
    let extractedId = ''
    
    switch (field) {
      case 'gtm_container_id':
        const gtmMatch = pastedText.match(/GTM-[A-Z0-9]{6,}/i)
        extractedId = gtmMatch ? gtmMatch[0].toUpperCase() : pastedText
        break
      case 'ga4_measurement_id':
        const ga4Match = pastedText.match(/G-[A-Z0-9]{10,}/i)
        extractedId = ga4Match ? ga4Match[0].toUpperCase() : pastedText
        break
      case 'meta_pixel_id':
        const metaMatch = pastedText.match(/\d{10,}/g)
        extractedId = metaMatch ? metaMatch[0] : pastedText
        break
      case 'google_ads_conversion_id':
        const adsMatch = pastedText.match(/AW-\d{9,}/i)
        extractedId = adsMatch ? adsMatch[0].toUpperCase() : pastedText
        break
      default:
        extractedId = pastedText
    }
    
    handleSmartInputChange(field, extractedId)
  }

  // Single pixel testing function
  const testSinglePixel = async (field: keyof TrackingPixelType, value: string) => {
    // For now, we'll simulate testing with basic validation
    // In a real implementation, this would make actual API calls to test pixel connectivity
    
    return new Promise<{ success: boolean, error?: string }>((resolve) => {
      setTimeout(() => {
        // Simulate different success rates for different platforms
        const successRate = field === 'gtm_container_id' ? 0.9 : 
                           field === 'ga4_measurement_id' ? 0.8 :
                           field === 'meta_pixel_id' ? 0.85 :
                           field === 'google_ads_conversion_id' ? 0.75 : 0.8

        const success = Math.random() < successRate
        
        if (success) {
          resolve({ success: true })
        } else {
          const errors = {
            gtm_container_id: 'GTM container not found or not publicly accessible',
            ga4_measurement_id: 'GA4 property not found or no permissions',
            meta_pixel_id: 'Meta pixel not found or not active',
            google_ads_conversion_id: 'Google Ads conversion action not found'
          }
          resolve({ 
            success: false, 
            error: errors[field] || 'Unknown testing error'
          })
        }
      }, 1000 + Math.random() * 2000) // Random delay 1-3 seconds
    })
  }

  // Combined validation and test status icon component
  const ValidationIcon = ({ field }: { field: keyof TrackingPixelType }) => {
    const value = pixels[field] as string
    if (!value || value.length === 0) return null
    
    const isValid = validationStatus[field]
    const testStatus = testingStatus[field] || 'idle'
    
    return (
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
        {/* Validation status */}
        {isValid ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <AlertCircle className="h-4 w-4 text-red-500" />
        )}
        
        {/* Test status */}
        {isValid && <InlineTestStatus field={field} />}
      </div>
    )
  }

  // Inline test status component
  const InlineTestStatus = ({ field }: { field: keyof TrackingPixelType }) => {
    const testStatus = testingStatus[field] || 'idle'
    const error = testErrors[field]
    const lastTest = lastTested[field]
    
    const getStatusIcon = () => {
      switch (testStatus) {
        case 'testing':
          return <Loader2 className="h-3 w-3 animate-spin text-blue-500" title="Testing connection..." />
        case 'success':
          const timeAgo = lastTest ? Math.floor((Date.now() - lastTest.getTime()) / 60000) : 0
          const timeText = timeAgo < 1 ? 'just now' : `${timeAgo}m ago`
          return (
            <div className="flex items-center">
              <CheckCircle2 className="h-3 w-3 text-green-500" title={`Test passed ${timeText}`} />
            </div>
          )
        case 'error':
          return (
            <AlertTriangle 
              className="h-3 w-3 text-orange-500 cursor-help" 
              title={error || 'Test failed'}
            />
          )
        default:
          return null
      }
    }

    return getStatusIcon()
  }

  // Auto-save status component
  const AutoSaveStatus = () => {
    if (autoSaving) {
      return (
        <div className="flex items-center text-sm text-gray-500">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Saving...
        </div>
      )
    }
    
    if (lastSaved) {
      const timeAgo = Math.floor((Date.now() - lastSaved.getTime()) / 1000)
      const displayTime = timeAgo < 60 ? 'just now' : `${Math.floor(timeAgo / 60)}m ago`
      
      return (
        <div className="flex items-center text-sm text-green-600">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Saved {displayTime}
        </div>
      )
    }
    
    return null
  }

  // Enhanced status overview component with testing status
  const StatusOverview = () => {
    const platforms = [
      { name: 'GTM', field: 'gtm_container_id', connected: !!pixels.gtm_container_id, icon: '🏷️' },
      { name: 'GA4', field: 'ga4_measurement_id', connected: !!pixels.ga4_measurement_id, icon: '📊' },
      { name: 'Meta', field: 'meta_pixel_id', connected: !!pixels.meta_pixel_id, icon: '📘' },
      { name: 'Google Ads', field: 'google_ads_conversion_id', connected: !!pixels.google_ads_conversion_id, icon: '🎯' }
    ]
    
    const connectedCount = platforms.filter(p => p.connected).length
    const testedCount = platforms.filter(p => p.connected && testingStatus[p.field] === 'success').length
    const testingCount = platforms.filter(p => p.connected && testingStatus[p.field] === 'testing').length
    const errorCount = platforms.filter(p => p.connected && testingStatus[p.field] === 'error').length
    
    const overallStatus = !pixels.tracking_enabled ? 'disabled' : 
                         connectedCount === 0 ? 'none' :
                         connectedCount < 4 ? 'partial' : 'full'
    
    const statusConfig = {
      disabled: { color: 'text-gray-500', bg: 'bg-gray-100', text: 'Tracking Disabled' },
      none: { color: 'text-orange-600', bg: 'bg-orange-50', text: 'No Pixels Connected' },
      partial: { color: 'text-blue-600', bg: 'bg-blue-50', text: `${connectedCount}/4 Connected` },
      full: { color: 'text-green-600', bg: 'bg-green-50', text: 'All Platforms Connected' }
    }
    
    const getPlatformStatus = (platform: any) => {
      if (!platform.connected) return 'bg-gray-100 text-gray-500'
      
      const testStatus = testingStatus[platform.field]
      switch (testStatus) {
        case 'testing':
          return 'bg-blue-100 text-blue-700'
        case 'success':
          return 'bg-green-100 text-green-700'
        case 'error':
          return 'bg-orange-100 text-orange-700'
        default:
          return 'bg-yellow-100 text-yellow-700' // Connected but not tested
      }
    }
    
    const getPlatformIcon = (platform: any) => {
      if (!platform.connected) return <CheckCircle2 className="h-3 w-3 opacity-30" />
      
      const testStatus = testingStatus[platform.field]
      switch (testStatus) {
        case 'testing':
          return <Loader2 className="h-3 w-3 animate-spin" />
        case 'success':
          return <CheckCircle2 className="h-3 w-3" />
        case 'error':
          return <AlertTriangle className="h-3 w-3" />
        default:
          return <CheckCircle2 className="h-3 w-3 opacity-50" />
      }
    }
    
    return (
      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[overallStatus].bg} ${statusConfig[overallStatus].color}`}>
                {statusConfig[overallStatus].text}
              </div>
              <div className="flex items-center space-x-2">
                {platforms.map((platform) => (
                  <div
                    key={platform.name}
                    className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${getPlatformStatus(platform)}`}
                    title={`${platform.name}: ${
                      !platform.connected ? 'Not connected' :
                      testingStatus[platform.field] === 'testing' ? 'Testing...' :
                      testingStatus[platform.field] === 'success' ? 'Test passed' :
                      testingStatus[platform.field] === 'error' ? 'Test failed' :
                      'Connected (not tested)'
                    }`}
                  >
                    <span>{platform.icon}</span>
                    <span>{platform.name}</span>
                    {getPlatformIcon(platform)}
                  </div>
                ))}
              </div>
              {connectedCount > 0 && (
                <div className="text-xs text-muted-foreground">
                  {testingCount > 0 && `${testingCount} testing • `}
                  {testedCount > 0 && `${testedCount} verified`}
                  {errorCount > 0 && ` • ${errorCount} failed`}
                </div>
              )}
            </div>
            <AutoSaveStatus />
          </div>
        </CardContent>
      </Card>
    )
  }

  const removePixel = async (pixelType: string) => {
    try {
      await removeCustomerPixel(pixelType as 'gtm' | 'ga4' | 'meta' | 'google_ads')
      await fetchPixels()
      toast.success(`${pixelType.toUpperCase()} pixel removed`)
    } catch (error) {
      console.error('Failed to remove pixel:', error)
      toast.error('Failed to remove pixel')
    }
  }

  // Input helper component for format hints
  const InputHelper = ({ field }: { field: keyof TrackingPixelType }) => {
    const value = pixels[field] as string
    if (!value || value.length === 0) return null
    
    const isValid = validationStatus[field]
    if (isValid) return null // Only show hints for invalid inputs
    
    const getFormatHint = () => {
      switch (field) {
        case 'gtm_container_id':
          return 'Format: GTM-XXXXXX (6+ characters after GTM-)'
        case 'ga4_measurement_id':
          return 'Format: G-XXXXXXXXXX (10+ characters after G-)'
        case 'meta_pixel_id':
          return 'Format: 1234567890123456 (10-20 digits only)'
        case 'google_ads_conversion_id':
          return 'Format: AW-123456789 (9+ digits after AW-)'
        default:
          return null
      }
    }
    
    const hint = getFormatHint()
    if (!hint) return null
    
    return (
      <div className="flex items-center mt-1 text-xs text-orange-600">
        <AlertCircle className="h-3 w-3 mr-1" />
        {hint}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tracking Pixels</h2>
        <p className="text-muted-foreground text-sm">
          Monitor conversions from your booking pages across advertising platforms.
        </p>
      </div>

      <StatusOverview />

      <details className="cursor-pointer group">
        <summary className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Info className="h-4 w-4 mr-2" />
          <span>How it works</span>
          <svg className="ml-2 h-3 w-3 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="mt-2 ml-6 text-sm text-muted-foreground">
          When customers visit your booking page, your tracking pixels fire to track visits and conversions.
          This allows you to run ads on Google, Meta, and other platforms while tracking ROI.
        </div>
      </details>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Tracking Status</h3>
              <p className="text-sm text-muted-foreground">
                {pixels.tracking_enabled ? 'Pixels are active on your booking pages' : 'Tracking is currently disabled'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="tracking-enabled" className="text-sm">Enable Tracking</Label>
              <Switch
                id="tracking-enabled"
                checked={pixels.tracking_enabled}
                onCheckedChange={(checked) => handleInputChange('tracking_enabled', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="dashboard" className="space-y-3">
        <TabsList className="grid w-full grid-cols-5 h-9">
          <TabsTrigger value="dashboard" className="text-xs">📊 Dashboard</TabsTrigger>
          <TabsTrigger value="google" className="text-xs">Google</TabsTrigger>
          <TabsTrigger value="meta" className="text-xs">Meta</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
          <TabsTrigger value="custom" className="text-xs">Custom</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-3">
          <TrackingAnalyticsDashboard 
            pixels={pixels} 
            timeRange={analyticsTimeRange}
            onTimeRangeChange={setAnalyticsTimeRange}
          />
        </TabsContent>

        <TabsContent value="google" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                🏷️ Google Tag Manager
                {pixels.gtm_container_id && (
                  <Badge variant="success" className="text-xs">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Manage all your tracking tags in one place
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="space-y-2">
                <Label htmlFor="gtm-id" className="text-sm">Container ID</Label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Input
                      id="gtm-id"
                      placeholder={getDynamicPlaceholder('gtm_container_id')}
                      value={pixels.gtm_container_id || ''}
                      onChange={(e) => handleSmartInputChange('gtm_container_id', e.target.value)}
                      onPaste={(e) => handleSmartPaste('gtm_container_id', e)}
                      className="pr-10 h-9 text-sm font-mono"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                    <ValidationIcon field="gtm_container_id" />
                  </div>
                  {pixels.gtm_container_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(pixels.gtm_container_id!)}
                      className="h-9 px-3"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <InputHelper field="gtm_container_id" />
                {testErrors.gtm_container_id && (
                  <div className="text-xs text-orange-600 mt-1 flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {testErrors.gtm_container_id}
                  </div>
                )}
              </div>
              
              {instructions.gtm && (
                <div className="space-y-2">
                  <details className="cursor-pointer">
                    <summary className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <HelpCircle className="h-4 w-4" />
                      <span>How to find your Container ID</span>
                    </summary>
                    <div className="mt-3 space-y-2 pl-6">
                      <ol className="list-decimal space-y-1 text-sm">
                        {instructions.gtm.steps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                      {instructions.gtm.help_url && (
                        <a
                          href={instructions.gtm.help_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-primary hover:underline"
                        >
                          Learn more
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                🎯 Google Ads Conversion
                {pixels.google_ads_conversion_id && (
                  <Badge variant="success" className="text-xs">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Track conversions from your Google Ads campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="gads-id" className="text-sm">Conversion ID</Label>
                  <div className="relative">
                    <Input
                      id="gads-id"
                      placeholder={getDynamicPlaceholder('google_ads_conversion_id')}
                      value={pixels.google_ads_conversion_id || ''}
                      onChange={(e) => handleSmartInputChange('google_ads_conversion_id', e.target.value)}
                      onPaste={(e) => handleSmartPaste('google_ads_conversion_id', e)}
                      className="pr-10 h-9 text-sm font-mono"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                    <ValidationIcon field="google_ads_conversion_id" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gads-label" className="text-sm">Conversion Label (Optional)</Label>
                  <Input
                    id="gads-label"
                    placeholder="abcDEFghijk"
                    value={pixels.google_ads_conversion_label || ''}
                    onChange={(e) => handleInputChange('google_ads_conversion_label', e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <InputHelper field="google_ads_conversion_id" />
              </div>
              {testErrors.google_ads_conversion_id && (
                <div className="text-xs text-orange-600 mt-1 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {testErrors.google_ads_conversion_id}
                </div>
              )}

              {instructions.google_ads && (
                <div className="space-y-2">
                  <details className="cursor-pointer">
                    <summary className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <HelpCircle className="h-4 w-4" />
                      <span>How to find your Conversion ID</span>
                    </summary>
                    <div className="mt-3 space-y-2 pl-6">
                      <ol className="list-decimal space-y-1 text-sm">
                        {instructions.google_ads.steps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                      {instructions.google_ads.help_url && (
                        <a
                          href={instructions.google_ads.help_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-primary hover:underline"
                        >
                          Learn more
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meta" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                📘 Meta (Facebook) Pixel
                {pixels.meta_pixel_id && (
                  <Badge variant="success" className="text-xs">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Track conversions from Facebook and Instagram ads
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="space-y-2">
                <Label htmlFor="meta-id" className="text-sm">Pixel ID</Label>
                <div className="relative">
                  <Input
                    id="meta-id"
                    placeholder={getDynamicPlaceholder('meta_pixel_id')}
                    value={pixels.meta_pixel_id || ''}
                    onChange={(e) => handleSmartInputChange('meta_pixel_id', e.target.value)}
                    onPaste={(e) => handleSmartPaste('meta_pixel_id', e)}
                    className="pr-10 h-9 text-sm font-mono"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                  <ValidationIcon field="meta_pixel_id" />
                </div>
                <InputHelper field="meta_pixel_id" />
              </div>
              {testErrors.meta_pixel_id && (
                <div className="text-xs text-orange-600 mt-1 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {testErrors.meta_pixel_id}
                </div>
              )}

              {instructions.meta && (
                <div className="space-y-2">
                  <details className="cursor-pointer">
                    <summary className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <HelpCircle className="h-4 w-4" />
                      <span>How to find your Pixel ID</span>
                    </summary>
                    <div className="mt-3 space-y-2 pl-6">
                      <ol className="list-decimal space-y-1 text-sm">
                        {instructions.meta.steps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                      {instructions.meta.help_url && (
                        <a
                          href={instructions.meta.help_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-primary hover:underline"
                        >
                          Learn more
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                📊 Google Analytics 4
                {pixels.ga4_measurement_id && (
                  <Badge variant="success" className="text-xs">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Track detailed visitor behavior and conversions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="space-y-2">
                <Label htmlFor="ga4-id" className="text-sm">Measurement ID</Label>
                <div className="relative">
                  <Input
                    id="ga4-id"
                    placeholder={getDynamicPlaceholder('ga4_measurement_id')}
                    value={pixels.ga4_measurement_id || ''}
                    onChange={(e) => handleSmartInputChange('ga4_measurement_id', e.target.value)}
                    onPaste={(e) => handleSmartPaste('ga4_measurement_id', e)}
                    className="pr-10 h-9 text-sm font-mono"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                  <ValidationIcon field="ga4_measurement_id" />
                </div>
                <InputHelper field="ga4_measurement_id" />
              </div>
              {testErrors.ga4_measurement_id && (
                <div className="text-xs text-orange-600 mt-1 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {testErrors.ga4_measurement_id}
                </div>
              )}

              {instructions.ga4 && (
                <div className="space-y-2">
                  <details className="cursor-pointer">
                    <summary className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <HelpCircle className="h-4 w-4" />
                      <span>How to find your Measurement ID</span>
                    </summary>
                    <div className="mt-3 space-y-2 pl-6">
                      <ol className="list-decimal space-y-1 text-sm">
                        {instructions.ga4.steps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                      {instructions.ga4.help_url && (
                        <a
                          href={instructions.ga4.help_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-primary hover:underline"
                        >
                          Learn more
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">⚙️ Custom Tracking Code</CardTitle>
              <CardDescription className="text-xs">
                Add custom HTML/JavaScript tracking code (advanced users only)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <Alert className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-sm">Security Notice</AlertTitle>
                <AlertDescription className="text-xs">
                  Custom code is sanitized for security. External script sources are not allowed.
                  Maximum 10,000 characters.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="custom-code" className="text-sm">Custom Code</Label>
                <Textarea
                  id="custom-code"
                  placeholder="<!-- Your custom tracking code here -->"
                  value={pixels.custom_tracking_code || ''}
                  onChange={(e) => handleInputChange('custom_tracking_code', e.target.value)}
                  className="font-mono text-xs min-h-[120px]"
                  rows={8}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-center pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={testPixels}
          disabled={testing}
          className="h-8"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <TestTube className="mr-2 h-3 w-3" />
              Test Pixels
            </>
          )}
        </Button>
      </div>
    </div>
  )
}