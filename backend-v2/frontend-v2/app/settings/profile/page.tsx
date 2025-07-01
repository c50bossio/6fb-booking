'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, changePassword, updateUserTimezone, updateUserProfile, type User } from '@/lib/api'
import TimezoneSelector from '@/components/TimezoneSelector'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'timezone'>('info')
  
  // Profile editing state
  const [profileData, setProfileData] = useState({ name: '', email: '' })
  const [editingProfile, setEditingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Password change state
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
  const [submittingPassword, setSubmittingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Timezone state
  const [timezone, setTimezone] = useState<string>('')
  const [savingTimezone, setSavingTimezone] = useState(false)
  const [timezoneMessage, setTimezoneMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    async function fetchUser() {
      try {
        const userData = await getProfile()
        setUser(userData)
        // Set initial values
        if (userData.timezone) {
          setTimezone(userData.timezone)
        }
        setProfileData({
          name: userData.name || '',
          email: userData.email || ''
        })
      } catch (error: any) {
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
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || ''
      })
    }
  }

  const handleSubmitPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (!isPasswordValid()) {
      setPasswordMessage({ type: 'error', text: 'New password does not meet requirements' })
      return
    }

    if (!passwordData.currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Current password is required' })
      return
    }

    setSubmittingPassword(true)

    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword)
      setPasswordMessage({ type: 'success', text: 'Password changed successfully!' })
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
        router.push('/login')
      } else if (error.message.includes('Invalid current password')) {
        setPasswordMessage({ type: 'error', text: 'Current password is incorrect' })
      } else {
        setPasswordMessage({ type: 'error', text: error.message || 'Failed to change password' })
      }
    } finally {
      setSubmittingPassword(false)
    }
  }

  const handleSaveTimezone = async () => {
    setTimezoneMessage(null)
    setSavingTimezone(true)

    try {
      await updateUserTimezone(timezone)
      setTimezoneMessage({ type: 'success', text: 'Timezone updated successfully!' })
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account information and preferences</p>
          </div>
          <button
            onClick={() => router.push('/settings')}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            ← Back to Settings
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'info'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Profile Information
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'password'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Password & Security
            </button>
            <button
              onClick={() => setActiveTab('timezone')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'timezone'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Timezone Settings
            </button>
          </nav>
        </div>

        {/* Profile Information Tab */}
        {activeTab === 'info' && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile Information</h2>
              {!editingProfile && (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {profileMessage && (
              <div
                className={`mb-4 p-3 rounded-md text-sm ${
                  profileMessage.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                }`}
              >
                {profileMessage.text}
              </div>
            )}

            {editingProfile ? (
              <div className="space-y-4">
                <div>
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-1 form-input"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleCancelProfileEdit}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
                    <p className="mt-1 text-gray-900 dark:text-white">{user.name || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                    <p className="mt-1 text-gray-900 dark:text-white">{user.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Role</label>
                    <p className="mt-1 text-gray-900 dark:text-white capitalize">{user.role || 'User'}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Contact an administrator to change your role
                    </p>
                  </div>
                  {/* Account status removed - not available in current API */}
                  {user.id && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">User ID</label>
                      <p className="mt-1 text-gray-900 dark:text-white font-mono text-sm">{user.id}</p>
                    </div>
                  )}
                  {/* Member since removed - not available in current API */}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Password & Security Tab */}
        {activeTab === 'password' && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Password & Security</h2>
            
            {passwordMessage && (
              <div
                className={`mb-4 p-3 rounded-md text-sm ${
                  passwordMessage.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                }`}
              >
                {passwordMessage.text}
              </div>
            )}

            <form onSubmit={handleSubmitPasswordChange} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="form-label">
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  required
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="mt-1 form-input"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="form-label">
                  New Password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="mt-1 form-input"
                />
                
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Password Requirements:</p>
                  <div className="space-y-1">
                    <div className={`text-sm flex items-center ${passwordStrength.hasMinLength ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                      <span className="mr-2">{passwordStrength.hasMinLength ? '✓' : '○'}</span>
                      At least 8 characters
                    </div>
                    <div className={`text-sm flex items-center ${passwordStrength.hasUpperCase ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                      <span className="mr-2">{passwordStrength.hasUpperCase ? '✓' : '○'}</span>
                      One uppercase letter
                    </div>
                    <div className={`text-sm flex items-center ${passwordStrength.hasLowerCase ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                      <span className="mr-2">{passwordStrength.hasLowerCase ? '✓' : '○'}</span>
                      One lowercase letter
                    </div>
                    <div className={`text-sm flex items-center ${passwordStrength.hasDigit ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                      <span className="mr-2">{passwordStrength.hasDigit ? '✓' : '○'}</span>
                      One number
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="mt-1 form-input"
                />
                {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">Passwords do not match</p>
                )}
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submittingPassword || !isPasswordValid() || passwordData.newPassword !== passwordData.confirmPassword || !passwordData.currentPassword}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingPassword ? 'Changing password...' : 'Change Password'}
                </button>
              </div>
            </form>

            {/* Additional Security Info */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              {/* Security information removed - not available in current API */}
            </div>
          </div>
        )}

        {/* Timezone Settings Tab */}
        {activeTab === 'timezone' && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Timezone Settings</h2>
            
            {timezoneMessage && (
              <div
                className={`mb-4 p-3 rounded-md text-sm ${
                  timezoneMessage.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                }`}
              >
                {timezoneMessage.text}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="form-label mb-2">
                  Your Timezone
                </label>
                <TimezoneSelector
                  value={timezone}
                  onChange={setTimezone}
                  className="mb-4"
                />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  All appointment times will be displayed in your selected timezone. This helps ensure you see the correct times for your bookings.
                </p>
                {timezone && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md mb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Current time in {timezone}:</span>{' '}
                      {new Date().toLocaleString('en-US', { 
                        timeZone: timezone,
                        dateStyle: 'full',
                        timeStyle: 'medium'
                      })}
                    </p>
                  </div>
                )}
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
        )}
      </div>
    </main>
  )
}