'use client'

import { useEffect, useState } from 'react'
import {
  CogIcon,
  BuildingStorefrontIcon,
  UserIcon,
  BellIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  ClockIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XMarkIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import axios from 'axios'

interface BusinessSettings {
  name: string
  address: string
  phone: string
  email: string
  website: string
  timezone: string
  currency: string
  tax_rate: number
}

interface NotificationSettings {
  email_notifications: boolean
  sms_notifications: boolean
  appointment_reminders: boolean
  payment_notifications: boolean
  marketing_emails: boolean
  push_notifications: boolean
}

interface PaymentSettings {
  stripe_connected: boolean
  square_connected: boolean
  auto_payouts: boolean
  payout_frequency: string
  minimum_payout: number
}

interface SecuritySettings {
  two_factor_enabled: boolean
  session_timeout: number
  password_expiry: number
  login_notifications: boolean
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('business')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    timezone: 'America/New_York',
    currency: 'USD',
    tax_rate: 0
  })

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_notifications: true,
    sms_notifications: false,
    appointment_reminders: true,
    payment_notifications: true,
    marketing_emails: false,
    push_notifications: true
  })

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    stripe_connected: false,
    square_connected: false,
    auto_payouts: false,
    payout_frequency: 'weekly',
    minimum_payout: 100
  })

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    two_factor_enabled: false,
    session_timeout: 30,
    password_expiry: 90,
    login_notifications: true
  })

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null

      if (!token) {
        setLoading(false)
        return
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/settings`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.business) setBusinessSettings(response.data.business)
      if (response.data.notifications) setNotificationSettings(response.data.notifications)
      if (response.data.payments) setPaymentSettings(response.data.payments)
      if (response.data.security) setSecuritySettings(response.data.security)

    } catch (error) {
      // Use demo data if API fails
      setBusinessSettings({
        name: 'Headlines Barbershop',
        address: '123 Main St, Downtown, NY 10001',
        phone: '(555) 123-4567',
        email: 'info@headlinesbarbershop.com',
        website: 'https://headlinesbarbershop.com',
        timezone: 'America/New_York',
        currency: 'USD',
        tax_rate: 8.25
      })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async (settingsType: string, data: any) => {
    try {
      setSaving(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null

      if (!token) {
        setMessage({ type: 'error', text: 'Authentication required. Please log in.' })
        return
      }

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/settings/${settingsType}`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setMessage({ type: 'success', text: 'Settings saved successfully!' })
      setTimeout(() => setMessage(null), 3000)

    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setMessage({ type: 'error', text: 'New passwords do not match.' })
      return
    }

    if (!passwordForm.new_password || passwordForm.new_password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' })
      return
    }

    try {
      setSaving(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null

      if (!token) {
        setMessage({ type: 'error', text: 'Authentication required. Please log in.' })
        return
      }

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/change-password`,
        {
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      setMessage({ type: 'success', text: 'Password changed successfully!' })

    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to change password. Please check your current password.' })
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'business', name: 'Business', icon: BuildingStorefrontIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'payments', name: 'Payments', icon: CreditCardIcon },
    { id: 'integrations', name: 'Integrations', icon: GlobeAltIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Message Banner */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center justify-between ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 mr-2" />
              ) : (
                <XMarkIcon className="h-5 w-5 mr-2" />
              )}
              {message.text}
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-gray-600 hover:text-gray-800"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="premium-card-modern overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-slate-500 text-slate-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.name}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Business Settings */}
            {activeTab === 'business' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Business Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={businessSettings.name}
                      onChange={(e) => setBusinessSettings(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={businessSettings.phone}
                      onChange={(e) => setBusinessSettings(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={businessSettings.email}
                      onChange={(e) => setBusinessSettings(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={businessSettings.website}
                      onChange={(e) => setBusinessSettings(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Address
                    </label>
                    <textarea
                      rows={3}
                      value={businessSettings.address}
                      onChange={(e) => setBusinessSettings(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Timezone
                    </label>
                    <select
                      value={businessSettings.timezone}
                      onChange={(e) => setBusinessSettings(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={businessSettings.tax_rate || 0}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value)
                        if (!isNaN(value) && value >= 0 && value <= 100) {
                          setBusinessSettings(prev => ({ ...prev, tax_rate: value }))
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>

                <button
                  onClick={() => saveSettings('business', businessSettings)}
                  disabled={saving}
                  className="px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg font-medium hover:from-slate-700 hover:to-slate-800 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Business Settings'}
                </button>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Notification Preferences</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Email Notifications</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Receive notifications via email</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.email_notifications}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, email_notifications: e.target.checked }))}
                      className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DevicePhoneMobileIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">SMS Notifications</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Receive notifications via text message</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.sms_notifications}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, sms_notifications: e.target.checked }))}
                      className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ClockIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Appointment Reminders</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Send automatic appointment reminders</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.appointment_reminders}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, appointment_reminders: e.target.checked }))}
                      className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CreditCardIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Payment Notifications</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Notifications for payments and payouts</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.payment_notifications}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, payment_notifications: e.target.checked }))}
                      className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BellIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Push Notifications</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Browser push notifications</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.push_notifications}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, push_notifications: e.target.checked }))}
                      className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                    />
                  </div>
                </div>

                <button
                  onClick={() => saveSettings('notifications', notificationSettings)}
                  disabled={saving}
                  className="px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg font-medium hover:from-slate-700 hover:to-slate-800 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Notification Settings'}
                </button>
              </div>
            )}

            {/* Payment Settings */}
            {activeTab === 'payments' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Payment Configuration</h3>

                <div className="space-y-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Connected Payment Methods</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-slate-600 rounded flex items-center justify-center mr-3">
                            <span className="text-white text-xs font-bold">S</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Stripe</span>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          paymentSettings.stripe_connected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {paymentSettings.stripe_connected ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center mr-3">
                            <span className="text-white text-xs font-bold">□</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Square</span>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          paymentSettings.square_connected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {paymentSettings.square_connected ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Payout Frequency
                      </label>
                      <select
                        value={paymentSettings.payout_frequency}
                        onChange={(e) => setPaymentSettings(prev => ({ ...prev, payout_frequency: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Minimum Payout Amount ($)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={paymentSettings.minimum_payout || 100}
                        onChange={(e) => {
                          const value = parseInt(e.target.value)
                          if (!isNaN(value) && value > 0) {
                            setPaymentSettings(prev => ({ ...prev, minimum_payout: value }))
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Automatic Payouts</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Enable automatic payouts to barbers</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={paymentSettings.auto_payouts}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, auto_payouts: e.target.checked }))}
                      className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                    />
                  </div>
                </div>

                <button
                  onClick={() => saveSettings('payments', paymentSettings)}
                  disabled={saving}
                  className="px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg font-medium hover:from-slate-700 hover:to-slate-800 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Payment Settings'}
                </button>
              </div>
            )}

            {/* Integrations */}
            {activeTab === 'integrations' && (
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Third-Party Integrations</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Connect external services to enhance your workflow and automate tasks.
                  </p>
                </div>

                {/* Google Calendar Integration */}
                <div className="border border-gray-200 rounded-lg p-1">
                  <div className="flex items-center space-x-3 p-4 border-b border-gray-100">
                    <div className="flex-shrink-0">
                      <CalendarIcon className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Google Calendar</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Sync appointments with your Google Calendar automatically
                      </p>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-center py-8 text-gray-500">
                      <p>Google Calendar integration coming soon!</p>
                    </div>
                  </div>
                </div>

                {/* Additional Integration Placeholders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4 opacity-50">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">$</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">QuickBooks</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Coming Soon</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Sync financial data with QuickBooks for accounting</p>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4 opacity-50">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">S</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">Shopify</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Coming Soon</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Integrate with your online store for product sales</p>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Security & Privacy</h3>

                <div className="space-y-6">
                  {/* Change Password */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Change Password</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={passwordForm.current_password}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 pr-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            {showPassword ? (
                              <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                            ) : (
                              <EyeIcon className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={passwordForm.new_password}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={passwordForm.confirm_password}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>

                      <button
                        onClick={changePassword}
                        disabled={saving || !passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password}
                        className="px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg font-medium hover:from-slate-700 hover:to-slate-800 transition-all disabled:opacity-50"
                      >
                        {saving ? 'Changing...' : 'Change Password'}
                      </button>
                    </div>
                  </div>

                  {/* Security Options */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <KeyIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={securitySettings.two_factor_enabled}
                        onChange={(e) => setSecuritySettings(prev => ({ ...prev, two_factor_enabled: e.target.checked }))}
                        className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <BellIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Login Notifications</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Get notified of new login attempts</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={securitySettings.login_notifications}
                        onChange={(e) => setSecuritySettings(prev => ({ ...prev, login_notifications: e.target.checked }))}
                        className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Session Timeout (minutes)
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="480"
                          value={securitySettings.session_timeout || 30}
                          onChange={(e) => {
                            const value = parseInt(e.target.value)
                            if (!isNaN(value) && value >= 5 && value <= 480) {
                              setSecuritySettings(prev => ({ ...prev, session_timeout: value }))
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Password Expiry (days)
                        </label>
                        <input
                          type="number"
                          min="30"
                          max="365"
                          value={securitySettings.password_expiry || 90}
                          onChange={(e) => {
                            const value = parseInt(e.target.value)
                            if (!isNaN(value) && value >= 30 && value <= 365) {
                              setSecuritySettings(prev => ({ ...prev, password_expiry: value }))
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => saveSettings('security', securitySettings)}
                  disabled={saving}
                  className="px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg font-medium hover:from-slate-700 hover:to-slate-800 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Security Settings'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
