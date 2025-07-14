'use client'

import React, { useState, useEffect } from 'react'
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Brain,
  Target,
  Lightbulb,
  Activity,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star,
  Award,
  Rocket,
  Shield,
  Eye,
  RefreshCw,
  Play,
  Pause,
  Settings,
  Download,
  Calendar,
  DollarSign,
  Users,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  TrendingDown as Decline,
  ChevronRight,
  Cpu,
  Database,
  CloudLightning,
  Gauge
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Progress } from '@/components/ui/progress'
import { Modal } from '@/components/ui/Modal'
import { type AgentAnalytics } from '@/lib/api/agents'

interface PredictionModel {
  id: string
  name: string
  type: 'revenue' | 'customer' | 'performance' | 'market'
  status: 'training' | 'ready' | 'updating' | 'error'
  accuracy: number
  last_trained: string
  predictions_made: number
  confidence_threshold: number
  description: string
}

interface Prediction {
  id: string
  model_id: string
  type: 'revenue' | 'customer_behavior' | 'agent_performance' | 'market_trend'
  prediction: any
  confidence: number
  time_horizon: '1_week' | '1_month' | '3_months' | '6_months' | '1_year'
  created_at: string
  status: 'active' | 'monitoring' | 'validated' | 'outdated'
  impact_level: 'low' | 'medium' | 'high' | 'critical'
  recommended_actions: Array<{
    action: string
    priority: 'low' | 'medium' | 'high'
    effort: 'low' | 'medium' | 'high'
    expected_impact: string
    timeline: string
  }>
}

interface AIInsight {
  id: string
  type: 'opportunity' | 'risk' | 'optimization' | 'trend'
  category: 'revenue' | 'customer' | 'operational' | 'marketing'
  title: string
  description: string
  confidence: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  supporting_data: Record<string, any>
  recommended_actions: string[]
  potential_impact: string
  timeline: string
  status: 'new' | 'investigating' | 'implementing' | 'completed'
}

interface PerformancePredictionEngineProps {
  data: AgentAnalytics
  onImplementRecommendation?: (recommendation: any) => void
}

