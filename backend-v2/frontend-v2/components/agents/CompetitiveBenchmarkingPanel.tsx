'use client'

import React from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { 
  TrendingUp, 
  TrendingDown,
  Trophy,
  Target,
  Zap,
  BarChart3,
  Clock,
  DollarSign,
  Users,
  ArrowRight,
  Award,
  Flame,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { 
  AgentAnalytics,
  agentsApi 
} from '@/lib/api/agents'

interface CompetitiveBenchmarkingPanelProps {
  data: AgentAnalytics
}

export function CompetitiveBenchmarkingPanel({ data }: CompetitiveBenchmarkingPanelProps) {
  const benchmarks = data.competitive_benchmarks
  const industryAvg = benchmarks.industry_averages
  const topQuartile = benchmarks.top_quartile

  // Performance calculations
  const getPerformanceScore = (yourValue: number, industryAvg: number, topQuartile: number, higherIsBetter: boolean = true) => {
    if (!higherIsBetter) {
      // For metrics like response time where lower is better
      if (yourValue <= topQuartile) return { score: 100, tier: 'excellent' }
      if (yourValue <= industryAvg) return { score: 80, tier: 'above_average' }
      if (yourValue <= industryAvg * 1.2) return { score: 60, tier: 'average' }
      return { score: 40, tier: 'below_average' }
    } else {
      // For metrics where higher is better
      if (yourValue >= topQuartile) return { score: 100, tier: 'excellent' }
      if (yourValue >= industryAvg) return { score: 80, tier: 'above_average' }
      if (yourValue >= industryAvg * 0.8) return { score: 60, tier: 'average' }
      return { score: 40, tier: 'below_average' }
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'excellent': return 'text-green-600'
      case 'above_average': return 'text-blue-600'
      case 'average': return 'text-yellow-600'
      case 'below_average': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'excellent': return <Trophy className="w-4 h-4" />
      case 'above_average': return <TrendingUp className="w-4 h-4" />
      case 'average': return <Target className="w-4 h-4" />
      case 'below_average': return <TrendingDown className="w-4 h-4" />
      default: return <BarChart3 className="w-4 h-4" />
    }
  }

  const getBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'excellent': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'above_average': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'average': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'below_average': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  // Calculate individual performance scores
  const successRateScore = getPerformanceScore(data.success_rate, industryAvg.success_rate, topQuartile.success_rate)
  const responseTimeScore = getPerformanceScore(data.average_response_time, industryAvg.avg_response_time, topQuartile.avg_response_time, false)
  const roiScore = getPerformanceScore(data.roi, industryAvg.roi, topQuartile.roi)
  
  // Mock engagement rate for demonstration
  const mockEngagementRate = 72.5
  const engagementScore = getPerformanceScore(mockEngagementRate, industryAvg.engagement_rate, topQuartile.engagement_rate)

  // Overall performance ranking
  const overallScore = Math.round((successRateScore.score + responseTimeScore.score + roiScore.score + engagementScore.score) / 4)
  const getRankingPosition = (score: number) => {
    if (score >= 90) return { position: 'Top 10%', icon: '🏆', color: 'text-yellow-600' }
    if (score >= 80) return { position: 'Top 25%', icon: '🥇', color: 'text-green-600' }
    if (score >= 60) return { position: 'Top 50%', icon: '🥈', color: 'text-blue-600' }
    return { position: 'Bottom 50%', icon: '📈', color: 'text-red-600' }
  }

  const ranking = getRankingPosition(overallScore)

  // Improvement opportunities
  const getImprovementOpportunities = () => {
    const opportunities = []
    
    if (successRateScore.tier === 'below_average') {
      opportunities.push({
        metric: 'Success Rate',
        current: agentsApi.formatPercentage(data.success_rate),
        target: agentsApi.formatPercentage(topQuartile.success_rate),
        gain: `+${(topQuartile.success_rate - data.success_rate).toFixed(1)}%`,
        priority: 'high'
      })
    }
    
    if (responseTimeScore.tier === 'below_average') {
      opportunities.push({
        metric: 'Response Time',
        current: agentsApi.formatResponseTime(data.average_response_time),
        target: agentsApi.formatResponseTime(topQuartile.avg_response_time),
        gain: `-${(data.average_response_time - topQuartile.avg_response_time).toFixed(1)}s`,
        priority: 'medium'
      })
    }
    
    if (roiScore.tier === 'below_average') {
      opportunities.push({
        metric: 'ROI',
        current: `${data.roi.toFixed(1)}x`,
        target: `${topQuartile.roi.toFixed(1)}x`,
        gain: `+${(topQuartile.roi - data.roi).toFixed(1)}x`,
        priority: 'high'
      })
    }

    return opportunities
  }

  const improvements = getImprovementOpportunities()

  return (
    <div className="space-y-6">
      {/* Overall Competitive Position */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Competitive Ranking
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your AI agents vs. industry standards
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${ranking.color} mb-1`}>
              {ranking.icon} {ranking.position}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Overall Performance Score: {overallScore}/100
            </p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Performance vs Industry
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {overallScore}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-1000"
              style={{ width: `${overallScore}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Industry Bottom</span>
            <span>Average</span>
            <span>Top Quartile</span>
          </div>
        </div>
      </Card>

      {/* Individual Metric Comparisons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Success Rate Benchmark */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-green-600" />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Success Rate
              </h4>
            </div>
            <Badge className={getBadgeVariant(successRateScore.tier)}>
              {successRateScore.tier.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {agentsApi.formatPercentage(data.success_rate)}
              </span>
              <div className={`flex items-center space-x-1 ${getTierColor(successRateScore.tier)}`}>
                {getTierIcon(successRateScore.tier)}
                <span className="text-sm font-medium">Your Rate</span>
              </div>
            </div>
            
            {/* Comparison bars */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Top Quartile</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {agentsApi.formatPercentage(topQuartile.success_rate)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${(topQuartile.success_rate / 100) * 100}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Industry Average</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {agentsApi.formatPercentage(industryAvg.success_rate)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${(industryAvg.success_rate / 100) * 100}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Your Performance</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {agentsApi.formatPercentage(data.success_rate)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    successRateScore.tier === 'excellent' ? 'bg-green-600' :
                    successRateScore.tier === 'above_average' ? 'bg-blue-600' :
                    successRateScore.tier === 'average' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${(data.success_rate / 100) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Response Time Benchmark */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Response Time
              </h4>
            </div>
            <Badge className={getBadgeVariant(responseTimeScore.tier)}>
              {responseTimeScore.tier.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {agentsApi.formatResponseTime(data.average_response_time)}
              </span>
              <div className={`flex items-center space-x-1 ${getTierColor(responseTimeScore.tier)}`}>
                {getTierIcon(responseTimeScore.tier)}
                <span className="text-sm font-medium">Your Time</span>
              </div>
            </div>
            
            {/* Visual indicators for response time (inverted since lower is better) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Top Quartile (Best)</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  ≤ {agentsApi.formatResponseTime(topQuartile.avg_response_time)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Industry Average</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {agentsApi.formatResponseTime(industryAvg.avg_response_time)}
                </span>
              </div>
              
              <div className="text-center py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <div className={`text-lg font-bold ${getTierColor(responseTimeScore.tier)}`}>
                  {data.average_response_time <= topQuartile.avg_response_time && (
                    <div className="flex items-center justify-center space-x-2 text-green-600">
                      <Zap className="w-5 h-5" />
                      <span>Lightning Fast! 🚀</span>
                    </div>
                  )}
                  {data.average_response_time > topQuartile.avg_response_time && data.average_response_time <= industryAvg.avg_response_time && (
                    <div className="flex items-center justify-center space-x-2 text-blue-600">
                      <ChevronUp className="w-5 h-5" />
                      <span>Above Average</span>
                    </div>
                  )}
                  {data.average_response_time > industryAvg.avg_response_time && (
                    <div className="flex items-center justify-center space-x-2 text-red-600">
                      <ChevronDown className="w-5 h-5" />
                      <span>Room for Improvement</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ROI Benchmark */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Return on Investment
              </h4>
            </div>
            <Badge className={getBadgeVariant(roiScore.tier)}>
              {roiScore.tier.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.roi.toFixed(1)}x
              </span>
              <div className={`flex items-center space-x-1 ${getTierColor(roiScore.tier)}`}>
                {getTierIcon(roiScore.tier)}
                <span className="text-sm font-medium">Your ROI</span>
              </div>
            </div>
            
            {/* ROI comparison chart */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">Revenue Multiplier</span>
                <span className="text-gray-900 dark:text-white font-medium">vs Competition</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <span className="text-xs w-16 text-gray-600 dark:text-gray-400">Top 25%</span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded h-2">
                    <div className="bg-green-500 h-2 rounded" style={{ width: '100%' }} />
                  </div>
                  <span className="text-xs w-12 text-gray-900 dark:text-white">
                    {topQuartile.roi.toFixed(1)}x
                  </span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className="text-xs w-16 text-gray-600 dark:text-gray-400">Average</span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded h-2">
                    <div className="bg-blue-500 h-2 rounded" style={{ width: `${(industryAvg.roi / topQuartile.roi) * 100}%` }} />
                  </div>
                  <span className="text-xs w-12 text-gray-900 dark:text-white">
                    {industryAvg.roi.toFixed(1)}x
                  </span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className="text-xs w-16 text-gray-600 dark:text-gray-400">You</span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded h-2">
                    <div 
                      className={`h-2 rounded ${
                        data.roi >= topQuartile.roi ? 'bg-green-600' :
                        data.roi >= industryAvg.roi ? 'bg-blue-600' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((data.roi / topQuartile.roi) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs w-12 text-gray-900 dark:text-white font-bold">
                    {data.roi.toFixed(1)}x
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Engagement Rate Benchmark */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-purple-600" />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Engagement Rate
              </h4>
            </div>
            <Badge className={getBadgeVariant(engagementScore.tier)}>
              {engagementScore.tier.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {mockEngagementRate.toFixed(1)}%
              </span>
              <div className={`flex items-center space-x-1 ${getTierColor(engagementScore.tier)}`}>
                {getTierIcon(engagementScore.tier)}
                <span className="text-sm font-medium">Your Rate</span>
              </div>
            </div>
            
            <div className="relative">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-6 rounded-full flex items-center justify-end pr-2"
                  style={{ width: `${mockEngagementRate}%` }}
                >
                  <span className="text-xs font-medium text-white">You</span>
                </div>
              </div>
              
              {/* Industry markers */}
              <div 
                className="absolute top-0 h-6 w-0.5 bg-blue-400"
                style={{ left: `${industryAvg.engagement_rate}%` }}
                title={`Industry Average: ${industryAvg.engagement_rate}%`}
              />
              <div 
                className="absolute top-0 h-6 w-0.5 bg-green-400"
                style={{ left: `${topQuartile.engagement_rate}%` }}
                title={`Top Quartile: ${topQuartile.engagement_rate}%`}
              />
            </div>
            
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>0%</span>
              <span>Industry Avg ({industryAvg.engagement_rate}%)</span>
              <span>Top 25% ({topQuartile.engagement_rate}%)</span>
              <span>100%</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Improvement Opportunities */}
      {improvements.length > 0 && (
        <Card className="p-6 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Beat the Competition
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Specific targets to reach top quartile performance
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            {improvements.map((improvement, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Badge className={
                      improvement.priority === 'high' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                    }>
                      {improvement.priority.toUpperCase()} PRIORITY
                    </Badge>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {improvement.metric}
                    </h4>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Potential Gain
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      {improvement.gain}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Current: </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {improvement.current}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Target: </span>
                      <span className="font-medium text-green-600">
                        {improvement.target}
                      </span>
                    </div>
                  </div>
                  
                  <Button size="sm" variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-50">
                    Optimize Now
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Performance Summary */}
      <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
              <Award className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Competitive Edge Analysis
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {benchmarks.your_performance_vs_industry}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-3xl font-bold text-green-600 mb-1">
              {overallScore}/100
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Overall Performance
            </p>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`text-lg font-bold ${getTierColor(successRateScore.tier)} mb-1`}>
              {successRateScore.score}%
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Success Rate</p>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${getTierColor(responseTimeScore.tier)} mb-1`}>
              {responseTimeScore.score}%
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Response Time</p>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${getTierColor(roiScore.tier)} mb-1`}>
              {roiScore.score}%
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">ROI</p>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${getTierColor(engagementScore.tier)} mb-1`}>
              {engagementScore.score}%
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Engagement</p>
          </div>
        </div>
      </Card>
    </div>
  )
}