'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile } from '../../lib/api'
import SMSConversationView from '../../components/SMSConversationView'

export default function SMSPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        // Check if user is authenticated and has admin/barber role
        const userProfile = await getProfile()
        if (!['admin', 'barber'].includes(userProfile.role)) {
          router.push('/dashboard')
          return
        }
        setUser(userProfile)
      } catch (err: any) {
        setError(err.message || 'Failed to load data')
        if (err.message.includes('401') || err.message.includes('Unauthorized')) {
          router.push('/login')
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">SMS Conversations</h1>
        <p className="text-gray-600 mt-2">
          Manage real-time text message conversations with your customers
        </p>
      </div>

      <SMSConversationView />
    </div>
  )
}