export function PerformancePredictionEngine({ data, onImplementRecommendation }: PerformancePredictionEngineProps) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'predictions' | 'insights' | 'models' | 'recommendations'>('predictions')
  const [predictionModels, setPredictionModels] = useState<PredictionModel[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([])
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null)
  const [generateInsights, setGenerateInsights] = useState(false)

  useEffect(() => {
    loadPredictionData()
  }, [data])

  const loadPredictionData = async () => {
    try {
      setLoading(true)
      
      // Mock AI prediction data
      const mockModels: PredictionModel[] = [
        {
          id: 'revenue-forecaster',
          name: 'Revenue Forecasting Model',
          type: 'revenue',
          status: 'ready',
          accuracy: 94.2,
          last_trained: new Date(Date.now() - 86400000).toISOString(),
          predictions_made: 1247,
          confidence_threshold: 85,
          description: 'Deep learning model for revenue prediction based on booking patterns, seasonality, and market trends'
        },
        {
          id: 'customer-behavior',
          name: 'Customer Behavior Predictor',
          type: 'customer',
          status: 'ready',
          accuracy: 89.8,
          last_trained: new Date(Date.now() - 172800000).toISOString(),
          predictions_made: 2156,
          confidence_threshold: 80,
          description: 'ML model predicting customer lifetime value, churn probability, and booking preferences'
        },
        {
          id: 'agent-optimizer',
          name: 'Agent Performance Optimizer',
          type: 'performance',
          status: 'training',
          accuracy: 91.5,
          last_trained: new Date(Date.now() - 3600000).toISOString(),
          predictions_made: 893,
          confidence_threshold: 88,
          description: 'AI system optimizing agent message timing, content, and targeting for maximum conversion'
        },
        {
          id: 'market-analyzer',
          name: 'Market Trend Analyzer',
          type: 'market',
          status: 'ready',
          accuracy: 87.3,
          last_trained: new Date(Date.now() - 259200000).toISOString(),
          predictions_made: 654,
          confidence_threshold: 82,
          description: 'Advanced analytics for market opportunities, competitive positioning, and growth trends'
        }
      ]

      const mockPredictions: Prediction[] = [
        {
          id: 'revenue-next-month',
          model_id: 'revenue-forecaster',
          type: 'revenue',
          prediction: {
            amount: 42500,
            growth_rate: 18.5,
            confidence_range: { min: 38200, max: 46800 },
            key_drivers: ['Increased rebooking rate', 'Premium service adoption', 'Seasonal demand']
          },
          confidence: 94.2,
          time_horizon: '1_month',
          created_at: new Date().toISOString(),
          status: 'active',
          impact_level: 'high',
          recommended_actions: [
            {
              action: 'Increase premium service marketing to capitalize on growing demand',
              priority: 'high',
              effort: 'medium',
              expected_impact: '+$3,200 additional revenue',
              timeline: '2 weeks'
            },
            {
              action: 'Optimize booking slots during peak demand periods',
              priority: 'medium',
              effort: 'low',
              expected_impact: '+8% capacity utilization',
              timeline: '1 week'
            }
          ]
        },
        {
          id: 'customer-churn-risk',
          model_id: 'customer-behavior',
          type: 'customer_behavior',
          prediction: {
            high_risk_customers: 34,
            churn_probability: 23.8,
            at_risk_revenue: 8950,
            intervention_success_rate: 67.4
          },
          confidence: 89.8,
          time_horizon: '3_months',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          status: 'monitoring',
          impact_level: 'critical',
          recommended_actions: [
            {
              action: 'Launch targeted retention campaign for high-risk customers',
              priority: 'high',
              effort: 'medium',
              expected_impact: '67% retention improvement',
              timeline: '2 weeks'
            },
            {
              action: 'Implement personalized rebooking incentives',
              priority: 'high',
              effort: 'low',
              expected_impact: '+$6,000 saved revenue',
              timeline: '1 week'
            }
          ]
        },
        {
          id: 'agent-optimization',
          model_id: 'agent-optimizer',
          type: 'agent_performance',
          prediction: {
            optimal_send_time: '2:30 PM',
            message_effectiveness: 87.3,
            conversion_uplift_potential: 24.6,
            personalization_impact: 31.2
          },
          confidence: 91.5,
          time_horizon: '1_month',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          status: 'active',
          impact_level: 'high',
          recommended_actions: [
            {
              action: 'Adjust AI agent message timing to 2:30 PM for optimal engagement',
              priority: 'high',
              effort: 'low',
              expected_impact: '+24.6% conversion rate',
              timeline: '3 days'
            },
            {
              action: 'Implement dynamic message personalization based on customer history',
              priority: 'medium',
              effort: 'high',
              expected_impact: '+31% engagement',
              timeline: '3 weeks'
            }
          ]
        }
      ]

      const mockAIInsights: AIInsight[] = [
        {
          id: 'weekend-opportunity',
          type: 'opportunity',
          category: 'revenue',
          title: 'Untapped Weekend Premium Demand',
          description: 'AI analysis reveals 34% higher willingness to pay for weekend premium slots, but only 12% current utilization',
          confidence: 92.4,
          priority: 'high',
          supporting_data: {
            demand_increase: 34,
            current_utilization: 12,
            potential_revenue: 5800,
            customer_segments: ['VIP customers', 'Working professionals']
          },
          recommended_actions: [
            'Implement weekend premium pricing (+25%)',
            'Create VIP weekend booking windows',
            'Launch targeted weekend promotion campaign'
          ],
          potential_impact: '+$5,800/month revenue',
          timeline: '2-3 weeks implementation',
          status: 'new'
        },
        {
          id: 'churn-pattern',
          type: 'risk',
          category: 'customer',
          title: 'Service Quality Decline Pattern Detected',
          description: 'ML models identify 18% increase in customer satisfaction decline after 4+ service interactions, indicating potential staff training need',
          confidence: 87.9,
          priority: 'critical',
          supporting_data: {
            satisfaction_decline: 18,
            interaction_threshold: 4,
            affected_customers: 67,
            revenue_at_risk: 12400
          },
          recommended_actions: [
            'Implement staff retraining program',
            'Introduce quality checkpoints after 3rd service',
            'Deploy customer satisfaction monitoring'
          ],
          potential_impact: 'Prevent $12,400 revenue loss',
          timeline: '1-2 weeks urgent action',
          status: 'investigating'
        },
        {
          id: 'seasonal-optimization',
          type: 'optimization',
          category: 'operational',
          title: 'Seasonal Capacity Optimization Opportunity',
          description: 'Predictive analytics show optimal staff scheduling adjustments could increase efficiency by 23% during peak seasons',
          confidence: 94.1,
          priority: 'medium',
          supporting_data: {
            efficiency_gain: 23,
            peak_periods: ['Holiday season', 'Back-to-school', 'Summer weddings'],
            cost_savings: 3200,
            customer_satisfaction_impact: 15
          },
          recommended_actions: [
            'Adjust staff schedules for seasonal patterns',
            'Implement flexible capacity planning',
            'Cross-train staff for peak demand'
          ],
          potential_impact: '+23% efficiency, +$3,200 savings',
          timeline: '4-6 weeks planning',
          status: 'new'
        }
      ]

      setPredictionModels(mockModels)
      setPredictions(mockPredictions)
      setAIInsights(mockAIInsights)
    } catch (error) {
      console.error('Failed to load prediction data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateNewInsights = async () => {
    try {
      setGenerateInsights(true)
      // Mock AI insight generation
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Add a new insight
      const newInsight: AIInsight = {
        id: 'new-insight-' + Date.now(),
        type: 'opportunity',
        category: 'marketing',
        title: 'AI-Generated Marketing Opportunity',
        description: 'Advanced pattern recognition identifies optimal customer segments for loyalty program expansion',
        confidence: 91.7,
        priority: 'high',
        supporting_data: {
          target_segment_size: 156,
          conversion_probability: 78.3,
          revenue_potential: 8950
        },
        recommended_actions: [
          'Launch targeted loyalty program for identified segment',
          'Implement personalized retention offers',
          'Create exclusive member benefits'
        ],
        potential_impact: '+$8,950 revenue potential',
        timeline: '3-4 weeks implementation',
        status: 'new'
      }

      setAIInsights(prev => [newInsight, ...prev])
    } catch (error) {
      console.error('Failed to generate insights:', error)
    } finally {
      setGenerateInsights(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'training':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
      case 'updating':
        return <RefreshCw className="w-4 h-4 text-yellow-600" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      case 'medium':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const getInsightTypeIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <Rocket className="w-4 h-4 text-green-600" />
      case 'risk':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'optimization':
        return <Zap className="w-4 h-4 text-blue-600" />
      case 'trend':
        return <TrendingUp className="w-4 h-4 text-purple-600" />
      default:
        return <Lightbulb className="w-4 h-4 text-yellow-600" />
    }
  }

  const renderPredictions = () => (
    <div className="space-y-6">
      {predictions.map(prediction => (
        <Card key={prediction.id} className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {prediction.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Prediction
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {prediction.time_horizon.replace('_', ' ')} forecast
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={getPriorityColor(prediction.impact_level)}>
                {prediction.impact_level} impact
              </Badge>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                {formatPercentage(prediction.confidence)} confidence
              </Badge>
            </div>
          </div>

          {/* Prediction Details */}
          {prediction.type === 'revenue' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Predicted Revenue</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(prediction.prediction.amount)}
                </p>
                <p className="text-xs text-green-600">
                  +{formatPercentage(prediction.prediction.growth_rate)} growth
                </p>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Range (95% CI)</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatCurrency(prediction.prediction.confidence_range.min)} - {formatCurrency(prediction.prediction.confidence_range.max)}
                </p>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Key Drivers</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {prediction.prediction.key_drivers.length} factors identified
                </p>
              </div>
            </div>
          )}

          {prediction.type === 'customer_behavior' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">High Risk Customers</p>
                <p className="text-xl font-bold text-red-600">
                  {prediction.prediction.high_risk_customers}
                </p>
              </div>
              <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Churn Probability</p>
                <p className="text-xl font-bold text-yellow-600">
                  {formatPercentage(prediction.prediction.churn_probability)}
                </p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Intervention Success</p>
                <p className="text-xl font-bold text-green-600">
                  {formatPercentage(prediction.prediction.intervention_success_rate)}
                </p>
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Recommended Actions</h4>
            {prediction.recommended_actions.map((action, index) => (
              <div key={index} className="flex items-start justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white mb-1">
                    {action.action}
                  </p>
                  <div className="flex items-center space-x-3 text-xs text-gray-600 dark:text-gray-400">
                    <span>Impact: {action.expected_impact}</span>
                    <span>Timeline: {action.timeline}</span>
                    <Badge className={getPriorityColor(action.priority)} variant="outline">
                      {action.priority}
                    </Badge>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  Implement
                </Button>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )

  const renderInsights = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          AI-Generated Insights
        </h3>
        <Button 
          onClick={generateNewInsights}
          disabled={generateInsights}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {generateInsights ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Brain className="w-4 h-4 mr-2" />
          )}
          Generate New Insights
        </Button>
      </div>

      {aiInsights.map(insight => (
        <Card key={insight.id} className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg flex items-center justify-center">
                {getInsightTypeIcon(insight.type)}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {insight.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {insight.category} • {formatPercentage(insight.confidence)} confidence
                </p>
              </div>
            </div>
            <Badge className={getPriorityColor(insight.priority)}>
              {insight.priority}
            </Badge>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {insight.description}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Impact</h4>
              <p className="text-lg font-bold text-green-600">{insight.potential_impact}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{insight.timeline}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Confidence</h4>
              <div className="flex items-center space-x-2">
                <Progress value={insight.confidence} className="flex-1" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatPercentage(insight.confidence)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 dark:text-white">Recommended Actions</h4>
            {insight.recommended_actions.map((action, index) => (
              <div key={index} className="flex items-center space-x-2">
                <ChevronRight className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{action}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button size="sm" variant="outline">
              Learn More
            </Button>
            <Button size="sm">
              Implement
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )

  const renderModels = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {predictionModels.map(model => (
          <Card key={model.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {model.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {model.type} model
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(model.status)}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {model.status}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {model.description}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Accuracy</p>
                <div className="flex items-center space-x-2">
                  <Progress value={model.accuracy} className="flex-1" />
                  <span className="text-sm font-medium text-green-600">
                    {formatPercentage(model.accuracy)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Predictions Made</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {model.predictions_made.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Last trained: {new Date(model.last_trained).toLocaleDateString()}</span>
              <Button size="sm" variant="outline">
                <Settings className="w-4 h-4 mr-1" />
                Configure
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg flex items-center justify-center">
            <Brain className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              AI Performance Prediction Engine
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Advanced machine learning insights and forecasting
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            {predictionModels.filter(m => m.status === 'ready').length} models active
          </Badge>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center space-x-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'predictions', label: 'Predictions', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'insights', label: 'AI Insights', icon: <Lightbulb className="w-4 h-4" /> },
          { id: 'models', label: 'Models', icon: <Cpu className="w-4 h-4" /> },
          { id: 'recommendations', label: 'Recommendations', icon: <Target className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {tab.icon}
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'predictions' && renderPredictions()}
      {activeTab === 'insights' && renderInsights()}
      {activeTab === 'models' && renderModels()}
      
      {activeTab === 'recommendations' && (
        <div className="text-center py-12">
          <Rocket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Actionable Recommendations
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            AI-powered recommendations for business optimization
          </p>
          <Button>
            <Zap className="w-4 h-4 mr-2" />
            Generate Recommendations
          </Button>
        </div>
      )}
    </Card>
  )
}