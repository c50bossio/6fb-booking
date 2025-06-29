'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, changePassword, updateUserTimezone, updateUserProfile } from '@/lib/api'
import TimezoneSelector from '@/components/TimezoneSelector'

interface User {
  email: string
  name: string
  timezone?: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasDigit: false
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [timezone, setTimezone] = useState<string>('')
  const [savingTimezone, setSavingTimezone] = useState(false)
  const [timezoneMessage, setTimezoneMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [profileData, setProfileData] = useState({ name: '', email: '' })
  const [editingProfile, setEditingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    async function fetchUser() {
      try {
        const userData = await getProfile()
        setUser(userData)
        // Set initial timezone value
        if (userData.timezone) {
          setTimezone(userData.timezone)
        }
        // Set initial profile data
        setProfileData({
          name: userData.name || '',
          email: userData.email || ''
        })
      } catch (error: any) {
        // Handle 401 or other auth errors by redirecting to login
        if (error.message.includes('401')) {
          router.push('/login')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [router])

  // Validate password strength
  const validatePassword = (password: string) => {
    setPasswordStrength({
      hasMinLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasDigit: /\d/.test(password)
    })
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData(prev => ({ ...prev, [name]: value }))
    
    if (name === 'newPassword') {
      validatePassword(value)
    }
  }

  const isPasswordValid = () => {
    return passwordStrength.hasMinLength &&
           passwordStrength.hasUpperCase &&
           passwordStrength.hasLowerCase &&
           passwordStrength.hasDigit
  }

  const handleSaveTimezone = async () => {
    setTimezoneMessage(null)
    setSavingTimezone(true)

    try {
      await updateUserTimezone(timezone)
      setTimezoneMessage({ type: 'success', text: 'Timezone updated successfully!' })
      // Update user object with new timezone
      if (user) {
        setUser({ ...user, timezone })
      }
    } catch (error: any) {
      if (error.message.includes('401')) {
        router.push('/login')
      } else {
        setTimezoneMessage({ type: 'error', text: error.message || 'Failed to update timezone' })
      }
    } finally {
      setSavingTimezone(false)
    }
  }

  const handleSaveProfile = async () => {
    setProfileMessage(null)
    setSavingProfile(true)

    try {
      const updatedUser = await updateUserProfile(profileData)
      setUser(updatedUser)
      setEditingProfile(false)
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' })
    } catch (error: any) {
      if (error.message.includes('401')) {
        router.push('/login')
      } else {
        setProfileMessage({ type: 'error', text: error.message || 'Failed to update profile' })
      }
    } finally {
      setSavingProfile(false)
    }
  }

  const handleCancelProfileEdit = () => {
    setEditingProfile(false)
    setProfileMessage(null)
    // Reset to original values
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || ''
      })
    }
  }

  const handleSubmitPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    // Validate password strength
    if (!isPasswordValid()) {
      setMessage({ type: 'error', text: 'New password does not meet requirements' })
      return
    }

    // Validate current password is provided
    if (!passwordData.currentPassword) {
      setMessage({ type: 'error', text: 'Current password is required' })
      return
    }

    setSubmitting(true)

    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword)
      setMessage({ type: 'success', text: 'Password changed successfully!' })
      // Clear form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setPasswordStrength({
        hasMinLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasDigit: false
      })
    } catch (error: any) {
      if (error.message.includes('401')) {
        // Auth token expired, redirect to login
        router.push('/login')
      } else if (error.message.includes('Invalid current password')) {
        setMessage({ type: 'error', text: 'Current password is incorrect' })
      } else {
        setMessage({ type: 'error', text: error.message || 'Failed to change password' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login if not authenticated
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header with navigation */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* User Information Section */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Profile Information</h2>
            {!editingProfile && (
              <button
                onClick={() => setEditingProfile(true)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Edit Profile
              </button>
            )}
          </div>

          {profileMessage && (
            <div
              className={`mb-4 p-3 rounded-md text-sm ${
                profileMessage.type === 'success'
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              {profileMessage.text}
            </div>
          )}

          {editingProfile ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancelProfileEdit}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500">Name</label>
                <p className="mt-1 text-gray-900">{user.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <p className="mt-1 text-gray-900">{user.email}</p>
              </div>
            </div>
          )}
        </div>

        {/* Timezone Settings Section */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Timezone Settings</h2>
          
          {timezoneMessage && (
            <div
              className={`mb-4 p-3 rounded-md text-sm ${
                timezoneMessage.type === 'success'
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              {timezoneMessage.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Timezone
              </label>
              <TimezoneSelector
                value={timezone}
                onChange={setTimezone}
                className="mb-4"
              />
              <p className="text-sm text-gray-600 mb-4">
                All appointment times will be displayed in your selected timezone. This helps ensure you see the correct times for your bookings.
              </p>
              <button
                onClick={handleSaveTimezone}
                disabled={savingTimezone || !timezone || timezone === user?.timezone}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingTimezone ? 'Saving...' : 'Save Timezone'}
              </button>
            </div>
          </div>
        </div>

        {/* Change Password Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Change Password</h2>
          
          {message && (
            <div
              className={`mb-4 p-3 rounded-md text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmitPasswordChange} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                Current Password
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              
              {/* Password Requirements */}
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-600">Password must contain:</p>
                <div className="space-y-1">
                  <div className={`text-xs flex items-center ${passwordStrength.hasMinLength ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className="mr-2">{passwordStrength.hasMinLength ? '✓' : '○'}</span>
                    At least 8 characters
                  </div>
                  <div className={`text-xs flex items-center ${passwordStrength.hasUpperCase ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className="mr-2">{passwordStrength.hasUpperCase ? '✓' : '○'}</span>
                    One uppercase letter
                  </div>
                  <div className={`text-xs flex items-center ${passwordStrength.hasLowerCase ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className="mr-2">{passwordStrength.hasLowerCase ? '✓' : '○'}</span>
                    One lowercase letter
                  </div>
                  <div className={`text-xs flex items-center ${passwordStrength.hasDigit ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className="mr-2">{passwordStrength.hasDigit ? '✓' : '○'}</span>
                    One number
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
              )}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting || !isPasswordValid() || passwordData.newPassword !== passwordData.confirmPassword || !passwordData.currentPassword}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Changing password...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}