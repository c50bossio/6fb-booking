'use client'

import { useState, useRef } from 'react'
import {
  BuildingStorefrontIcon,
  CameraIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import { googleBusinessAPI, GoogleBusinessProfile } from '@/lib/api/local-seo'

interface GoogleBusinessManagerProps {
  profile: GoogleBusinessProfile | null
  onProfileUpdate: () => void
}

export default function GoogleBusinessManager({ profile, onProfileUpdate }: GoogleBusinessManagerProps) {
  const [editing, setEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [editData, setEditData] = useState<Partial<GoogleBusinessProfile>>(profile || {})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSaveProfile = async () => {
    try {
      await googleBusinessAPI.updateProfile(editData)
      setEditing(false)
      onProfileUpdate()
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      await googleBusinessAPI.uploadPhoto(file, 'general')
      onProfileUpdate()
    } catch (error) {
      console.error('Error uploading photo:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (confirm('Are you sure you want to delete this photo?')) {
      try {
        await googleBusinessAPI.deletePhoto(photoId)
        onProfileUpdate()
      } catch (error) {
        console.error('Error deleting photo:', error)
      }
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      await googleBusinessAPI.syncWithGoogle()
      onProfileUpdate()
    } catch (error) {
      console.error('Error syncing with Google:', error)
    } finally {
      setSyncing(false)
    }
  }

  const getVerificationIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
    }
  }

  const getVerificationBadge = (status: string) => {
    const styles = {
      verified: 'bg-green-500/10 text-green-600 border-green-500/20',
      unverified: 'bg-red-500/10 text-red-600 border-red-500/20',
      pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
    }
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${styles[status as keyof typeof styles]}`}>
        <span className="mr-2">{getVerificationIcon(status)}</span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (!profile) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8">
        <div className="text-center">
          <BuildingStorefrontIcon className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Connect Your Google Business Profile
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Link your Google Business Profile to manage your local presence, respond to reviews, and track local SEO performance.
          </p>
          <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg font-medium hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 shadow-lg">
            <GlobeAltIcon className="h-5 w-5 mr-2" />
            Connect Google Business
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
              <BuildingStorefrontIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.business_name}</h2>
              <div className="flex items-center space-x-3 mt-1">
                {getVerificationBadge(profile.verification_status)}
                <span className={`text-sm ${profile.is_active ? 'text-green-600' : 'text-red-600'}`}>
                  {profile.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
            <button
              onClick={() => setEditing(!editing)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <PencilIcon className="h-4 w-4" />
              <span>{editing ? 'Cancel' : 'Edit'}</span>
            </button>
          </div>
        </div>

        {/* Business Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
            <div className="space-y-3">
              {editing ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={editData.business_name || ''}
                      onChange={(e) => setEditData({ ...editData, business_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={editData.address || ''}
                      onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={editData.phone || ''}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={editData.website_url || ''}
                      onChange={(e) => setEditData({ ...editData, website_url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-3">
                    <MapPinIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{profile.address}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{profile.phone}</span>
                  </div>
                  {profile.website_url && (
                    <div className="flex items-center space-x-3">
                      <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                      <a
                        href={profile.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 dark:text-teal-400 hover:underline"
                      >
                        {profile.website_url}
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Categories & Services</h3>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Categories (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editData.categories?.join(', ') || ''}
                    onChange={(e) => setEditData({ ...editData, categories: e.target.value.split(', ').filter(c => c.trim()) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Barber Shop, Hair Salon"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Services (comma-separated)
                  </label>
                  <textarea
                    value={editData.services?.join(', ') || ''}
                    onChange={(e) => setEditData({ ...editData, services: e.target.value.split(', ').filter(s => s.trim()) })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Haircuts, Beard Trimming, Hot Towel Shaves"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.categories.map((category, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                      >
                        <TagIcon className="h-3 w-3 mr-1" />
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Services</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.services.slice(0, 6).map((service, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 rounded-full text-sm"
                      >
                        {service}
                      </span>
                    ))}
                    {profile.services.length > 6 && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full text-sm">
                        +{profile.services.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Business Description</h3>
          {editing ? (
            <textarea
              value={editData.description || ''}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Describe your barbershop and what makes it special..."
            />
          ) : (
            <p className="text-gray-700 dark:text-gray-300">
              {profile.description || 'No description provided.'}
            </p>
          )}
        </div>

        {editing && (
          <div className="mt-6 flex items-center justify-end space-x-3">
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveProfile}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Photo Management */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Business Photos</h3>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            <CameraIcon className="h-4 w-4" />
            <span>{uploading ? 'Uploading...' : 'Add Photo'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>

        {profile.photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {profile.photos.map((photo, index) => (
              <div key={index} className="relative group">
                <img
                  src={photo.url}
                  alt={photo.caption || `Business photo ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDeletePhoto(photo.url)}
                      className="p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {photo.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-2 rounded-b-lg">
                    {photo.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CameraIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h4 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No photos yet</h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Add photos to showcase your barbershop and attract more customers.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
