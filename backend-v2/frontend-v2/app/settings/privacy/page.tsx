'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

export default function PrivacyPage() {
  const router = useRouter()
  const [settings, setSettings] = useState({
    dataCollection: true,
    cookies: true,
    analytics: true,
    thirdPartySharing: false,
    profileVisibility: 'private'
  })

  const handleToggle = (key: keyof typeof settings) => {
    if (typeof settings[key] === 'boolean') {
      setSettings(prev => ({
        ...prev,
        [key]: !prev[key]
      }))
    }
  }

  const handleProfileVisibilityChange = (value: string) => {
    setSettings(prev => ({
      ...prev,
      profileVisibility: value
    }))
  }

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Privacy Settings</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Privacy and data protection settings</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/settings')}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors duration-200"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>Back to Settings</span>
          </button>
        </div>

        {/* Privacy Settings */}
        <div className="space-y-6">
          {/* Data Collection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Data Collection</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Usage Analytics</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Allow collection of usage data to improve the platform</p>
                </div>
                <button
                  onClick={() => handleToggle('analytics')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    settings.analytics ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.analytics ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Data Collection</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Allow collection of anonymized data for service improvement</p>
                </div>
                <button
                  onClick={() => handleToggle('dataCollection')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    settings.dataCollection ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.dataCollection ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Cookies */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cookies & Tracking</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Essential Cookies</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Required for basic functionality (cannot be disabled)</p>
                </div>
                <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 opacity-50 cursor-not-allowed">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Analytics Cookies</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Help us understand how you use the platform</p>
                </div>
                <button
                  onClick={() => handleToggle('cookies')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    settings.cookies ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.cookies ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Profile Visibility */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Visibility</h2>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="profileVisibility"
                  value="private"
                  checked={settings.profileVisibility === 'private'}
                  onChange={() => handleProfileVisibilityChange('private')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900 dark:text-white">Private</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Only you can see your profile information</p>
                </div>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="profileVisibility"
                  value="organization"
                  checked={settings.profileVisibility === 'organization'}
                  onChange={() => handleProfileVisibilityChange('organization')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900 dark:text-white">Organization</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Visible to members of your organization</p>
                </div>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="profileVisibility"
                  value="public"
                  checked={settings.profileVisibility === 'public'}
                  onChange={() => handleProfileVisibilityChange('public')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900 dark:text-white">Public</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Your profile is publicly visible</p>
                </div>
              </label>
            </div>
          </div>

          {/* Third Party Sharing */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Third Party Sharing</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Share Data with Partners</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Allow sharing anonymized data with trusted partners</p>
              </div>
              <button
                onClick={() => handleToggle('thirdPartySharing')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings.thirdPartySharing ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.thirdPartySharing ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Data Export & Deletion */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Data Rights</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Export Your Data</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Download a copy of all your data</p>
                </div>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200">
                  Export Data
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Delete Account</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Permanently delete your account and all data</p>
                </div>
                <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200">
                  Delete Account
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}