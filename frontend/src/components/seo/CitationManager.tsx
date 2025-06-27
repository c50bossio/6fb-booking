'use client'

import { useState } from 'react'
import {
  GlobeAltIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  EyeIcon,
  PencilIcon,
  LinkIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
  PhoneIcon,
  StarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { citationManagementAPI, LocalCitation, CITATION_STATUSES } from '@/lib/api/local-seo'

interface CitationManagerProps {
  citations: LocalCitation[]
  onCitationsUpdate: () => void
}

export default function CitationManager({ citations, onCitationsUpdate }: CitationManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [verifying, setVerifying] = useState<Set<string>>(new Set())
  const [newCitation, setNewCitation] = useState({
    directory_name: '',
    business_name: '',
    address: '',
    phone: '',
    website: '',
    category: '',
    listing_url: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [loadingOpportunities, setLoadingOpportunities] = useState(false)

  const handleAddCitation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCitation.directory_name.trim() || !newCitation.business_name.trim()) return

    try {
      await citationManagementAPI.addCitation({
        ...newCitation,
        status: 'pending' as const,
        accuracy_score: 100,
        issues: [],
        authority_score: 50
      })
      setNewCitation({
        directory_name: '',
        business_name: '',
        address: '',
        phone: '',
        website: '',
        category: '',
        listing_url: ''
      })
      setShowAddForm(false)
      onCitationsUpdate()
    } catch (error) {
      console.error('Error adding citation:', error)
    }
  }

  const handleDeleteCitation = async (citationId: string) => {
    if (confirm('Are you sure you want to delete this citation?')) {
      try {
        await citationManagementAPI.deleteCitation(citationId)
        onCitationsUpdate()
      } catch (error) {
        console.error('Error deleting citation:', error)
      }
    }
  }

  const handleVerifyCitation = async (citationId: string) => {
    setVerifying(prev => new Set(prev).add(citationId))
    try {
      await citationManagementAPI.verifyCitation(citationId)
      onCitationsUpdate()
    } catch (error) {
      console.error('Error verifying citation:', error)
    } finally {
      setVerifying(prev => {
        const newSet = new Set(prev)
        newSet.delete(citationId)
        return newSet
      })
    }
  }

  const handleScanForCitations = async () => {
    setScanning(true)
    try {
      await citationManagementAPI.scanForCitations()
      onCitationsUpdate()
    } catch (error) {
      console.error('Error scanning for citations:', error)
    } finally {
      setScanning(false)
    }
  }

  const loadOpportunities = async () => {
    setLoadingOpportunities(true)
    try {
      const response = await citationManagementAPI.getDirectoryOpportunities()
      if (response.success) {
        setOpportunities(response.opportunities)
      }
    } catch (error) {
      console.error('Error loading opportunities:', error)
    } finally {
      setLoadingOpportunities(false)
    }
  }

  const filteredCitations = citations.filter(citation => {
    const matchesSearch = citation.directory_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         citation.business_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || citation.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'claimed':
        return <CheckCircleIcon className="h-5 w-5 text-blue-500" />
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      case 'inactive':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'unclaimed':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      claimed: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      inactive: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      unclaimed: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
    }

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {getStatusIcon(status)}
        <span className="ml-1">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </span>
    )
  }

  const getAccuracyColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getAuthorityBadge = (score: number) => {
    if (score >= 70) return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    if (score >= 40) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
    return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getCitationStats = () => {
    const totalCitations = citations.length
    const activeCitations = citations.filter(c => c.status === 'active').length
    const averageAccuracy = citations.length > 0
      ? citations.reduce((sum, c) => sum + c.accuracy_score, 0) / citations.length
      : 0
    const issuesCount = citations.reduce((sum, c) => sum + c.issues.length, 0)

    return {
      totalCitations,
      activeCitations,
      averageAccuracy: averageAccuracy.toFixed(1),
      issuesCount
    }
  }

  const stats = getCitationStats()

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl">
              <GlobeAltIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Total Citations</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCitations}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Active Citations</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeCitations}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <StarIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Avg. Accuracy</p>
          <p className={`text-2xl font-bold ${getAccuracyColor(parseFloat(stats.averageAccuracy))}`}>
            {stats.averageAccuracy}%
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl">
              <ExclamationTriangleIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Issues Found</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.issuesCount}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search citations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              {Object.entries(CITATION_STATUSES).map(([key, value]) => (
                <option key={value} value={value}>
                  {key.charAt(0) + key.slice(1).toLowerCase()}
                </option>
              ))}
            </select>

            <button
              onClick={handleScanForCitations}
              disabled={scanning}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <MagnifyingGlassIcon className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
              <span>{scanning ? 'Scanning...' : 'Scan Web'}</span>
            </button>

            <button
              onClick={loadOpportunities}
              disabled={loadingOpportunities}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <StarIcon className={`h-4 w-4 ${loadingOpportunities ? 'animate-spin' : ''}`} />
              <span>Find Opportunities</span>
            </button>

            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Add Citation</span>
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredCitations.length} of {citations.length} citations
        </div>
      </div>

      {/* Add Citation Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add New Citation</h3>
          <form onSubmit={handleAddCitation} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Directory Name
                </label>
                <input
                  type="text"
                  value={newCitation.directory_name}
                  onChange={(e) => setNewCitation({ ...newCitation, directory_name: e.target.value })}
                  placeholder="Yellow Pages"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={newCitation.business_name}
                  onChange={(e) => setNewCitation({ ...newCitation, business_name: e.target.value })}
                  placeholder="Your Barbershop Name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={newCitation.address}
                  onChange={(e) => setNewCitation({ ...newCitation, address: e.target.value })}
                  placeholder="123 Main St, City, State 12345"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newCitation.phone}
                  onChange={(e) => setNewCitation({ ...newCitation, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={newCitation.website}
                  onChange={(e) => setNewCitation({ ...newCitation, website: e.target.value })}
                  placeholder="https://yourbarbershop.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={newCitation.category}
                  onChange={(e) => setNewCitation({ ...newCitation, category: e.target.value })}
                  placeholder="Barber Shop"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Listing URL (Optional)
                </label>
                <input
                  type="url"
                  value={newCitation.listing_url}
                  onChange={(e) => setNewCitation({ ...newCitation, listing_url: e.target.value })}
                  placeholder="https://directory.com/your-listing"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Add Citation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Directory Opportunities */}
      {opportunities.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Directory Opportunities</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {opportunities.slice(0, 6).map((opportunity, index) => (
              <div key={index} className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">{opportunity.name}</h4>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAuthorityBadge(opportunity.authority)}`}>
                    DA {opportunity.authority}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{opportunity.description}</p>
                <button className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors">
                  Create Listing
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Citations List */}
      <div className="space-y-4">
        {filteredCitations.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8">
            <div className="text-center">
              <GlobeAltIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No citations found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Add your first local business citation to improve your local search presence.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Add First Citation
                </button>
              </div>
            </div>
          </div>
        ) : (
          filteredCitations.map((citation) => (
            <div key={citation.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="flex items-center space-x-2">
                      <GlobeAltIcon className="h-5 w-5 text-teal-500" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {citation.directory_name}
                      </h3>
                    </div>
                    {getStatusBadge(citation.status)}
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAuthorityBadge(citation.authority_score)}`}>
                      Authority {citation.authority_score}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <BuildingStorefrontIcon className="h-4 w-4" />
                        <span>{citation.business_name}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <MapPinIcon className="h-4 w-4" />
                        <span>{citation.address}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <PhoneIcon className="h-4 w-4" />
                        <span>{citation.phone}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <ClockIcon className="h-4 w-4" />
                        <span>Verified {formatDate(citation.last_verified)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Accuracy:</span>
                        <span className={`font-semibold ${getAccuracyColor(citation.accuracy_score)}`}>
                          {citation.accuracy_score}%
                        </span>
                      </div>
                      {citation.issues.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-600 dark:text-red-400">
                            {citation.issues.length} issue{citation.issues.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {citation.issues.length > 0 && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Issues Found:</h4>
                      <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                        {citation.issues.map((issue, index) => (
                          <li key={index} className="flex items-center space-x-2">
                            <ExclamationTriangleIcon className="h-3 w-3" />
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {citation.listing_url && (
                    <a
                      href={citation.listing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="View Listing"
                    >
                      <LinkIcon className="h-5 w-5" />
                    </a>
                  )}
                  <button
                    onClick={() => handleVerifyCitation(citation.id)}
                    disabled={verifying.has(citation.id)}
                    className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors disabled:opacity-50"
                    title="Verify Citation"
                  >
                    <CheckCircleIcon className={`h-5 w-5 ${verifying.has(citation.id) ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => {/* Edit citation */}}
                    className="p-2 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                    title="Edit Citation"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCitation(citation.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete Citation"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
