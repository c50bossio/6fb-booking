'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MapPinIcon,
  StarIcon,
  TrophyIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  BuildingStorefrontIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  GlobeAltIcon,
  PhoneIcon,
  EnvelopeIcon,
  ShareIcon,
  LinkIcon,
  UserGroupIcon,
  TagIcon,
  CameraIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import {
  googleBusinessAPI,
  seoOptimizationAPI,
  reviewManagementAPI,
  keywordTrackingAPI,
  citationManagementAPI,
  seoAnalyticsAPI,
  schemaMarkupAPI,
  localSEOHealthAPI,
  GoogleBusinessProfile,
  SEOOptimization,
  ReviewData,
  LocalKeyword,
  LocalCitation,
  SEOAnalytics,
  SchemaMarkup
} from '@/lib/api/local-seo'
import GoogleBusinessManager from '@/components/seo/GoogleBusinessManager'
import SEOOptimizationChecker from '@/components/seo/SEOOptimizationChecker'
import ReviewManager from '@/components/seo/ReviewManager'
import KeywordTracker from '@/components/seo/KeywordTracker'
import CitationManager from '@/components/seo/CitationManager'
import SEOAnalyticsDashboard from '@/components/seo/SEOAnalyticsDashboard'
import SchemaMarkupManager from '@/components/seo/SchemaMarkupManager'

interface TabItem {
  id: string
  name: string
  count: number
  icon: React.ComponentType<any>
}

