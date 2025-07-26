'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile } from '../../../lib/api'
import { Key, Plus, Copy, Trash2, Eye, EyeOff } from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  key: string
  created_at: string
  last_used?: string
  permissions: string[]
  is_active: boolean
}

export default function ApiKeysPage() {
  const router = useRouter()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showKey, setShowKey] = useState<string | null>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      // Check if user is authenticated and has admin role
      const userProfile = await getProfile()
      if (!['admin', 'super_admin'].includes(userProfile.role)) {
        router.push('/dashboard')
        return
      }

      // For now, show mock data since API keys endpoint may not be fully implemented
      const mockApiKeys: ApiKey[] = [
        {
          id: '1',
          name: 'Production API',
          key: 'sk_live_abcd1234567890abcdef',
          created_at: '2024-01-15T10:30:00Z',
          last_used: '2024-01-20T14:25:00Z',
          permissions: ['bookings:read', 'bookings:write', 'clients:read'],
          is_active: true
        },
        {
          id: '2', 
          name: 'Mobile App',
          key: 'sk_live_xyz9876543210fedcba',
          created_at: '2024-01-10T09:15:00Z',
          last_used: '2024-01-19T16:45:00Z',
          permissions: ['bookings:read', 'clients:read'],
          is_active: true
        }
      ]
      
      setApiKeys(mockApiKeys)
    } catch (err: any) {
      setError(err.message || 'Failed to load API keys')
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        router.push('/login')
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const createApiKey = async () => {
    if (!newKeyName.trim()) return
    
    setIsCreating(true)
    try {
      // Mock API key creation
      const newKey: ApiKey = {
        id: Date.now().toString(),
        name: newKeyName,
        key: `sk_live_${Math.random().toString(36).substring(2, 15)}`,
        created_at: new Date().toISOString(),
        permissions: ['bookings:read'],
        is_active: true
      }
      
      setApiKeys([newKey, ...apiKeys])
      setNewKeyName('')
      setShowKey(newKey.id)
    } catch (err: any) {
      setError(err.message || 'Failed to create API key')
    } finally {
      setIsCreating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You might want to show a toast notification here
  }

  const revokeApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return
    }
    
    try {
      setApiKeys(apiKeys.filter(key => key.id !== keyId))
    } catch (err: any) {
      setError(err.message || 'Failed to revoke API key')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading API keys...</div>
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
        <p className="text-gray-600 mt-2">
          Manage API keys for third-party integrations and developer access
        </p>
      </div>

      {/* Create New API Key */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Create New API Key</h2>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="API key name (e.g., Mobile App, Webhook Service)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={createApiKey}
            disabled={isCreating || !newKeyName.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>{isCreating ? 'Creating...' : 'Create Key'}</span>
          </button>
        </div>
      </div>

      {/* API Keys List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">API Keys</h2>
        </div>
        
        {apiKeys.length === 0 ? (
          <div className="p-8 text-center">
            <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No API keys created yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{apiKey.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        apiKey.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {apiKey.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Key:</span>
                        <div className="flex items-center space-x-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {showKey === apiKey.id ? apiKey.key : `${apiKey.key.substring(0, 12)}...`}
                          </code>
                          <button
                            onClick={() => setShowKey(showKey === apiKey.id ? null : apiKey.id)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            {showKey === apiKey.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(apiKey.key)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Created: {new Date(apiKey.created_at).toLocaleDateString()}</span>
                      {apiKey.last_used && (
                        <span>Last used: {new Date(apiKey.last_used).toLocaleDateString()}</span>
                      )}
                    </div>
                    
                    <div className="mt-2">
                      <span className="text-sm text-gray-600">Permissions: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {apiKey.permissions.map((permission) => (
                          <span key={permission} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {permission}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    <button
                      onClick={() => revokeApiKey(apiKey.id)}
                      className="text-red-600 hover:text-red-800 p-2"
                      title="Revoke API key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Notice */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Key className="h-5 w-5 text-yellow-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Security Best Practices</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc pl-4 space-y-1">
                <li>Store API keys securely and never expose them in client-side code</li>
                <li>Regularly rotate API keys and revoke unused ones</li>
                <li>Use the minimum required permissions for each integration</li>
                <li>Monitor API key usage and investigate unusual activity</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}