'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AccessibleButton } from '@/lib/accessibility-helpers'
import { 
  CogIcon,
  UserIcon,
  BellIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
  BuildingStorefrontIcon,
  PaintBrushIcon,
  RectangleStackIcon,
  BeakerIcon
} from '@heroicons/react/24/outline'

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile')

  const settingSections = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'business', label: 'Business Info', icon: BuildingStorefrontIcon },
    { id: 'scheduling', label: 'Scheduling', icon: CalendarDaysIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'payments', label: 'Payments', icon: CreditCardIcon },
    { id: 'subscription', label: 'Subscription', icon: RectangleStackIcon },
    { id: 'test-data', label: 'Test Data', icon: BeakerIcon },
    { id: 'appearance', label: 'Appearance', icon: PaintBrushIcon },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon }
  ]

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                defaultValue="Alex"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                defaultValue="Thompson"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                defaultValue="alex@bookedbarber.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                defaultValue="(555) 123-4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              rows={3}
              defaultValue="Experienced barber specializing in classic cuts and modern styles. Part of the Six Figure Barber program."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderBusinessSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input
                type="text"
                defaultValue="Elite Cuts Barbershop"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                defaultValue="123 Main Street, Downtown, NY 10001"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Phone</label>
              <input
                type="tel"
                defaultValue="(555) 987-6543"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                defaultValue="https://elitecutsny.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Services & Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: 'Classic Haircut', duration: 45, price: 35 },
              { name: 'Beard Trim', duration: 30, price: 25 },
              { name: 'Full Service', duration: 90, price: 65 },
              { name: 'Styling', duration: 20, price: 15 }
            ].map((service, index) => (
              <div key={index} className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                  <input
                    type="text"
                    defaultValue={service.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                  <input
                    type="number"
                    defaultValue={service.duration}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                  <input
                    type="number"
                    defaultValue={service.price}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
            <AccessibleButton variant="secondary" className="w-full">
              Add New Service
            </AccessibleButton>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderSchedulingSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Working Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
              <div key={day} className="flex items-center space-x-4">
                <div className="w-24">
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked={day !== 'Sunday'} className="mr-2" />
                    {day}
                  </label>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600">Start Time</label>
                    <input
                      type="time"
                      defaultValue="09:00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">End Time</label>
                    <input
                      type="time"
                      defaultValue="18:00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Booking Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Advance Booking Limit</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>1 week</option>
                <option>2 weeks</option>
                <option>1 month</option>
                <option>2 months</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Notice</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>1 hour</option>
                <option>2 hours</option>
                <option>4 hours</option>
                <option>24 hours</option>
              </select>
            </div>
            <div>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                Allow online booking
              </label>
            </div>
            <div>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                Send confirmation emails
              </label>
            </div>
            <div>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                Send reminder notifications
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="mr-3" />
              New appointment bookings
            </label>
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="mr-3" />
              Appointment cancellations
            </label>
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="mr-3" />
              Payment confirmations
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-3" />
              Weekly business reports
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-3" />
              Marketing updates
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SMS Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="mr-3" />
              Appointment reminders
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-3" />
              Last-minute bookings
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-3" />
              Payment reminders
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderPaymentSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-green-50 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-green-800">Stripe Connected</h4>
                  <p className="text-sm text-green-600">Accept credit cards and digital payments</p>
                </div>
                <div className="text-green-600">
                  <ShieldCheckIcon className="w-6 h-6" />
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-3" />
                Accept cash payments
              </label>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-3" />
                Accept card payments
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-3" />
                Accept Apple Pay
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-3" />
                Accept Google Pay
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing & Policies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cancellation Policy</label>
              <textarea
                rows={3}
                defaultValue="24-hour cancellation notice required. Same-day cancellations may incur a 50% charge."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-3" />
                Require deposit for bookings
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Amount (%)</label>
              <input
                type="number"
                defaultValue="25"
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Booking Page Customization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Logo</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <PaintBrushIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Upload your business logo</p>
                <AccessibleButton variant="secondary" className="mt-2">
                  Choose File
                </AccessibleButton>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <input
                type="color"
                defaultValue="#3B82F6"
                className="w-full h-10 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Welcome Message</label>
              <textarea
                rows={3}
                defaultValue="Welcome to Elite Cuts! Book your appointment with our experienced barbers for the perfect cut."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Password & Security</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <AccessibleButton variant="primary">
              Update Password
            </AccessibleButton>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">
              Add an extra layer of security to your account with two-factor authentication.
            </p>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">SMS Authentication</h4>
                <p className="text-sm text-gray-600">Receive codes via SMS</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderSubscriptionSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Subscription & Billing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">
              Manage your subscription plans and billing information.
            </p>
            <AccessibleButton 
              variant="primary"
              onClick={() => window.location.href = '/billing/plans'}
            >
              View Subscription Plans
            </AccessibleButton>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderTestDataSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Data Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">
              Manage test data for development and testing purposes.
            </p>
            <AccessibleButton 
              variant="primary"
              onClick={() => window.location.href = '/settings/test-data'}
            >
              Manage Test Data
            </AccessibleButton>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSettings()
      case 'business':
        return renderBusinessSettings()
      case 'scheduling':
        return renderSchedulingSettings()
      case 'notifications':
        return renderNotificationSettings()
      case 'payments':
        return renderPaymentSettings()
      case 'subscription':
        return renderSubscriptionSettings()
      case 'test-data':
        return renderTestDataSettings()
      case 'appearance':
        return renderAppearanceSettings()
      case 'security':
        return renderSecuritySettings()
      default:
        return renderProfileSettings()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <CogIcon className="w-7 h-7 mr-3 text-gray-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">Manage your account and business preferences</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {settingSections.map((section) => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {section.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            {renderContent()}
            
            {/* Save Button */}
            <div className="mt-8 flex justify-end space-x-4">
              <AccessibleButton variant="secondary">
                Cancel
              </AccessibleButton>
              <AccessibleButton variant="primary">
                Save Changes
              </AccessibleButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}