'use client'

import React, { useState, useEffect } from 'react'
import {
  TestTube,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Play,
  Pause,
  StopCircle,
  Copy,
  Edit3,
  Plus,
  Trash2,
  Target,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Award,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Progress } from '@/components/ui/progress'
import { 
  type AgentInstance, 
  agentsApi 
} from '@/lib/api/agents'

interface MessageVariant {
  id: string
  name: string
  content: string
  subject?: string
  call_to_action?: string
  created_at: string
  is_control: boolean
  performance_data?: {
    sent_count: number
    response_rate: number
    conversion_rate: number
    revenue_generated: number
    cost_per_conversion: number
    engagement_score: number
  }
}

interface ABTest {
  id: string
  name: string
  description: string
  status: 'draft' | 'running' | 'paused' | 'completed' | 'failed'
  agent_id: number
  variants: MessageVariant[]
  test_config: {
    traffic_split: Record<string, number>
    duration_days: number
    min_sample_size: number
    confidence_level: number
    primary_metric: 'response_rate' | 'conversion_rate' | 'revenue' | 'engagement'
  }
  results?: {
    winner: string | null
    confidence: number
    statistical_significance: boolean
    recommendation: string
  }
  created_at: string
  started_at?: string
  ended_at?: string
}

interface MessageVariantTesterProps {
  isOpen: boolean
  onClose: () => void
  agent: AgentInstance
  onTestComplete?: (test: ABTest) => void
}