export default function LocalSEOPage() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  // Data state
  const [googleProfile, setGoogleProfile] = useState<GoogleBusinessProfile | null>(null)
  const [seoOptimization, setSeoOptimization] = useState<SEOOptimization | null>(null)
  const [reviews, setReviews] = useState<ReviewData[]>([])
  const [keywords, setKeywords] = useState<LocalKeyword[]>([])
  const [citations, setCitations] = useState<LocalCitation[]>([])
  const [schemas, setSchemas] = useState<SchemaMarkup[]>([])
  const [analytics, setAnalytics] = useState<SEOAnalytics | null>(null)

  const tabs: TabItem[] = [
    { id: 'overview', name: 'Overview', count: 0, icon: ChartBarIcon },
    { id: 'google-business', name: 'Google Business', count: 0, icon: BuildingStorefrontIcon },
    { id: 'optimization', name: 'SEO Score', count: seoOptimization?.recommendations?.length || 0, icon: TrophyIcon },
    { id: 'reviews', name: 'Reviews', count: reviews.filter(r => r.status === 'new').length, icon: StarIcon },
    { id: 'keywords', name: 'Keywords', count: keywords.length, icon: TagIcon },
    { id: 'citations', name: 'Citations', count: citations.length, icon: GlobeAltIcon },
    { id: 'schema', name: 'Schema', count: schemas.length, icon: DocumentTextIcon }
  ]

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadGoogleProfile(),
        loadSEOOptimization(),
        loadReviews(),
        loadKeywords(),
        loadCitations(),
        loadSchemas(),
        loadAnalytics()
      ])
    } catch (error) {
      console.error('Error loading Local SEO data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadGoogleProfile = async () => {
    try {
      const response = await googleBusinessAPI.getProfile()
      if (response.success) {
        setGoogleProfile(response.profile)
      }
    } catch (error) {
      console.error('Error loading Google Business profile:', error)
    }
  }

  const loadSEOOptimization = async () => {
    try {
      const response = await seoOptimizationAPI.getOptimizationData()
      if (response.success) {
        setSeoOptimization(response.optimization)
      }
    } catch (error) {
      console.error('Error loading SEO optimization data:', error)
    }
  }

  const loadReviews = async () => {
    try {
      const response = await reviewManagementAPI.getReviews()
      if (response.success) {
        setReviews(response.reviews)
      }
    } catch (error) {
      console.error('Error loading reviews:', error)
    }
  }

  const loadKeywords = async () => {
    try {
      const response = await keywordTrackingAPI.getKeywords()
      if (response.success) {
        setKeywords(response.keywords)
      }
    } catch (error) {
      console.error('Error loading keywords:', error)
    }
  }

  const loadCitations = async () => {
    try {
      const response = await citationManagementAPI.getCitations()
      if (response.success) {
        setCitations(response.citations)
      }
    } catch (error) {
      console.error('Error loading citations:', error)
    }
  }

  const loadSchemas = async () => {
    try {
      const response = await schemaMarkupAPI.getSchemas()
      if (response.success) {
        setSchemas(response.schemas)
      }
    } catch (error) {
      console.error('Error loading schemas:', error)
    }
  }

  const loadAnalytics = async () => {
    try {
      const response = await seoAnalyticsAPI.getAnalytics()
      if (response.success) {
        setAnalytics(response.analytics)
      }
    } catch (error) {
      console.error('Error loading SEO analytics:', error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAllData()
    setRefreshing(false)
  }

  const handleRunSEOAudit = async () => {
    try {
      await seoOptimizationAPI.runAudit()
      await loadSEOOptimization()
    } catch (error) {
      console.error('Error running SEO audit:', error)
    }
  }

  const handleSyncGoogleBusiness = async () => {
    try {
      await googleBusinessAPI.syncWithGoogle()
      await loadGoogleProfile()
    } catch (error) {
      console.error('Error syncing Google Business:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'text-green-600 dark:text-green-400'
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBadge = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'bg-green-500/10 text-green-600 border-green-500/20'
    if (percentage >= 60) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
    return 'bg-red-500/10 text-red-600 border-red-500/20'
  }

  const getPriorityBadge = (priority: string) => {
    const styles = {
      high: 'bg-red-500/10 text-red-600 border-red-500/20',
      medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      low: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
    }
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${styles[priority as keyof typeof styles]}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    )
  }

  const getVerificationBadge = (status: string) => {
    const styles = {
      verified: 'bg-green-500/10 text-green-600 border-green-500/20',
      unverified: 'bg-red-500/10 text-red-600 border-red-500/20',
      pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
    }
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Local SEO dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Local SEO Management
              </h1>
              <p className="text-gray-700 dark:text-gray-300">
                Optimize your barbershop's local search presence and visibility
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={handleRunSEOAudit}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg font-medium hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 shadow-lg"
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
                <span>Run SEO Audit</span>
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl">
                  <TrophyIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">SEO Score</p>
              <p className={`text-2xl font-bold ${seoOptimization ? getScoreColor(seoOptimization.current_score, seoOptimization.max_score) : 'text-gray-900 dark:text-white'}`}>
                {seoOptimization ? `${seoOptimization.current_score}/${seoOptimization.max_score}` : 'N/A'}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl">
                  <StarIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Review Rating</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 'N/A'}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                  <ChartBarIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Search Impressions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics?.overview.total_impressions?.toLocaleString() || 'N/A'}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                  <MapPinIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Citations</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {citations.filter(c => c.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => {
                const IconComponent = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    <IconComponent className="h-5 w-5" />
                    <span>{tab.name}</span>
                    {tab.count > 0 && (
                      <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-300">
                        {tab.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* SEO Analytics Dashboard */}
            <SEOAnalyticsDashboard
              analytics={analytics}
              onAnalyticsUpdate={loadAnalytics}
            />

            {/* SEO Health Summary */}
            {seoOptimization && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">SEO Health Summary</h3>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getScoreBadge(seoOptimization.current_score, seoOptimization.max_score)}`}>
                      {Math.round((seoOptimization.current_score / seoOptimization.max_score) * 100)}% Optimized
                    </span>
                    <button
                      onClick={() => setActiveTab('optimization')}
                      className="text-teal-600 dark:text-teal-400 text-sm font-medium hover:underline"
                    >
                      View Details
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {Object.entries(seoOptimization.local_seo_factors).slice(0, 6).map(([factor, score]) => (
                    <div key={factor} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                          {factor.replace(/_/g, ' ')}
                        </p>
                        <span className={`text-sm font-semibold ${getScoreColor(score, 100)}`}>
                          {score}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-teal-500 to-cyan-600 h-2 rounded-full"
                          style={{ width: `${score}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Top Priority Recommendations */}
                {seoOptimization.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                      Top Priority Actions ({seoOptimization.recommendations.filter(r => r.priority === 'high').length} high priority)
                    </h4>
                    <div className="space-y-3">
                      {seoOptimization.recommendations.filter(r => r.priority === 'high').slice(0, 3).map((rec, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{rec.title}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{rec.description}</p>
                          </div>
                          <div className="flex items-center space-x-3">
                            {getPriorityBadge(rec.priority)}
                            <span className="text-sm font-medium text-teal-600 dark:text-teal-400">
                              +{rec.impact_score} pts
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Reviews Summary */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reviews</h3>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className="text-teal-600 dark:text-teal-400 text-sm font-medium hover:underline"
                  >
                    Manage
                  </button>
                </div>

                {reviews.length === 0 ? (
                  <div className="text-center py-4">
                    <StarIcon className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No reviews yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                      </span>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <StarIcon
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length)
                                ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {reviews.length} total reviews • {reviews.filter(r => r.status === 'new').length} need response
                    </p>
                  </div>
                )}
              </div>

              {/* Keywords Summary */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Keywords</h3>
                  <button
                    onClick={() => setActiveTab('keywords')}
                    className="text-teal-600 dark:text-teal-400 text-sm font-medium hover:underline"
                  >
                    Manage
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {keywords.length}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      tracking
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {keywords.filter(k => k.current_ranking && k.current_ranking <= k.target_ranking).length} meeting targets
                  </p>
                </div>
              </div>

              {/* Citations Summary */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Citations</h3>
                  <button
                    onClick={() => setActiveTab('citations')}
                    className="text-teal-600 dark:text-teal-400 text-sm font-medium hover:underline"
                  >
                    Manage
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {citations.filter(c => c.status === 'active').length}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      active
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {citations.length} total citations
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'google-business' && (
          <GoogleBusinessManager
            profile={googleProfile}
            onProfileUpdate={loadGoogleProfile}
          />
        )}

        {activeTab === 'optimization' && (
          <SEOOptimizationChecker
            optimization={seoOptimization}
            onOptimizationUpdate={loadSEOOptimization}
          />
        )}

        {activeTab === 'reviews' && (
          <ReviewManager
            reviews={reviews}
            onReviewsUpdate={loadReviews}
          />
        )}

        {activeTab === 'keywords' && (
          <KeywordTracker
            keywords={keywords}
            onKeywordsUpdate={loadKeywords}
          />
        )}

        {activeTab === 'citations' && (
          <CitationManager
            citations={citations}
            onCitationsUpdate={loadCitations}
          />
        )}

        {activeTab === 'schema' && (
          <SchemaMarkupManager
            schemas={schemas}
            onSchemasUpdate={loadSchemas}
          />
        )}
      </div>
    </div>
  )
}
