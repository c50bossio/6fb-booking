'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { format, addMinutes, isSameHour, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  FreshaColors, 
  FreshaTypography, 
  FreshaSpacing,
  FreshaBorderRadius,
  FreshaShadows
} from '@/lib/fresha-design-system'
import {
  SmartSchedulingEngine,
  TimeSlotRecommendation,
  OptimizationFactor,
  createSmartSchedulingEngine
} from '@/lib/ai-scheduling-engine'
import {
  SparklesIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  UserGroupIcon,
  BoltIcon,
  StarIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface SmartTimeSuggestionsProps {
  selectedDate: Date
  serviceName: string
  serviceDuration: number
  barberId?: number
  clientId?: number
  appointments: any[]
  availability: any[]
  onTimeSlotSelect: (timeSlot: TimeSlotRecommendation) => void
  className?: string
}

interface OptimizationFactorDisplayProps {
  factor: OptimizationFactor
}

const OptimizationFactorDisplay: React.FC<OptimizationFactorDisplayProps> = ({ factor }) => {
  const getFactorIcon = (factorType: string) => {
    switch (factorType) {
      case 'client_preference':
        return <UserGroupIcon className="h-4 w-4" />
      case 'revenue_potential':
        return <CurrencyDollarIcon className="h-4 w-4" />
      case 'efficiency':
        return <BoltIcon className="h-4 w-4" />
      case 'peak_demand':
        return <TrophyIcon className="h-4 w-4" />
      case 'barber_preference':
        return <ClockIcon className="h-4 w-4" />
      case 'six_fb_compliance':
        return <StarIcon className="h-4 w-4" />
      default:
        return <InformationCircleIcon className="h-4 w-4" />
    }
  }

  const getFactorColor = (score: number) => {
    if (score >= 90) return FreshaColors.semantic.success
    if (score >= 70) return FreshaColors.premium.gold
    if (score >= 50) return FreshaColors.primary[500]
    return FreshaColors.neutral[400]
  }

  const getFactorLabel = (factorType: string) => {
    const labels = {
      'client_preference': 'Client Fit',
      'revenue_potential': 'Revenue',
      'efficiency': 'Efficiency',
      'peak_demand': 'Demand',
      'barber_preference': 'Barber Fit',
      'six_fb_compliance': '6FB Alignment'
    }
    return labels[factorType] || factorType
  }

  return (
    <div className="flex items-center space-x-2 text-xs">
      <div 
        className="flex items-center space-x-1 px-2 py-1 rounded-full"
        style={{ 
          backgroundColor: `${getFactorColor(factor.score)}15`,
          color: getFactorColor(factor.score)
        }}
      >
        {getFactorIcon(factor.factor)}
        <span className="font-medium">{getFactorLabel(factor.factor)}</span>
        <span className="font-bold">{Math.round(factor.score)}%</span>
      </div>
    </div>
  )
}

interface TimeSlotCardProps {
  recommendation: TimeSlotRecommendation
  isSelected: boolean
  onSelect: () => void
  rank: number
}

const TimeSlotCard: React.FC<TimeSlotCardProps> = ({ 
  recommendation, 
  isSelected, 
  onSelect,
  rank 
}) => {
  const [showDetails, setShowDetails] = useState(false)

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return FreshaColors.semantic.success
    if (confidence >= 75) return FreshaColors.premium.gold
    if (confidence >= 60) return FreshaColors.primary[500]
    return FreshaColors.neutral[400]
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 90) return 'Excellent Match'
    if (confidence >= 75) return 'Great Match'
    if (confidence >= 60) return 'Good Match'
    return 'Fair Match'
  }

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1: return FreshaColors.premium.gold
      case 2: return FreshaColors.neutral[400]
      case 3: return FreshaColors.premium.bronze
      default: return FreshaColors.neutral[300]
    }
  }

  const formatTimeRange = () => {
    return `${format(recommendation.start_time, 'h:mm a')} - ${format(recommendation.end_time, 'h:mm a')}`
  }

  const topFactors = recommendation.optimization_factors
    .sort((a, b) => (b.score * b.weight) - (a.score * a.weight))
    .slice(0, 3)

  return (
    <Card 
      className={`
        relative transition-all duration-200 cursor-pointer group
        ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}
      `}
      onClick={onSelect}
      style={{
        borderColor: isSelected ? FreshaColors.primary[500] : FreshaColors.neutral[200],
        backgroundColor: isSelected ? `${FreshaColors.primary[50]}` : 'white'
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Rank Badge */}
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: getRankBadgeColor(rank) }}
            >
              {rank}
            </div>
            
            {/* Time Display */}
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {formatTimeRange()}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {format(recommendation.start_time, 'EEEE, MMM d')}
              </p>
            </div>
          </div>

          {/* AI Sparkles Icon */}
          <div className="flex items-center space-x-2">
            <SparklesIcon 
              className="h-5 w-5"
              style={{ color: FreshaColors.premium.gold }}
            />
            {isSelected && (
              <CheckCircleIcon 
                className="h-5 w-5"
                style={{ color: FreshaColors.semantic.success }}
              />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Confidence Score */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Badge 
              className="px-3 py-1 font-medium"
              style={{ 
                backgroundColor: `${getConfidenceColor(recommendation.confidence_score)}15`,
                color: getConfidenceColor(recommendation.confidence_score),
                border: `1px solid ${getConfidenceColor(recommendation.confidence_score)}30`
              }}
            >
              {recommendation.confidence_score}% {getConfidenceLabel(recommendation.confidence_score)}
            </Badge>
          </div>
          
          {/* Revenue Potential */}
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <CurrencyDollarIcon className="h-4 w-4" />
            <span className="font-medium">${recommendation.revenue_potential}</span>
          </div>
        </div>

        {/* Optimization Factors */}
        <div className="space-y-2 mb-4">
          {topFactors.map((factor, index) => (
            <OptimizationFactorDisplay key={index} factor={factor} />
          ))}
        </div>

        {/* AI Reasoning */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            <SparklesIcon className="h-4 w-4 inline mr-1 text-blue-500" />
            {recommendation.reasoning}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setShowDetails(!showDetails)
            }}
            className="text-xs"
          >
            {showDetails ? 'Less Details' : 'More Details'}
          </Button>

          <Button
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200"
          >
            Select Time
          </Button>
        </div>

        {/* Detailed Factors (Expandable) */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">
              Detailed Analysis
            </h4>
            <div className="space-y-3">
              {recommendation.optimization_factors.map((factor, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    {getFactorIcon(factor.factor)}
                    <span className="font-medium">{factor.description}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500">Weight: {Math.round(factor.weight * 100)}%</span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(factor.score)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  function getFactorIcon(factorType: string) {
    switch (factorType) {
      case 'client_preference':
        return <UserGroupIcon className="h-4 w-4" />
      case 'revenue_potential':
        return <CurrencyDollarIcon className="h-4 w-4" />
      case 'efficiency':
        return <BoltIcon className="h-4 w-4" />
      case 'peak_demand':
        return <TrophyIcon className="h-4 w-4" />
      case 'barber_preference':
        return <ClockIcon className="h-4 w-4" />
      case 'six_fb_compliance':
        return <StarIcon className="h-4 w-4" />
      default:
        return <InformationCircleIcon className="h-4 w-4" />
    }
  }
}

export const SmartTimeSuggestions: React.FC<SmartTimeSuggestionsProps> = ({
  selectedDate,
  serviceName,
  serviceDuration,
  barberId,
  clientId,
  appointments,
  availability,
  onTimeSlotSelect,
  className = ''
}) => {
  const [selectedRecommendation, setSelectedRecommendation] = useState<TimeSlotRecommendation | null>(null)
  const [showAllRecommendations, setShowAllRecommendations] = useState(false)

  // Initialize AI scheduling engine
  const schedulingEngine = useMemo(() => {
    return createSmartSchedulingEngine(appointments, availability)
  }, [appointments, availability])

  // Generate AI recommendations
  const recommendations = useMemo(() => {
    if (!selectedDate || !serviceName || !serviceDuration) {
      return []
    }

    return schedulingEngine.generateTimeSlotRecommendations(
      selectedDate,
      serviceName,
      serviceDuration,
      barberId,
      clientId
    )
  }, [selectedDate, serviceName, serviceDuration, barberId, clientId, schedulingEngine])

  const handleTimeSlotSelect = useCallback((recommendation: TimeSlotRecommendation) => {
    setSelectedRecommendation(recommendation)
    onTimeSlotSelect(recommendation)
  }, [onTimeSlotSelect])

  const displayedRecommendations = showAllRecommendations 
    ? recommendations 
    : recommendations.slice(0, 3)

  if (recommendations.length === 0) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <SparklesIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No AI Recommendations Available
            </h3>
            <p className="text-gray-500 text-sm">
              Select a date, service, and duration to see intelligent time slot suggestions.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
            <SparklesIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              AI-Powered Time Suggestions
            </h3>
            <p className="text-sm text-gray-600">
              Optimized for revenue, client satisfaction, and Six Figure Barber methodology
            </p>
          </div>
        </div>

        {/* Statistics */}
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <TrophyIcon className="h-4 w-4" />
            <span>{recommendations.length} suggestions</span>
          </div>
          <div className="flex items-center space-x-1">
            <StarIcon className="h-4 w-4" />
            <span>Avg. {Math.round(recommendations.reduce((sum, r) => sum + r.confidence_score, 0) / recommendations.length)}% match</span>
          </div>
        </div>
      </div>

      {/* Recommendations Grid */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {displayedRecommendations.map((recommendation, index) => (
          <TimeSlotCard
            key={`${format(recommendation.start_time, 'HH:mm')}-${index}`}
            recommendation={recommendation}
            isSelected={selectedRecommendation?.start_time.getTime() === recommendation.start_time.getTime()}
            onSelect={() => handleTimeSlotSelect(recommendation)}
            rank={index + 1}
          />
        ))}
      </div>

      {/* Show More/Less Button */}
      {recommendations.length > 3 && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => setShowAllRecommendations(!showAllRecommendations)}
            className="px-6 py-2"
          >
            {showAllRecommendations 
              ? `Show Less (${recommendations.length - 3} more)` 
              : `Show All ${recommendations.length} Suggestions`
            }
          </Button>
        </div>
      )}

      {/* AI Insights Summary */}
      {selectedRecommendation && (
        <Card className="border-l-4 border-l-blue-500 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-full bg-blue-100">
                <SparklesIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-2">
                  Selected: {format(selectedRecommendation.start_time, 'h:mm a')} - {format(selectedRecommendation.end_time, 'h:mm a')}
                </h4>
                <p className="text-sm text-blue-800 mb-3">
                  {selectedRecommendation.reasoning}
                </p>
                <div className="flex items-center space-x-4 text-xs text-blue-700">
                  <div className="flex items-center space-x-1">
                    <TrophyIcon className="h-4 w-4" />
                    <span>{selectedRecommendation.confidence_score}% Confidence</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CurrencyDollarIcon className="h-4 w-4" />
                    <span>${selectedRecommendation.revenue_potential} Revenue Potential</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Six Figure Barber Methodology Notice */}
      <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-full bg-amber-100">
              <StarIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-amber-900 mb-2">
                Six Figure Barber Methodology
              </h4>
              <p className="text-sm text-amber-800 leading-relaxed">
                These AI recommendations prioritize premium positioning, client value creation, 
                and revenue optimization aligned with Six Figure Barber principles. Each suggestion 
                considers factors like client preferences, peak demand periods, and service profitability 
                to help you build a six-figure barbering business.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SmartTimeSuggestions