export function MessageVariantTester({ 
  isOpen, 
  onClose, 
  agent,
  onTestComplete 
}: MessageVariantTesterProps) {
  const [tests, setTests] = useState<ABTest[]>([])
  const [activeTest, setActiveTest] = useState<ABTest | null>(null)
  const [loading, setLoading] = useState(false)
  const [showCreateTest, setShowCreateTest] = useState(false)
  const [view, setView] = useState<'overview' | 'create' | 'results'>('overview')

  // Create test form state
  const [testName, setTestName] = useState('')
  const [testDescription, setTestDescription] = useState('')
  const [variants, setVariants] = useState<Partial<MessageVariant>[]>([
    { name: 'Control (Original)', content: '', is_control: true },
    { name: 'Variant A', content: '', is_control: false }
  ])
  const [testConfig, setTestConfig] = useState({
    duration_days: 7,
    min_sample_size: 100,
    confidence_level: 95,
    primary_metric: 'conversion_rate' as const
  })

  useEffect(() => {
    if (isOpen) {
      loadTests()
    }
  }, [isOpen, agent.id])

  const loadTests = async () => {
    try {
      setLoading(true)
      // Mock data for demonstration - replace with actual API call
      const mockTests: ABTest[] = [
        {
          id: '1',
          name: 'Welcome Message Optimization',
          description: 'Testing different approaches to welcome new clients',
          status: 'running',
          agent_id: agent.id,
          variants: [
            {
              id: 'control',
              name: 'Control (Original)',
              content: 'Welcome to our barbershop! Book your appointment today.',
              is_control: true,
              created_at: new Date().toISOString(),
              performance_data: {
                sent_count: 150,
                response_rate: 12.5,
                conversion_rate: 8.2,
                revenue_generated: 1850,
                cost_per_conversion: 15.50,
                engagement_score: 7.2
              }
            },
            {
              id: 'variant-a',
              name: 'Personalized Variant',
              content: 'Hey {name}! Ready for your next fresh cut? Our master barbers are waiting to give you that perfect style.',
              is_control: false,
              created_at: new Date().toISOString(),
              performance_data: {
                sent_count: 145,
                response_rate: 18.3,
                conversion_rate: 14.7,
                revenue_generated: 2650,
                cost_per_conversion: 12.25,
                engagement_score: 8.9
              }
            }
          ],
          test_config: {
            traffic_split: { control: 50, 'variant-a': 50 },
            duration_days: 7,
            min_sample_size: 100,
            confidence_level: 95,
            primary_metric: 'conversion_rate'
          },
          results: {
            winner: 'variant-a',
            confidence: 97.5,
            statistical_significance: true,
            recommendation: 'Variant A shows 79% higher conversion rate with 97.5% confidence. Consider implementing this variant.'
          },
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          started_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
      setTests(mockTests)
      setActiveTest(mockTests.find(t => t.status === 'running') || null)
    } catch (error) {
      console.error('Failed to load A/B tests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTest = async () => {
    if (!testName.trim() || variants.some(v => !v.content?.trim())) return

    try {
      setLoading(true)
      
      // Mock test creation - replace with actual API call
      const newTest: ABTest = {
        id: Date.now().toString(),
        name: testName,
        description: testDescription,
        status: 'draft',
        agent_id: agent.id,
        variants: variants.map((v, index) => ({
          id: `variant-${index}`,
          name: v.name || `Variant ${index}`,
          content: v.content || '',
          subject: v.subject,
          call_to_action: v.call_to_action,
          is_control: v.is_control || false,
          created_at: new Date().toISOString()
        })) as MessageVariant[],
        test_config: {
          traffic_split: variants.reduce((acc, _, index) => {
            acc[`variant-${index}`] = Math.floor(100 / variants.length)
            return acc
          }, {} as Record<string, number>),
          ...testConfig
        },
        created_at: new Date().toISOString()
      }

      setTests(prev => [newTest, ...prev])
      setShowCreateTest(false)
      setView('overview')
      
      // Reset form
      setTestName('')
      setTestDescription('')
      setVariants([
        { name: 'Control (Original)', content: '', is_control: true },
        { name: 'Variant A', content: '', is_control: false }
      ])
      
    } catch (error) {
      console.error('Failed to create test:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartTest = async (testId: string) => {
    try {
      setLoading(true)
      // Mock start test - replace with actual API call
      setTests(prev => prev.map(test => 
        test.id === testId 
          ? { ...test, status: 'running' as const, started_at: new Date().toISOString() }
          : test
      ))
      
      const startedTest = tests.find(t => t.id === testId)
      if (startedTest) {
        setActiveTest({ ...startedTest, status: 'running' })
      }
    } catch (error) {
      console.error('Failed to start test:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStopTest = async (testId: string) => {
    try {
      setLoading(true)
      // Mock stop test - replace with actual API call
      setTests(prev => prev.map(test => 
        test.id === testId 
          ? { ...test, status: 'completed' as const, ended_at: new Date().toISOString() }
          : test
      ))
      setActiveTest(null)
    } catch (error) {
      console.error('Failed to stop test:', error)
    } finally {
      setLoading(false)
    }
  }

  const addVariant = () => {
    if (variants.length < 5) {
      setVariants(prev => [...prev, {
        name: `Variant ${String.fromCharCode(65 + prev.length - 1)}`,
        content: '',
        is_control: false
      }])
    }
  }

  const removeVariant = (index: number) => {
    if (variants.length > 2 && !variants[index].is_control) {
      setVariants(prev => prev.filter((_, i) => i !== index))
    }
  }

  const updateVariant = (index: number, field: string, value: string) => {
    setVariants(prev => prev.map((variant, i) => 
      i === index ? { ...variant, [field]: value } : variant
    ))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Active Test Summary */}
      {activeTest && (
        <Card className="p-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <TestTube className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-200">
                  Active Test: {activeTest.name}
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Running for {Math.ceil((Date.now() - new Date(activeTest.started_at!).getTime()) / (1000 * 60 * 60 * 24))} days
                </p>
              </div>
            </div>
            <Badge className={getStatusColor(activeTest.status)}>
              {activeTest.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {activeTest.variants.map(variant => (
              <div key={variant.id} className="text-center">
                <p className="text-sm text-green-700 dark:text-green-300 mb-1">
                  {variant.name}
                </p>
                <p className="text-lg font-bold text-green-900 dark:text-green-200">
                  {variant.performance_data ? formatPercentage(variant.performance_data.conversion_rate) : 'N/A'}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {variant.performance_data ? `${variant.performance_data.sent_count} sent` : 'No data'}
                </p>
              </div>
            ))}
          </div>

          {activeTest.results?.statistical_significance && (
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Award className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900 dark:text-green-200">
                  Winner Detected: {activeTest.variants.find(v => v.id === activeTest.results?.winner)?.name}
                </span>
                <Badge className="bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200">
                  {activeTest.results.confidence.toFixed(1)}% confidence
                </Badge>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                {activeTest.results.recommendation}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setView('results')}
              className="text-green-700 border-green-200 hover:bg-green-100 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-900/20"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              View Results
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStopTest(activeTest.id)}
              className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
            >
              <StopCircle className="w-4 h-4 mr-2" />
              Stop Test
            </Button>
          </div>
        </Card>
      )}

      {/* Test History */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Test History
        </h3>
        <Button onClick={() => setView('create')}>
          <Plus className="w-4 h-4 mr-2" />
          Create New Test
        </Button>
      </div>

      <div className="space-y-4">
        {tests.map(test => (
          <Card key={test.id} className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <TestTube className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {test.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {test.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Badge className={getStatusColor(test.status)}>
                  {test.status}
                </Badge>
                {test.status === 'draft' && (
                  <Button
                    size="sm"
                    onClick={() => handleStartTest(test.id)}
                    className="text-green-600 hover:text-green-800"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Start
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Variants</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {test.variants.length}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {test.test_config.duration_days}d
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Sample Size</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {test.test_config.min_sample_size}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Primary Metric</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {test.test_config.primary_metric.replace('_', ' ')}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Created</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(test.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>
        ))}

        {tests.length === 0 && (
          <div className="text-center py-12">
            <TestTube className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No A/B Tests Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Start optimizing your agent's messages by creating your first A/B test. Compare different variants to improve performance.
            </p>
            <Button onClick={() => setView('create')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Test
            </Button>
          </div>
        )}
      </div>
    </div>
  )

  const renderCreateTest = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Create A/B Test
        </h3>
        <Button variant="ghost" onClick={() => setView('overview')}>
          Cancel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Configuration */}
        <Card className="p-6">
          <h4 className="font-medium mb-4">Test Configuration</h4>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="test-name">Test Name</Label>
              <Input
                id="test-name"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="e.g., Welcome Message Optimization"
              />
            </div>

            <div>
              <Label htmlFor="test-description">Description</Label>
              <Textarea
                id="test-description"
                value={testDescription}
                onChange={(e) => setTestDescription(e.target.value)}
                placeholder="Describe what you're testing and why"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duration (days)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={testConfig.duration_days}
                  onChange={(e) => setTestConfig(prev => ({
                    ...prev,
                    duration_days: parseInt(e.target.value)
                  }))}
                  min="1"
                  max="30"
                />
              </div>

              <div>
                <Label htmlFor="sample-size">Min Sample Size</Label>
                <Input
                  id="sample-size"
                  type="number"
                  value={testConfig.min_sample_size}
                  onChange={(e) => setTestConfig(prev => ({
                    ...prev,
                    min_sample_size: parseInt(e.target.value)
                  }))}
                  min="50"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="primary-metric">Primary Metric</Label>
              <Select 
                value={testConfig.primary_metric} 
                onChange={(value) => setTestConfig(prev => ({
                  ...prev,
                  primary_metric: value as any
                }))}
                options={[
                  { value: 'response_rate', label: 'Response Rate' },
                  { value: 'conversion_rate', label: 'Conversion Rate' },
                  { value: 'revenue', label: 'Revenue Generated' },
                  { value: 'engagement', label: 'Engagement Score' }
                ]}
              />
            </div>
          </div>
        </Card>

        {/* Message Variants */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Message Variants</h4>
            <Button
              size="sm"
              variant="outline"
              onClick={addVariant}
              disabled={variants.length >= 5}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Variant
            </Button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {variants.map((variant, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Input
                      value={variant.name || ''}
                      onChange={(e) => updateVariant(index, 'name', e.target.value)}
                      className="text-sm font-medium w-48"
                      placeholder="Variant name"
                    />
                    {variant.is_control && (
                      <Badge variant="secondary">Control</Badge>
                    )}
                  </div>
                  {!variant.is_control && variants.length > 2 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeVariant(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Message Content</Label>
                    <Textarea
                      value={variant.content || ''}
                      onChange={(e) => updateVariant(index, 'content', e.target.value)}
                      placeholder="Enter your message content..."
                      rows={3}
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Call to Action (optional)</Label>
                    <Input
                      value={variant.call_to_action || ''}
                      onChange={(e) => updateVariant(index, 'call_to_action', e.target.value)}
                      placeholder="e.g., Book Now, Schedule Today"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-end space-x-3">
        <Button variant="outline" onClick={() => setView('overview')}>
          Cancel
        </Button>
        <Button 
          onClick={handleCreateTest}
          disabled={!testName.trim() || variants.some(v => !v.content?.trim()) || loading}
        >
          {loading ? 'Creating...' : 'Create Test'}
        </Button>
      </div>
    </div>
  )

  const renderResults = () => {
    if (!activeTest) return null

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Test Results: {activeTest.name}
          </h3>
          <Button variant="ghost" onClick={() => setView('overview')}>
            Back to Overview
          </Button>
        </div>

        {/* Performance Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeTest.variants.map(variant => (
            <Card key={variant.id} className={`p-6 ${
              variant.id === activeTest.results?.winner 
                ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                : ''
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {variant.name}
                </h4>
                <div className="flex items-center space-x-2">
                  {variant.is_control && (
                    <Badge variant="secondary">Control</Badge>
                  )}
                  {variant.id === activeTest.results?.winner && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      <Award className="w-3 h-3 mr-1" />
                      Winner
                    </Badge>
                  )}
                </div>
              </div>

              {variant.performance_data && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Response Rate</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatPercentage(variant.performance_data.response_rate)}
                      </p>
                      {variant.performance_data.response_rate > 15 ? (
                        <ArrowUpRight className="w-4 h-4 text-green-600 mx-auto" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-600 mx-auto" />
                      )}
                    </div>

                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Conversion Rate</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatPercentage(variant.performance_data.conversion_rate)}
                      </p>
                      {variant.performance_data.conversion_rate > 10 ? (
                        <ArrowUpRight className="w-4 h-4 text-green-600 mx-auto" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-600 mx-auto" />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Sent</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {variant.performance_data.sent_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Revenue</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {formatCurrency(variant.performance_data.revenue_generated)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Cost/Conv</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        ${variant.performance_data.cost_per_conversion.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Message Content:</p>
                    <p className="text-sm text-gray-900 dark:text-white italic">
                      "{variant.content}"
                    </p>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Recommendations */}
        {activeTest.results && (
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              <h4 className="font-medium text-gray-900 dark:text-white">
                Test Results & Recommendations
              </h4>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-200">
                    Statistical Significance: {activeTest.results.statistical_significance ? 'Achieved' : 'Not Yet'}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Confidence Level: {activeTest.results.confidence.toFixed(1)}%
                  </p>
                </div>
                {activeTest.results.statistical_significance && (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                )}
              </div>

              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <p className="text-gray-900 dark:text-white">
                  {activeTest.results.recommendation}
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <Button variant="outline">
                  <Copy className="w-4 h-4 mr-2" />
                  Export Results
                </Button>
                <Button>
                  <Settings className="w-4 h-4 mr-2" />
                  Apply Winner
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="p-6 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <TestTube className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                A/B Testing Lab
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Optimize {agent.name} messages with data-driven testing
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Select 
              value={view} 
              onChange={(value) => setView(value as any)}
              options={[
                { value: 'overview', label: 'Overview' },
                { value: 'create', label: 'Create Test' },
                ...(activeTest ? [{ value: 'results', label: 'Results' }] : [])
              ]}
            />
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <>
            {view === 'overview' && renderOverview()}
            {view === 'create' && renderCreateTest()}
            {view === 'results' && renderResults()}
          </>
        )}
      </div>
    </Modal>
  )
}