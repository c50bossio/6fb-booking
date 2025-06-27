'use client'

import { useState } from 'react'
import {
  TagIcon,
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LightBulbIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import { keywordTrackingAPI, LocalKeyword } from '@/lib/api/local-seo'

interface KeywordTrackerProps {
  keywords: LocalKeyword[]
  onKeywordsUpdate: () => void
}

export default function KeywordTracker({ keywords, onKeywordsUpdate }: KeywordTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [checking, setChecking] = useState(false)
  const [newKeyword, setNewKeyword] = useState({
    keyword: '',
    target_ranking: 10,
    location: '',
    device: 'both' as 'desktop' | 'mobile' | 'both'
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyword.keyword.trim() || !newKeyword.location.trim()) return

    try {
      await keywordTrackingAPI.addKeyword({
        ...newKeyword,
        search_volume: 0,
        difficulty: 0,
        trend: 'stable' as const,
        last_checked: new Date().toISOString(),
        ranking_history: []
      })
      setNewKeyword({
        keyword: '',
        target_ranking: 10,
        location: '',
        device: 'both'
      })
      setShowAddForm(false)
      onKeywordsUpdate()
    } catch (error) {
      console.error('Error adding keyword:', error)
    }
  }

  const handleDeleteKeyword = async (keywordId: string) => {
    if (confirm('Are you sure you want to delete this keyword?')) {
      try {
        await keywordTrackingAPI.deleteKeyword(keywordId)
        onKeywordsUpdate()
      } catch (error) {
        console.error('Error deleting keyword:', error)
      }
    }
  }

  const handleCheckRankings = async () => {
    setChecking(true)
    try {
      await keywordTrackingAPI.checkRankings()
      onKeywordsUpdate()
    } catch (error) {
      console.error('Error checking rankings:', error)
    } finally {
      setChecking(false)
    }
  }

  const getSuggestions = async (seed: string) => {
    if (!seed.trim()) {
      setSuggestions([])
      return
    }

    setLoadingSuggestions(true)
    try {
      const response = await keywordTrackingAPI.getKeywordSuggestions(seed)
      if (response.success) {
        setSuggestions(response.suggestions)
      }
    } catch (error) {
      console.error('Error getting suggestions:', error)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const filteredKeywords = keywords.filter(keyword =>
    keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
    keyword.location.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRankingIcon = (current: number | undefined, target: number) => {
    if (!current) return <MinusIcon className="h-4 w-4 text-gray-400" />
    if (current <= target) return <CheckCircleIcon className="h-4 w-4 text-green-500" />
    if (current <= target + 5) return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
    return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <ArrowUpIcon className="h-4 w-4 text-green-500" />
      case 'down':
        return <ArrowDownIcon className="h-4 w-4 text-red-500" />
      default:
        return <MinusIcon className="h-4 w-4 text-gray-400" />
    }
  }

  const getDifficultyBadge = (difficulty: number) => {
    if (difficulty <= 30) return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    if (difficulty <= 60) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
    return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
  }

  const getKeywordStats = () => {
    const totalKeywords = keywords.length
    const rankingKeywords = keywords.filter(k => k.current_ranking && k.current_ranking <= k.target_ranking).length
    const averagePosition = keywords.length > 0
      ? keywords.filter(k => k.current_ranking).reduce((sum, k) => sum + (k.current_ranking || 0), 0) / keywords.filter(k => k.current_ranking).length
      : 0
    const topRankings = keywords.filter(k => k.current_ranking && k.current_ranking <= 3).length

    return {
      totalKeywords,
      rankingKeywords,
      averagePosition: averagePosition.toFixed(1),
      topRankings
    }
  }

  const stats = getKeywordStats()

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl">
              <TagIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Total Keywords</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalKeywords}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
              <TrophyIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Top 3 Rankings</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.topRankings}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Avg. Position</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.averagePosition}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Target Met</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.rankingKeywords}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleCheckRankings}
              disabled={checking}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <ChartBarIcon className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking...' : 'Check Rankings'}</span>
            </button>

            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Add Keyword</span>
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredKeywords.length} of {keywords.length} keywords
        </div>
      </div>

      {/* Add Keyword Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add New Keyword</h3>
          <form onSubmit={handleAddKeyword} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Keyword
                </label>
                <input
                  type="text"
                  value={newKeyword.keyword}
                  onChange={(e) => {
                    setNewKeyword({ ...newKeyword, keyword: e.target.value })
                    getSuggestions(e.target.value)
                  }}
                  placeholder="barber shop near me"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
                {suggestions.length > 0 && (
                  <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Suggestions:</p>
                    <div className="flex flex-wrap gap-1">
                      {suggestions.slice(0, 5).map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setNewKeyword({ ...newKeyword, keyword: suggestion })}
                          className="px-2 py-1 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 rounded text-xs hover:bg-teal-200 dark:hover:bg-teal-800 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={newKeyword.location}
                  onChange={(e) => setNewKeyword({ ...newKeyword, location: e.target.value })}
                  placeholder="New York, NY"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Ranking
                </label>
                <select
                  value={newKeyword.target_ranking}
                  onChange={(e) => setNewKeyword({ ...newKeyword, target_ranking: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {[1, 3, 5, 10, 20].map(pos => (
                    <option key={pos} value={pos}>Top {pos}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Device
                </label>
                <select
                  value={newKeyword.device}
                  onChange={(e) => setNewKeyword({ ...newKeyword, device: e.target.value as 'desktop' | 'mobile' | 'both' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="both">Desktop & Mobile</option>
                  <option value="desktop">Desktop Only</option>
                  <option value="mobile">Mobile Only</option>
                </select>
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
                Add Keyword
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Keywords List */}
      <div className="space-y-4">
        {filteredKeywords.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8">
            <div className="text-center">
              <TagIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No keywords found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Add keywords to start tracking your local search rankings.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Add First Keyword
                </button>
              </div>
            </div>
          </div>
        ) : (
          filteredKeywords.map((keyword) => (
            <div key={keyword.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="flex items-center space-x-2">
                      <TagIcon className="h-5 w-5 text-teal-500" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {keyword.keyword}
                      </h3>
                    </div>
                    {getRankingIcon(keyword.current_ranking, keyword.target_ranking)}
                    {getTrendIcon(keyword.trend)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Current Position</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {keyword.current_ranking ? `#${keyword.current_ranking}` : 'Not ranked'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Target</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        Top {keyword.target_ranking}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Search Volume</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {keyword.search_volume.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Difficulty</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyBadge(keyword.difficulty)}`}>
                        {keyword.difficulty}%
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Location</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {keyword.location}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Device</p>
                      <p className="font-semibold text-gray-900 dark:text-white capitalize">
                        {keyword.device}
                      </p>
                    </div>
                  </div>

                  {keyword.ranking_history.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Recent Rankings</p>
                      <div className="flex items-center space-x-2">
                        {keyword.ranking_history.slice(-7).map((history, index) => (
                          <div
                            key={index}
                            className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center text-xs font-medium"
                            title={`${history.date}: #${history.position}`}
                          >
                            {history.position}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => {/* View details */}}
                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="View Details"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {/* Edit keyword */}}
                    className="p-2 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                    title="Edit Keyword"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteKeyword(keyword.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete Keyword"
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
