'use client'

import { useState } from 'react'
import {
  TrophyIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  LightBulbIcon,
  StarIcon,
  MapPinIcon,
  DocumentTextIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'
import { seoOptimizationAPI, SEOOptimization } from '@/lib/api/local-seo'

interface SEOOptimizationCheckerProps {
  optimization: SEOOptimization | null
  onOptimizationUpdate: () => void
}

export default function SEOOptimizationChecker({ optimization, onOptimizationUpdate }: SEOOptimizationCheckerProps) {
  const [runningAudit, setRunningAudit] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const handleRunAudit = async () => {
    setRunningAudit(true)
    try {
      await seoOptimizationAPI.runAudit()
      onOptimizationUpdate()
    } catch (error) {
      console.error('Error running SEO audit:', error)
    } finally {
      setRunningAudit(false)
    }
  }

  const handleUpdateRecommendation = async (recommendationId: string, status: string) => {
    try {
      await seoOptimizationAPI.updateRecommendationStatus(recommendationId, status)
      onOptimizationUpdate()
    } catch (error) {
      console.error('Error updating recommendation:', error)
    }
  }

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'text-green-600 dark:text-green-400'
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreGradient = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'from-green-500 to-emerald-600'
    if (percentage >= 60) return 'from-yellow-500 to-orange-600'
    return 'from-red-500 to-pink-600'
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      case 'medium':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      case 'low':
        return <LightBulbIcon className="h-5 w-5 text-blue-500" />
      default:
        return <LightBulbIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'in_progress':
        return <ArrowPathIcon className="h-5 w-5 text-blue-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'google business profile':
        return <StarIcon className="h-5 w-5" />
      case 'local citations':
        return <MapPinIcon className="h-5 w-5" />
      case 'schema markup':
        return <DocumentTextIcon className="h-5 w-5" />
      case 'website optimization':
        return <GlobeAltIcon className="h-5 w-5" />
      default:
        return <ChartBarIcon className="h-5 w-5" />
    }
  }

  const groupRecommendationsByCategory = (recommendations: any[]) => {
    return recommendations.reduce((groups, rec) => {
      const category = rec.category || 'General'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(rec)
      return groups
    }, {} as Record<string, any[]>)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (!optimization) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8">
        <div className="text-center">
          <TrophyIcon className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            SEO Audit Not Available
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Run your first SEO audit to get personalized recommendations and track your optimization progress.
          </p>
          <button
            onClick={handleRunAudit}
            disabled={runningAudit}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg font-medium hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 shadow-lg disabled:opacity-50"
          >
            <MagnifyingGlassIcon className={`h-5 w-5 mr-2 ${runningAudit ? 'animate-spin' : ''}`} />
            {runningAudit ? 'Running Audit...' : 'Run SEO Audit'}
          </button>
        </div>
      </div>
    )
  }

  const categoryGroups = groupRecommendationsByCategory(optimization.recommendations)
  const overallPercentage = Math.round((optimization.current_score / optimization.max_score) * 100)

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className={`p-4 bg-gradient-to-br ${getScoreGradient(optimization.current_score, optimization.max_score)} rounded-xl`}>
              <TrophyIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">SEO Optimization Score</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Last audited: {formatDate(optimization.last_audit_date)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${getScoreColor(optimization.current_score, optimization.max_score)}`}>
              {overallPercentage}%
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {optimization.current_score} / {optimization.max_score} points
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {Object.entries(optimization.local_seo_factors).map(([factor, score]) => (
            <div key={factor} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getCategoryIcon(factor)}
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {factor.replace(/_/g, ' ')}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${getScoreColor(score, 100)}`}>
                  {score}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`bg-gradient-to-r ${getScoreGradient(score, 100)} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${score}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Next audit scheduled: {formatDate(optimization.next_audit_date)}
          </div>
          <button
            onClick={handleRunAudit}
            disabled={runningAudit}
            className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${runningAudit ? 'animate-spin' : ''}`} />
            <span>{runningAudit ? 'Running...' : 'Run New Audit'}</span>
          </button>
        </div>
      </div>

      {/* Recommendations by Category */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Optimization Recommendations ({optimization.recommendations.length})
        </h3>

        <div className="space-y-4">
          {Object.entries(categoryGroups).map(([category, recommendations]) => (
            <div key={category} className="border border-gray-200 dark:border-gray-700 rounded-lg">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
              >
                <div className="flex items-center space-x-3">
                  {getCategoryIcon(category)}
                  <span className="font-medium text-gray-900 dark:text-white">{category}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({recommendations.length} {recommendations.length === 1 ? 'item' : 'items'})
                  </span>
                </div>
                <ChartBarIcon className={`h-5 w-5 text-gray-400 transform transition-transform ${expandedCategories.has(category) ? 'rotate-180' : ''}`} />
              </button>

              {expandedCategories.has(category) && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-3">
                    {recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start space-x-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex-shrink-0 mt-1">
                          {getPriorityIcon(rec.priority)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">{rec.title}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{rec.description}</p>
                              <div className="flex items-center space-x-4 mt-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  rec.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                  rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                                  'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                }`}>
                                  {rec.priority} priority
                                </span>
                                <span className="text-sm text-teal-600 dark:text-teal-400 font-medium">
                                  +{rec.impact_score} impact points
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              {getStatusIcon(rec.status)}
                              <select
                                value={rec.status}
                                onChange={(e) => handleUpdateRecommendation(rec.id || `${category}-${index}`, e.target.value)}
                                className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {optimization.recommendations.length === 0 && (
          <div className="text-center py-8">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              All Optimizations Complete!
            </h4>
            <p className="text-gray-600 dark:text-gray-400">
              Your local SEO is fully optimized. Run another audit to check for new opportunities.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
