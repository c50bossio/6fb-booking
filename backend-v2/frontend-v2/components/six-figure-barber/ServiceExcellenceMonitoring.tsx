"use client"

/**
 * Service Excellence Monitoring Dashboard
 * 
 * Comprehensive service quality tracking and improvement system aligned with
 * Six Figure Barber methodology for maintaining exceptional service standards.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'
import { 
  Star, 
  Award, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Clock,
  Scissors,
  Heart,
  ThumbsUp,
  MessageSquare,
  Calendar,
  BarChart3,
  PieChart,
  Plus,
  Eye,
  Lightbulb,
  Shield
} from 'lucide-react'
import { BarChart, Bar, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

import { 
  getServiceExcellenceStandards,
  trackServiceExcellence,
  ServiceExcellenceStandards,
  ServiceExcellenceRequest,
  ServiceExcellenceResponse
} from '@/lib/six-figure-barber-api'

interface ServiceExcellenceMonitoringProps {
  className?: string
}

// Service excellence areas with descriptions
const EXCELLENCE_AREAS = {
  'technical_skill': {
    name: 'Technical Skill',
    description: 'Precision, technique, and professional execution',
    icon: Scissors,
    color: 'text-blue-600'
  },
  'client_experience': {
    name: 'Client Experience',
    description: 'Overall satisfaction and experience quality',
    icon: Heart,
    color: 'text-red-600'
  },
  'communication': {
    name: 'Communication',
    description: 'Clear, professional, and engaging interaction',
    icon: MessageSquare,
    color: 'text-green-600'
  },
  'professionalism': {
    name: 'Professionalism',
    description: 'Professional demeanor and business conduct',
    icon: Award,
    color: 'text-purple-600'
  },
  'time_management': {
    name: 'Time Management',
    description: 'Punctuality and efficient service delivery',
    icon: Clock,
    color: 'text-orange-600'
  },
  'brand_alignment': {
    name: 'Brand Alignment',
    description: 'Consistency with Six Figure Barber standards',
    icon: Star,
    color: 'text-yellow-600'
  }
}

const CHART_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#eab308']

export function ServiceExcellenceMonitoring({ className }: ServiceExcellenceMonitoringProps) {
  const [standards, setStandards] = useState<ServiceExcellenceStandards | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showTrackingDialog, setShowTrackingDialog] = useState(false)
  const [appointmentId, setAppointmentId] = useState<string>('')
  const [excellenceScores, setExcellenceScores] = useState<{ [key: string]: number }>({})
  const [activeTab, setActiveTab] = useState('overview')

  const loadStandards = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getServiceExcellenceStandards()
      setStandards(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load service excellence data'
      setError(errorMessage)
      console.error('Failed to load service excellence standards:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStandards()
    
    // Initialize excellence scores
    const initialScores: { [key: string]: number } = {}
    Object.keys(EXCELLENCE_AREAS).forEach(area => {
      initialScores[area] = 80
    })
    setExcellenceScores(initialScores)
  }, [])

  const handleTrackExcellence = async () => {
    try {
      const appointmentIdNum = parseInt(appointmentId)
      if (!appointmentIdNum || appointmentIdNum <= 0) {
        toast({
          variant: "destructive",
          title: "Invalid Appointment ID",
          description: "Please enter a valid appointment ID"
        })
        return
      }

      const trackingData: ServiceExcellenceRequest = {
        appointment_id: appointmentIdNum,
        excellence_scores: excellenceScores
      }

      const result = await trackServiceExcellence(trackingData)
      
      toast({
        title: "Excellence Tracked",
        description: `Service excellence recorded for appointment ${appointmentId}. Overall score: ${result.overall_excellence_score.toFixed(1)}`
      })
      
      setShowTrackingDialog(false)
      setAppointmentId('')
      
      // Reload standards to show updated data
      loadStandards()
    } catch (err) {
      console.error('Failed to track service excellence:', err)
    }
  }

  const getComplianceColor = (rate: number): string => {
    if (rate >= 90) return 'text-green-600'
    if (rate >= 80) return 'text-blue-600'
    if (rate >= 70) return 'text-yellow-600'
    if (rate >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  const getComplianceBadgeVariant = (rate: number) => {
    if (rate >= 90) return 'default'
    if (rate >= 80) return 'secondary'
    if (rate >= 70) return 'outline'
    return 'destructive'
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Service Excellence Data Error</AlertTitle>
          <AlertDescription>
            {error}
            <Button 
              onClick={loadStandards} 
              variant="outline" 
              size="sm" 
              className="ml-4"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!standards) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Service Standards</AlertTitle>
          <AlertDescription>
            Service excellence standards are not available. Set up your standards to track service quality.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Prepare radar chart data
  const radarData = standards.standards.map(standard => ({
    area: EXCELLENCE_AREAS[standard.excellence_area as keyof typeof EXCELLENCE_AREAS]?.name || standard.excellence_area,
    current: standard.current_average_score,
    target: standard.target_score,
    minimum: standard.minimum_score
  }))

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Service Excellence Monitoring</h2>
          <p className="text-muted-foreground">
            Track and maintain Six Figure Barber service quality standards
          </p>
        </div>
        <Dialog open={showTrackingDialog} onOpenChange={setShowTrackingDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Track Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Track Service Excellence</DialogTitle>
              <DialogDescription>
                Rate the service quality across all Six Figure Barber excellence areas
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <Label htmlFor="appointment-id">Appointment ID</Label>
                <Input
                  id="appointment-id"
                  value={appointmentId}
                  onChange={(e) => setAppointmentId(e.target.value)}
                  placeholder="Enter appointment ID"
                />
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium">Excellence Area Scores (0-100)</h4>
                {Object.entries(EXCELLENCE_AREAS).map(([areaKey, areaInfo]) => {
                  const AreaIcon = areaInfo.icon
                  return (
                    <div key={areaKey} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <AreaIcon className={`h-4 w-4 ${areaInfo.color}`} />
                          {areaInfo.name}
                        </Label>
                        <span className="text-sm font-medium">{excellenceScores[areaKey]}</span>
                      </div>
                      <Slider
                        value={[excellenceScores[areaKey]]}
                        onValueChange={(value) => setExcellenceScores(prev => ({ ...prev, [areaKey]: value[0] }))}
                        max={100}
                        min={0}
                        step={5}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">{areaInfo.description}</p>
                    </div>
                  )
                })}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTrackingDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleTrackExcellence}>
                Track Excellence
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="standards">Standards</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Compliance</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getComplianceColor(standards.overall_compliance)}`}>
                  {standards.overall_compliance.toFixed(1)}%
                </div>
                <Progress value={standards.overall_compliance} className="mt-2 h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Across all standards
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Methodology Adherence</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getComplianceColor(standards.six_fb_methodology_adherence)}`}>
                  {standards.six_fb_methodology_adherence.toFixed(1)}%
                </div>
                <Progress value={standards.six_fb_methodology_adherence} className="mt-2 h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Six Figure Barber alignment
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Standards</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{standards.standards.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Service quality standards
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Service Excellence Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Service Excellence Performance</CardTitle>
              <CardDescription>
                Current performance vs targets across all excellence areas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="area" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar
                    name="Current Score"
                    dataKey="current"
                    stroke="#2563eb"
                    fill="#2563eb"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="Target Score"
                    dataKey="target"
                    stroke="#16a34a"
                    fill="#16a34a"
                    fillOpacity={0.1}
                  />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="standards" className="space-y-6">
          {/* Standards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {standards.standards.map((standard, index) => {
              const areaInfo = EXCELLENCE_AREAS[standard.excellence_area as keyof typeof EXCELLENCE_AREAS]
              const AreaIcon = areaInfo?.icon || Star
              
              return (
                <Card key={standard.id} className="border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AreaIcon className={`h-5 w-5 ${areaInfo?.color || 'text-gray-600'}`} />
                      {standard.standard_name}
                    </CardTitle>
                    <CardDescription>
                      {areaInfo?.description || standard.excellence_area}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Current Average</span>
                      <span className={`text-lg font-bold ${getComplianceColor(standard.current_average_score)}`}>
                        {standard.current_average_score.toFixed(1)}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Minimum: {standard.minimum_score}</span>
                        <span>Target: {standard.target_score}</span>
                        <span>Excellence: {standard.excellence_score}</span>
                      </div>
                      <Progress value={standard.current_average_score} className="h-2" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant={getComplianceBadgeVariant(standard.compliance_rate)}>
                        {standard.compliance_rate.toFixed(1)}% Compliance
                      </Badge>
                      <span className={`text-xs flex items-center gap-1 ${
                        standard.trend_direction === 'improving' ? 'text-green-600' :
                        standard.trend_direction === 'declining' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {standard.trend_direction === 'improving' ? <TrendingUp className="h-3 w-3" /> :
                         standard.trend_direction === 'declining' ? <TrendingDown className="h-3 w-3" /> :
                         <Target className="h-3 w-3" />}
                        {standard.trend_direction}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Performance Charts */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Rate by Standard</CardTitle>
              <CardDescription>
                Performance comparison across all service excellence standards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={standards.standards}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="standard_name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="compliance_rate" fill="#2563eb" />
                  <Bar dataKey="current_average_score" fill="#16a34a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Excellence Areas Performance</CardTitle>
                <CardDescription>
                  Average scores by excellence area
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(EXCELLENCE_AREAS).map(([areaKey, areaInfo]) => {
                    const areaStandards = standards.standards.filter(
                      s => s.excellence_area === areaKey
                    )
                    const avgScore = areaStandards.length > 0 
                      ? areaStandards.reduce((sum, s) => sum + s.current_average_score, 0) / areaStandards.length
                      : 0
                    
                    const AreaIcon = areaInfo.icon
                    
                    return (
                      <div key={areaKey} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AreaIcon className={`h-5 w-5 ${areaInfo.color}`} />
                          <span className="font-medium">{areaInfo.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={avgScore} className="w-24 h-2" />
                          <span className={`text-sm font-bold ${getComplianceColor(avgScore)}`}>
                            {avgScore.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>
                  Standards showing improvement or decline
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {standards.standards
                    .filter(s => s.trend_direction !== 'stable')
                    .map((standard, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                      <span className="text-sm font-medium">{standard.standard_name}</span>
                      <div className={`flex items-center gap-1 text-xs ${
                        standard.trend_direction === 'improving' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {standard.trend_direction === 'improving' ? 
                          <TrendingUp className="h-3 w-3" /> : 
                          <TrendingDown className="h-3 w-3" />
                        }
                        {standard.trend_direction}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {/* Service Excellence Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Improvement Opportunities
                </CardTitle>
                <CardDescription>
                  Areas where you can enhance service excellence
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {standards.standards
                  .filter(s => s.compliance_rate < 90)
                  .sort((a, b) => a.compliance_rate - b.compliance_rate)
                  .slice(0, 5)
                  .map((standard, index) => (
                  <div key={index} className="border-l-4 border-orange-500 pl-4 space-y-1">
                    <h4 className="font-medium">{standard.standard_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Current: {standard.current_average_score.toFixed(1)} / Target: {standard.target_score}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {(standard.target_score - standard.current_average_score).toFixed(1)} points to target
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Excellence Achievements
                </CardTitle>
                <CardDescription>
                  Standards meeting or exceeding Six Figure Barber targets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {standards.standards
                  .filter(s => s.current_average_score >= s.target_score)
                  .sort((a, b) => b.current_average_score - a.current_average_score)
                  .slice(0, 5)
                  .map((standard, index) => (
                  <div key={index} className="border-l-4 border-green-500 pl-4 space-y-1">
                    <h4 className="font-medium">{standard.standard_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Achieving {standard.current_average_score.toFixed(1)} / {standard.target_score} target
                    </p>
                    <Badge variant="default" className="text-xs">
                      Exceeding by {(standard.current_average_score - standard.target_score).toFixed(1)} points
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Six Figure Barber Methodology Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Six Figure Barber Methodology Insights
              </CardTitle>
              <CardDescription>
                Strategic recommendations based on your service excellence data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900">Premium Service Focus</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Maintain excellence scores above 90 to justify premium pricing and Six Figure revenue goals
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900">Client Retention Strategy</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Consistent service excellence is key to building the loyal client base needed for six-figure success
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-900">Brand Differentiation</h4>
                  <p className="text-sm text-purple-700 mt-1">
                    Excellence in all areas sets you apart from competitors and supports premium positioning
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-medium text-orange-900">Continuous Improvement</h4>
                  <p className="text-sm text-orange-700 mt-1">
                    Track and improve service metrics weekly to maintain Six Figure Barber methodology alignment
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}