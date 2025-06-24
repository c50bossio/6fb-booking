'use client'

import { useState, useEffect } from 'react'
import { useCustomerAuth } from '@/components/customer/CustomerAuthProvider'
import Link from 'next/link'
import { customerAuthService } from '@/lib/api/customer-auth'

export default function CustomerProfilePage() {
  const { customer, logout } = useCustomerAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    newsletterSubscription: false
  })
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<any>({})
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (customer) {
      setFormData({
        firstName: customer.first_name || '',
        lastName: customer.last_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        newsletterSubscription: customer.newsletter_subscription || false
      })
    }
  }, [customer])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev: any) => ({ ...prev, [name]: '' }))
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev: any) => ({ ...prev, [name]: '' }))
    }
  }

  const validateProfileForm = () => {
    const newErrors: any = {}

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    if (!formData.email.includes('@')) newErrors.email = 'Please enter a valid email'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validatePasswordForm = () => {
    const newErrors: any = {}

    if (!passwordData.oldPassword) newErrors.oldPassword = 'Current password is required'
    if (!passwordData.newPassword) newErrors.newPassword = 'New password is required'
    if (passwordData.newPassword.length < 8) newErrors.newPassword = 'Password must be at least 8 characters'
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleProfileSave = async () => {
    if (!validateProfileForm()) return

    setLoading(true)
    setSuccess('')

    try {
      await customerAuthService.updateProfile({
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        newsletter_subscription: formData.newsletterSubscription
      })

      setIsEditing(false)
      setSuccess('Profile updated successfully!')

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setErrors({ general: error.message || 'Failed to update profile' })
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSave = async () => {
    if (!validatePasswordForm()) return

    setLoading(true)

    try {
      await customerAuthService.changePassword({
        old_password: passwordData.oldPassword,
        new_password: passwordData.newPassword
      })

      setShowPasswordModal(false)
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' })
      setSuccess('Password updated successfully!')

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setErrors({ password: error.message || 'Failed to update password' })
    } finally {
      setLoading(false)
    }
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <span className="text-white font-bold text-lg">6</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">6FB Booking</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Welcome back,</p>
                <p className="font-semibold text-gray-900">{customer.first_name}</p>
              </div>
              <button
                onClick={logout}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link href="/customer/dashboard" className="border-b-2 border-transparent py-4 px-1 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors">
              Dashboard
            </Link>
            <Link href="/customer/appointments" className="border-b-2 border-transparent py-4 px-1 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors">
              My Appointments
            </Link>
            <Link href="/customer/history" className="border-b-2 border-transparent py-4 px-1 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors">
              History
            </Link>
            <Link href="/customer/profile" className="border-b-2 border-blue-500 py-4 px-1 text-blue-600 font-medium">
              Profile
            </Link>
            <Link href="/book" className="border-b-2 border-transparent py-4 px-1 text-green-600 hover:text-green-700 hover:border-green-300 transition-colors font-medium">
              Book Appointment
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your personal information and preferences</p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-700">{success}</p>
            </div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          {/* Profile Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl font-bold">
                    {customer.first_name.charAt(0)}{customer.last_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{customer.full_name}</h2>
                  <p className="text-gray-600">{customer.email}</p>
                  <p className="text-sm text-gray-500">
                    Member since {new Date(customer.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Profile Form */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.firstName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                ) : (
                  <p className="py-2 text-gray-900">{customer.first_name}</p>
                )}
                {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.lastName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                ) : (
                  <p className="py-2 text-gray-900">{customer.last_name}</p>
                )}
                {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <p className="py-2 text-gray-900">{customer.email}</p>
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="py-2 text-gray-900">{customer.phone || 'Not provided'}</p>
                )}
              </div>
            </div>

            {/* Preferences */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Preferences</h3>

              <div className="space-y-4">
                <div className="flex items-center">
                  {isEditing ? (
                    <input
                      type="checkbox"
                      name="newsletterSubscription"
                      checked={formData.newsletterSubscription}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  ) : (
                    <div className={`w-4 h-4 rounded border ${customer.newsletter_subscription ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                      {customer.newsletter_subscription && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  )}
                  <label className="ml-3 text-sm text-gray-700">
                    Receive appointment reminders and promotional emails
                  </label>
                </div>
              </div>
            </div>

            {errors.general && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{errors.general}</p>
              </div>
            )}

            {/* Action Buttons */}
            {isEditing && (
              <div className="mt-8 flex space-x-4">
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setErrors({})
                    // Reset form data
                    setFormData({
                      firstName: customer.first_name || '',
                      lastName: customer.last_name || '',
                      email: customer.email || '',
                      phone: customer.phone || '',
                      newsletterSubscription: customer.newsletter_subscription || false
                    })
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProfileSave}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Security Section */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Security</h3>
          </div>
          <div className="px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Password</h4>
                <p className="text-sm text-gray-600">Update your password to keep your account secure</p>
              </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Change Password</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  name="oldPassword"
                  value={passwordData.oldPassword}
                  onChange={handlePasswordChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.oldPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.oldPassword && <p className="text-red-500 text-sm mt-1">{errors.oldPassword}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.newPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>

              {errors.password && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{errors.password}</p>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' })
                  setErrors({})
                }}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSave}
                disabled={loading}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
