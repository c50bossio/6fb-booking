'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  Target, 
  Users, 
  BarChart3, 
  Play, 
  Pause, 
  Trash2,
  Plus,
  Eye,
  MousePointer,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Trophy,
  Lightbulb
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

interface ABTest {
  id: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
  target_metric: string
  variant_count: number
  event_count: number
  created_at: string
  started_at?: string
  ends_at?: string
}

interface ABTestResults {
  test_id: string
  control_metrics: {
    sample_size: number
    conversion_rate: number
    average_value: number
    total_value: number
  }
  treatment_metrics: {
    sample_size: number
    conversion_rate: number
    average_value: number
    total_value: number
  }
  statistical_significance: number
  confidence_interval: {
    lower: number
    upper: number
    difference: number
  }
  recommendation: string
  revenue_impact?: number
  is_statistically_significant: boolean
  sample_sizes: {
    control: number
    treatment: number
  }
}

interface Template {
  id: string
  name: string
  description: string
  target_metric: string
  six_figure_alignment: string
  control_variant: {
    name: string
    config: Record<string, any>
  }
  treatment_variant: {
    name: string
    config: Record<string, any>
  }
}

export function ABTestingDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [tests, setTests] = useState<ABTest[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null)
  const [testResults, setTestResults] = useState<ABTestResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Create test form state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newTestForm, setNewTestForm] = useState({
    name: '',
    description: '',
    target_metric: 'conversion_rate',
    traffic_split: 0.5,
    min_sample_size: 100,
    max_duration_days: 30,
    confidence_level: 0.95,
    minimum_effect_size: 0.05,
    six_figure_alignment: ''
  })

  useEffect(() => {
    if (user) {
      loadTests()
      loadTemplates()
    }
  }, [user])

  const loadTests = async () => {
    try {
      const response = await fetch('/api/v2/ab-testing/tests', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      if (response.ok) {
        const data = await response.json()
        setTests(data)
      }
    } catch (error) {
      console.error('Failed to load tests:', error)
    }
  }

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/v2/ab-testing/templates/six-figure-barber')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  const loadTestResults = async (testId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v2/ab-testing/tests/${testId}/results`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      if (response.ok) {
        const data = await response.json()
        setTestResults(data)
      }
    } catch (error) {
      console.error('Failed to load test results:', error)
    } finally {
      setLoading(false)
    }
  }

  const startTest = async (testId: string) => {
    try {
      const response = await fetch(`/api/v2/ab-testing/tests/${testId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      if (response.ok) {
        toast({
          title: "Test Started",
          description: "A/B test is now running and collecting data."
        })
        loadTests()
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to start test",
        description: "Please try again later."
      })
    }
  }

  const pauseTest = async (testId: string) => {
    try {
      const response = await fetch(`/api/v2/ab-testing/tests/${testId}/pause`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      if (response.ok) {
        toast({
          title: "Test Paused",
          description: "A/B test has been paused."
        })
        loadTests()
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to pause test",
        description: "Please try again later."
      })
    }
  }

  const createTestFromTemplate = async (templateId: string, name: string) => {
    try {
      const response = await fetch(`/api/v2/ab-testing/templates/${templateId}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name })
      })
      
      if (response.ok) {
        toast({
          title: "Test Created",
          description: "A/B test created from template successfully."
        })
        loadTests()
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to create test",
        description: "Please try again later."
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, icon: Clock, color: 'text-gray-500' },
      active: { variant: 'default' as const, icon: Play, color: 'text-green-500' },
      paused: { variant: 'outline' as const, icon: Pause, color: 'text-yellow-500' },
      completed: { variant: 'default' as const, icon: CheckCircle, color: 'text-blue-500' },
      archived: { variant: 'secondary' as const, icon: AlertCircle, color: 'text-gray-400' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getMetricIcon = (metric: string) => {
    const icons = {
      conversion_rate: Target,
      revenue: DollarSign,
      click_through_rate: MousePointer
    }
    return icons[metric as keyof typeof icons] || Target
  }

  const formatPercentage = (value: number) => `${(value * 100).toFixed(2)}%`
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`

  if (!user) return null

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            A/B Testing Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Optimize conversions with Six Figure Barber methodology
          </p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Test
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create A/B Test</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="test-name">Test Name</Label>
                <Input
                  id="test-name"
                  value={newTestForm.name}
                  onChange={(e) => setNewTestForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Premium Pricing CTA Test"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTestForm.description}
                  onChange={(e) => setNewTestForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Test premium vs value-focused pricing presentation"
                />
              </div>
              <div>
                <Label htmlFor="target-metric">Target Metric</Label>
                <Select
                  value={newTestForm.target_metric}
                  onValueChange={(value) => setNewTestForm(prev => ({ ...prev, target_metric: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conversion_rate">Conversion Rate</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="click_through_rate">Click Through Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="six-figure-alignment">Six Figure Barber Alignment</Label>
                <Textarea
                  id="six-figure-alignment"
                  value={newTestForm.six_figure_alignment}
                  onChange={(e) => setNewTestForm(prev => ({ ...prev, six_figure_alignment: e.target.value }))}
                  placeholder="How does this test align with Six Figure Barber methodology?"
                />
              </div>
              <Button 
                onClick={() => {
                  setCreateDialogOpen(false)
                  // Here you would create the test
                }}
                className="w-full"
              >
                Create Test
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium">Total Tests</span>
              </div>
              <span className="text-2xl font-bold">{tests.length}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">Active Tests</span>
              </div>
              <span className="text-2xl font-bold">
                {tests.filter(t => t.status === 'active').length}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-purple-500" />
                <span className="text-sm font-medium">Completed</span>
              </div>
              <span className="text-2xl font-bold">
                {tests.filter(t => t.status === 'completed').length}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-500" />
                <span className="text-sm font-medium">Total Events</span>
              </div>
              <span className="text-2xl font-bold">
                {tests.reduce((sum, test) => sum + test.event_count, 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Tests Overview</TabsTrigger>
          <TabsTrigger value="templates">Six Figure Templates</TabsTrigger>
          <TabsTrigger value="results">Results Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-6">
          <div className="grid gap-4">
            {tests.map((test) => (
              <Card key={test.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{test.name}</h3>
                        {getStatusBadge(test.status)}
                      </div>
                      
                      {test.description && (
                        <p className="text-muted-foreground mb-3">{test.description}</p>
                      )}
                      
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          {React.createElement(getMetricIcon(test.target_metric), { className: "h-4 w-4" })}
                          {test.target_metric.replace('_', ' ')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {test.variant_count} variants
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {test.event_count} events
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(test.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {test.status === 'draft' && (
                        <Button
                          onClick={() => startTest(test.id)}
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Play className="h-4 w-4" />
                          Start
                        </Button>
                      )}
                      
                      {test.status === 'active' && (
                        <Button
                          onClick={() => pauseTest(test.id)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Pause className="h-4 w-4" />
                          Pause
                        </Button>
                      )}
                      
                      <Button
                        onClick={() => {
                          setSelectedTest(test)
                          loadTestResults(test.id)
                          setActiveTab('results')
                        }}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <BarChart3 className="h-4 w-4" />
                        View Results
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {tests.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No A/B Tests Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start optimizing your conversions with our Six Figure Barber templates
                  </p>
                  <Button onClick={() => setActiveTab('templates')}>
                    Browse Templates
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4 mt-6">
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        <h3 className="font-semibold text-lg">{template.name}</h3>
                        <Badge variant="outline">
                          Six Figure Barber
                        </Badge>
                      </div>
                      
                      <p className="text-muted-foreground mb-3">{template.description}</p>
                      
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-amber-800">
                          <strong>Methodology Alignment:</strong> {template.six_figure_alignment}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>Control:</strong> {template.control_variant.name}
                        </div>
                        <div>
                          <strong>Treatment:</strong> {template.treatment_variant.name}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => {
                        const name = `${template.name} - ${new Date().toLocaleDateString()}`
                        createTestFromTemplate(template.id, name)
                      }}
                      className="flex items-center gap-1"
                    >
                      <Zap className="h-4 w-4" />
                      Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4 mt-6">
          {selectedTest && testResults ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {selectedTest.name} - Results Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Control Metrics */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        Control Variant
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Sample Size:</span>
                          <span className="font-medium">{testResults.control_metrics.sample_size}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Conversion Rate:</span>
                          <span className="font-medium">{formatPercentage(testResults.control_metrics.conversion_rate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average Value:</span>
                          <span className="font-medium">{formatCurrency(testResults.control_metrics.average_value)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Value:</span>
                          <span className="font-medium">{formatCurrency(testResults.control_metrics.total_value)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Treatment Metrics */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        Treatment Variant
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Sample Size:</span>
                          <span className="font-medium">{testResults.treatment_metrics.sample_size}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Conversion Rate:</span>
                          <span className="font-medium">{formatPercentage(testResults.treatment_metrics.conversion_rate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average Value:</span>
                          <span className="font-medium">{formatCurrency(testResults.treatment_metrics.average_value)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Value:</span>
                          <span className="font-medium">{formatCurrency(testResults.treatment_metrics.total_value)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Statistical Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Statistical Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold mb-1">
                        {formatPercentage(testResults.statistical_significance)}
                      </div>
                      <div className="text-sm text-muted-foreground">Confidence Level</div>
                      <div className="mt-2">
                        {testResults.is_statistically_significant ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Significant
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Not Significant
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold mb-1">
                        {formatPercentage(testResults.confidence_interval.difference)}
                      </div>
                      <div className="text-sm text-muted-foreground">Improvement</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        CI: {formatPercentage(testResults.confidence_interval.lower)} to {formatPercentage(testResults.confidence_interval.upper)}
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold mb-1">
                        {testResults.revenue_impact ? formatCurrency(testResults.revenue_impact) : 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground">Revenue Impact</div>
                      <div className="text-xs text-muted-foreground mt-1">Per User</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Recommendation */}
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Recommendation:</strong> {testResults.recommendation}
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Test Selected</h3>
                <p className="text-muted-foreground">
                  Select a test from the overview to view detailed results and analysis
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}