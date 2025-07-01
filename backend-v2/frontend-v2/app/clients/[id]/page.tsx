'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  getClient, 
  updateClient, 
  getClientHistory, 
  getClientAnalytics,
  getClientRecommendations,
  getClientCommunicationPreferences,
  updateClientCommunicationPreferences,
  addClientNote,
  updateClientTags,
  type Client
} from '@/lib/api'

type ClientHistory = {
  appointments: any[]
  total_appointments: number
  total_spent: number
  average_ticket: number
  no_shows: number
  cancellations: number
}

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = parseInt(params.id as string)
  
  const [client, setClient] = useState<Client | null>(null)
  const [history, setHistory] = useState<ClientHistory | null>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any>(null)
  const [commPrefs, setCommPrefs] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState('general')
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    notes: '',
    tags: ''
  })

  useEffect(() => {
    loadClientData()
  }, [clientId])

  const loadClientData = async () => {
    try {
      setLoading(true)
      const [clientData, historyData, analyticsData, recommendationsData, commPrefsData] = await Promise.all([
        getClient(clientId),
        getClientHistory(clientId),
        getClientAnalytics(clientId).catch(() => null),
        getClientRecommendations(clientId).catch(() => null),
        getClientCommunicationPreferences(clientId).catch(() => null)
      ])
      
      setClient(clientData)
      setHistory(historyData)
      setAnalytics(analyticsData)
      setRecommendations(recommendationsData)
      setCommPrefs(commPrefsData)
      setEditForm({
        first_name: clientData.first_name,
        last_name: clientData.last_name,
        email: clientData.email,
        phone: clientData.phone || '',
        notes: clientData.notes || '',
        tags: clientData.tags || ''
      })
    } catch (err: any) {
      if (err.message.includes('401') || err.message.includes('403')) {
        router.push('/login')
      } else if (err.message.includes('404')) {
        setError('Client not found')
      } else {
        setError('Failed to load client data')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const updates = {
        ...editForm,
        phone: editForm.phone || undefined,
        notes: editForm.notes || undefined,
        tags: editForm.tags || undefined
      }
      
      const updatedClient = await updateClient(clientId, updates)
      setClient(updatedClient)
      setIsEditing(false)
    } catch (err) {
      setError('Failed to update client')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    
    try {
      await addClientNote(clientId, newNote, noteType)
      setNewNote('')
      setNoteType('general')
      setShowNoteModal(false)
      // Reload client data to get updated notes
      loadClientData()
    } catch (err) {
      setError('Failed to add note')
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case 'vip': return 'text-purple-600 bg-purple-50'
      case 'at_risk': return 'text-red-600 bg-red-50'
      case 'returning': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <p className="text-gray-500">Loading client data...</p>
      </main>
    )
  }

  if (error || !client) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <p className="text-red-500 mb-4">{error || 'Client not found'}</p>
        <Link href="/clients" className="text-blue-600 hover:text-blue-500">
          Back to Clients
        </Link>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col p-8">
      <div className="max-w-6xl w-full mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {client.first_name} {client.last_name}
            </h1>
            <p className="text-gray-600 mt-2">
              <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getCustomerTypeColor(client.customer_type)}`}>
                {client.customer_type.toUpperCase()}
              </span>
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowNoteModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Add Note
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {isEditing ? 'Cancel Edit' : 'Edit Client'}
            </button>
            <Link
              href="/clients"
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Back to Clients
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Information */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Client Information</h2>
              
              {isEditing ? (
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                      <input
                        name="first_name"
                        value={editForm.first_name}
                        onChange={handleChange}
                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                      <input
                        name="last_name"
                        value={editForm.last_name}
                        onChange={handleChange}
                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                    <input
                      name="email"
                      type="email"
                      value={editForm.email}
                      onChange={handleChange}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                    <input
                      name="phone"
                      value={editForm.phone}
                      onChange={handleChange}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags</label>
                    <input
                      name="tags"
                      value={editForm.tags}
                      onChange={handleChange}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                      placeholder="VIP, Referral, Student"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                    <textarea
                      name="notes"
                      value={editForm.notes}
                      onChange={handleChange}
                      rows={3}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </form>
              ) : (
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.phone || 'Not provided'}</dd>
                  </div>
                  {client.tags && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Tags</dt>
                      <dd className="mt-1">
                        {client.tags.split(',').map((tag, i) => (
                          <span key={i} className="inline-flex px-2 py-1 text-xs bg-gray-100 rounded-full mr-2">
                            {tag.trim()}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                  {client.notes && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Notes</dt>
                      <dd className="mt-1 text-sm text-gray-900">{client.notes}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Member Since</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(client.created_at)}</dd>
                  </div>
                </dl>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Statistics</h2>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Total Visits</dt>
                  <dd className="text-sm font-medium text-gray-900">{client.total_visits}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Total Spent</dt>
                  <dd className="text-sm font-medium text-gray-900">${client.total_spent.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Average Ticket</dt>
                  <dd className="text-sm font-medium text-gray-900">${client.average_ticket.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">No Shows</dt>
                  <dd className="text-sm font-medium text-gray-900">{client.no_show_count}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Cancellations</dt>
                  <dd className="text-sm font-medium text-gray-900">{client.cancellation_count}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Referrals</dt>
                  <dd className="text-sm font-medium text-gray-900">{client.referral_count}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Visit History</h2>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">First Visit</dt>
                  <dd className="text-sm font-medium text-gray-900">{formatDate(client.first_visit_date)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Last Visit</dt>
                  <dd className="text-sm font-medium text-gray-900">{formatDate(client.last_visit_date)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Analytics and Recommendations */}
        {analytics && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Booking Patterns */}
            {analytics.booking_patterns && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Booking Patterns</h2>
                <div className="space-y-3">
                  {analytics.booking_patterns.preferred_day && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Preferred Day:</span>
                      <span className="text-sm font-medium">{analytics.booking_patterns.preferred_day}</span>
                    </div>
                  )}
                  {analytics.booking_patterns.preferred_hour && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Preferred Time:</span>
                      <span className="text-sm font-medium">{analytics.booking_patterns.preferred_hour}:00</span>
                    </div>
                  )}
                  {analytics.booking_patterns.preferred_service && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Favorite Service:</span>
                      <span className="text-sm font-medium">{analytics.booking_patterns.preferred_service}</span>
                    </div>
                  )}
                  {analytics.visit_frequency_days && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Visit Frequency:</span>
                      <span className="text-sm font-medium">Every {Math.round(analytics.visit_frequency_days)} days</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {recommendations && recommendations.recommendations && recommendations.recommendations.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
                <div className="space-y-3">
                  {recommendations.recommendations.map((rec: any, index: number) => (
                    <div key={index} className="p-3 bg-blue-50 rounded-lg">
                      <h3 className="text-sm font-medium text-blue-900">{rec.title}</h3>
                      <p className="text-xs text-blue-700 mt-1">{rec.message}</p>
                      {rec.action && (
                        <p className="text-xs text-blue-600 mt-1 italic">{rec.action}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Appointment History */}
        {history && history.appointments.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Appointment History</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-left py-2 text-sm font-medium text-gray-500">Service</th>
                    <th className="text-left py-2 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left py-2 text-sm font-medium text-gray-500">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.appointments.map((apt) => (
                    <tr key={apt.id}>
                      <td className="py-2 text-sm">{formatDate(apt.start_time)}</td>
                      <td className="py-2 text-sm">{apt.service_name}</td>
                      <td className="py-2 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          apt.status === 'completed' ? 'bg-green-100 text-green-800' :
                          apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {apt.status}
                        </span>
                      </td>
                      <td className="py-2 text-sm">${apt.price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Note Modal */}
        {showNoteModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add Note</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note Type</label>
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value)}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="service">Service Related</option>
                    <option value="preference">Preference</option>
                    <option value="issue">Issue/Concern</option>
                    <option value="compliment">Compliment</option>
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note</label>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={4}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your note here..."
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAddNote}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Note
                  </button>
                  <button
                    onClick={() => {
                      setShowNoteModal(false)
                      setNewNote('')
                      setNoteType('general')
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}