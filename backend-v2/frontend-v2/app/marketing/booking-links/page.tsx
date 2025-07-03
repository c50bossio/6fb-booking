'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { getProfile } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { 
  LinkIcon, 
  QrCodeIcon,
  ClipboardDocumentIcon,
  PlusIcon,
  ChartBarIcon,
  CalendarIcon,
  UserIcon,
  ScissorsIcon,
  MapPinIcon,
  ArrowDownTrayIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface ShortURL {
  id: string
  short_code: string
  target_url: string
  title: string
  description?: string
  clicks: number
  unique_visitors: number
  conversions: number
  conversion_rate: number
  is_active: boolean
  created_at: string
  expires_at?: string
  qr_code?: {
    id: string
    design_url: string
    scans: number
  }
}

interface BookingLinkForm {
  title: string
  service_id?: string
  barber_id?: string
  location_id?: string
  promo_code?: string
  custom_code?: string
  expires_at?: string
}

export default function BookingLinksPage() {
  const [shortUrls, setShortUrls] = useState<ShortURL[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [services, setServices] = useState<any[]>([])
  const [barbers, setBarbers] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [formData, setFormData] = useState<BookingLinkForm>({
    title: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // In a real implementation, these would be actual API calls
      setShortUrls([
        {
          id: '1',
          short_code: 'summer2025',
          target_url: '/book?promo=SUMMER25',
          title: 'Summer 2025 Special',
          description: '25% off all services',
          clicks: 234,
          unique_visitors: 187,
          conversions: 42,
          conversion_rate: 22.5,
          is_active: true,
          created_at: '2025-06-15',
          expires_at: '2025-08-31',
          qr_code: {
            id: 'qr1',
            design_url: '/api/qr/summer2025.png',
            scans: 89
          }
        },
        {
          id: '2',
          short_code: 'vip-john',
          target_url: '/book?barber=john&service=executive',
          title: 'VIP Booking - John',
          description: 'Direct booking link for John\'s VIP clients',
          clicks: 156,
          unique_visitors: 142,
          conversions: 68,
          conversion_rate: 47.9,
          is_active: true,
          created_at: '2025-05-20',
          qr_code: {
            id: 'qr2',
            design_url: '/api/qr/vip-john.png',
            scans: 45
          }
        },
        {
          id: '3',
          short_code: 'gift100',
          target_url: '/payments/gift-certificates?amount=100',
          title: '$100 Gift Certificate',
          clicks: 78,
          unique_visitors: 72,
          conversions: 12,
          conversion_rate: 16.7,
          is_active: true,
          created_at: '2025-06-01'
        }
      ])

      // Mock data for dropdowns
      setServices([
        { id: '1', name: 'Haircut', duration_minutes: 30, base_price: 35 },
        { id: '2', name: 'Beard Trim', duration_minutes: 15, base_price: 20 },
        { id: '3', name: 'Executive Package', duration_minutes: 60, base_price: 75 }
      ])

      setBarbers([
        { id: '1', name: 'John Smith' },
        { id: '2', name: 'Sarah Johnson' },
        { id: '3', name: 'Marcus Chen' }
      ])

      setLocations([
        { id: '1', name: 'Downtown Flagship' },
        { id: '2', name: 'Westside Branch' }
      ])
    } catch (error) {
      console.error('Failed to load data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load booking links',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied!',
      description: 'Link copied to clipboard'
    })
  }

  const downloadQRCode = async (shortCode: string) => {
    // In a real implementation, this would download the QR code
    const url = `${window.location.origin}/api/qr/${shortCode}.png`
    const link = document.createElement('a')
    link.href = url
    link.download = `${shortCode}-qr.png`
    link.click()
  }

  const createBookingLink = async () => {
    try {
      // In a real implementation, this would call the API
      toast({
        title: 'Success',
        description: 'Booking link created successfully'
      })
      setShowCreateModal(false)
      loadData()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create booking link',
        variant: 'destructive'
      })
    }
  }

  const generateShortCode = () => {
    // Generate a suggested short code based on the form data
    let code = ''
    if (formData.barber_id) {
      const barber = barbers.find(b => b.id === formData.barber_id)
      code += barber?.name.split(' ')[0].toLowerCase() + '-'
    }
    if (formData.service_id) {
      const service = services.find(s => s.id === formData.service_id)
      code += service?.name.split(' ')[0].toLowerCase()
    }
    if (!code) {
      code = 'book-' + Date.now().toString(36).slice(-6)
    }
    setFormData({ ...formData, custom_code: code })
  }

  const getFullUrl = (shortCode: string) => {
    return `${window.location.origin}/book/${shortCode}`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Booking Links & QR Codes</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Create trackable booking links and QR codes for marketing</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Create Link
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Links</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{shortUrls.length}</p>
              </div>
              <LinkIcon className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Clicks</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {shortUrls.reduce((sum, url) => sum + url.clicks, 0)}
                </p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Conversions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {shortUrls.reduce((sum, url) => sum + url.conversions, 0)}
                </p>
              </div>
              <CalendarIcon className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Conversion</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(shortUrls.reduce((sum, url) => sum + url.conversion_rate, 0) / shortUrls.length).toFixed(1)}%
                </p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Booking Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shortUrls.map((url) => (
          <Card key={url.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{url.title}</CardTitle>
                {url.is_active ? (
                  <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-300 rounded-full">
                    Inactive
                  </span>
                )}
              </div>
              {url.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{url.description}</p>
              )}
            </CardHeader>
            <CardContent>
              {/* Short URL */}
              <div className="mb-4">
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <LinkIcon className="w-4 h-4 text-gray-500" />
                  <code className="text-sm flex-1 truncate">{getFullUrl(url.short_code)}</code>
                  <button
                    onClick={() => copyToClipboard(getFullUrl(url.short_code))}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{url.clicks}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Clicks</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{url.conversions}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Bookings</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{url.conversion_rate}%</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Rate</p>
                </div>
              </div>

              {/* QR Code Section */}
              {url.qr_code && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <QrCodeIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {url.qr_code.scans} scans
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => window.open(url.qr_code!.design_url, '_blank')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                        title="View QR Code"
                      >
                        <EyeIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => downloadQRCode(url.short_code)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                        title="Download QR Code"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Expiration */}
              {url.expires_at && (
                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  Expires: {new Date(url.expires_at).toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create Booking Link</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Link Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Summer Special"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Service (Optional)
                </label>
                <select
                  value={formData.service_id || ''}
                  onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Any Service</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Barber (Optional)
                </label>
                <select
                  value={formData.barber_id || ''}
                  onChange={(e) => setFormData({ ...formData, barber_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Any Barber</option>
                  {barbers.map(barber => (
                    <option key={barber.id} value={barber.id}>{barber.name}</option>
                  ))}
                </select>
              </div>

              {locations.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location (Optional)
                  </label>
                  <select
                    value={formData.location_id || ''}
                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Any Location</option>
                    {locations.map(location => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Custom Short Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.custom_code || ''}
                    onChange={(e) => setFormData({ ...formData, custom_code: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., summer2025"
                  />
                  <Button variant="outline" size="sm" onClick={generateShortCode}>
                    Generate
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Promo Code (Optional)
                </label>
                <input
                  type="text"
                  value={formData.promo_code || ''}
                  onChange={(e) => setFormData({ ...formData, promo_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., SUMMER25"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.expires_at || ''}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={createBookingLink} className="flex-1">
                Create Link
              </Button>
              <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}