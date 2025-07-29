"use client"

/**
 * Client Value Management Interface
 * 
 * Comprehensive client value analysis and management system aligned with
 * Six Figure Barber methodology for maximizing client relationships and lifetime value.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'
import { 
  Users, 
  Star, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Crown,
  Heart,
  Shield,
  Eye,
  Target,
  Clock,
  DollarSign,
  Calendar,
  Phone,
  MessageSquare,
  Gift,
  Award,
  BarChart3,
  PieChart,
  Search
} from 'lucide-react'
import { PieChart as RechartsPieChart, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from '@/lib/recharts-dynamic'

import { 
  getClientValueTiers,
  getClientValueProfile,
  getClientJourney,
  ClientValueTiers,
  ClientValueProfile,
  ClientJourney
} from '@/lib/six-figure-barber-api'

interface ClientValueManagementInterfaceProps {
  className?: string
}

// Client tier configurations with icons and colors
const CLIENT_TIERS = {
  'premium_vip': {
    name: 'Premium VIP',
    icon: Crown,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    description: 'Highest value clients with premium service adoption'
  },
  'core_regular': {
    name: 'Core Regular',
    icon: Star,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Loyal regular clients with consistent booking patterns'
  },
  'developing': {
    name: 'Developing',
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Clients showing growth potential and engagement'
  },
  'occasional': {
    name: 'Occasional',
    icon: Clock,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    description: 'Infrequent visitors with sporadic booking patterns'
  },
  'at_risk': {
    name: 'At Risk',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    description: 'Clients showing signs of churn or disengagement'
  }
}

const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function ClientValueManagementInterface({ className }: ClientValueManagementInterfaceProps) {
  const [tierData, setTierData] = useState<ClientValueTiers | null>(null)
  const [selectedClient, setSelectedClient] = useState<ClientValueProfile | null>(null)
  const [clientJourney, setClientJourney] = useState<ClientJourney | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchClientId, setSearchClientId] = useState<string>('')
  const [showClientDialog, setShowClientDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const loadTierData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getClientValueTiers()
      setTierData(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load client value data'
      setError(errorMessage)
      console.error('Failed to load client value tiers:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadClientProfile = async (clientId: number) => {
    try {
      const [profile, journey] = await Promise.all([
        getClientValueProfile(clientId),
        getClientJourney(clientId)
      ])
      
      setSelectedClient(profile)
      setClientJourney(journey)
      setShowClientDialog(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load client profile'
      toast({
        variant: "destructive",
        title: "Client Profile Error",
        description: errorMessage
      })
      console.error('Failed to load client profile:', err)
    }
  }

  useEffect(() => {
    loadTierData()
  }, [])

  const handleSearchClient = () => {
    const clientId = parseInt(searchClientId)
    if (!isNaN(clientId) && clientId > 0) {
      loadClientProfile(clientId)
    } else {
      toast({
        variant: "destructive",
        title: "Invalid Client ID",
        description: "Please enter a valid numeric client ID"
      })
    }
  }

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-blue-600'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  const getRiskBadgeVariant = (riskScore: number) => {
    if (riskScore >= 80) return 'destructive'
    if (riskScore >= 60) return 'secondary'
    return 'default'
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
          <AlertTitle>Client Value Data Error</AlertTitle>
          <AlertDescription>
            {error}
            <Button 
              onClick={loadTierData} 
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

  if (!tierData) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Client Data</AlertTitle>
          <AlertDescription>
            Client value data is not available. Start serving clients to see value analytics.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const chartData = tierData.tier_distribution.map((tier, index) => ({
    ...tier,
    color: CHART_COLORS[index % CHART_COLORS.length]
  }))

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Client Value Management</h2>
          <p className="text-muted-foreground">
            Analyze and optimize client relationships using Six Figure Barber methodology
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Enter Client ID"
            value={searchClientId}
            onChange={(e) => setSearchClientId(e.target.value)}
            className="w-40"
          />
          <Button onClick={handleSearchClient}>
            <Search className="mr-2 h-4 w-4" />
            Analyze
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tiers">Value Tiers</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Client Portfolio Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tierData.total_clients}</div>
                <p className="text-xs text-muted-foreground">
                  Active client base
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Client Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(tierData.tier_distribution.reduce((sum, tier) => sum + tier.average_value * tier.count, 0) / tierData.total_clients).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Lifetime value per client
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Premium Clients</CardTitle>
                <Crown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tierData.tier_distribution.find(t => t.tier === 'premium_vip')?.count || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  VIP tier clients
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Client Value Distribution Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Client Distribution by Value Tier</CardTitle>
                <CardDescription>
                  Breakdown of your client portfolio across value segments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [value, 'Clients']}
                      labelFormatter={(label) => CLIENT_TIERS[label as keyof typeof CLIENT_TIERS]?.name || label}
                    />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Value by Tier</CardTitle>
                <CardDescription>
                  Lifetime value comparison across client segments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="tier" 
                      tickFormatter={(value) => CLIENT_TIERS[value as keyof typeof CLIENT_TIERS]?.name || value}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`$${value.toLocaleString()}`, 'Average Value']}
                      labelFormatter={(label) => CLIENT_TIERS[label as keyof typeof CLIENT_TIERS]?.name || label}
                    />
                    <Bar dataKey="average_value" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-6">
          {/* Client Tier Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(CLIENT_TIERS).map(([tierKey, tierInfo]) => {
              const tierData = tierData?.tier_distribution.find(t => t.tier === tierKey)
              const TierIcon = tierInfo.icon
              
              return (
                <Card key={tierKey} className={`${tierInfo.borderColor} border-2`}>
                  <CardHeader className={tierInfo.bgColor}>
                    <CardTitle className="flex items-center gap-2">
                      <TierIcon className={`h-5 w-5 ${tierInfo.color}`} />
                      {tierInfo.name}
                    </CardTitle>
                    <CardDescription>{tierInfo.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Client Count</span>
                        <span className="text-2xl font-bold">{tierData?.count || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Average Value</span>
                        <span className="text-lg font-semibold">
                          ${tierData?.average_value.toLocaleString() || '0'}
                        </span>
                      </div>
                      <Progress 
                        value={tierData ? (tierData.count / tierData.total_clients) * 100 : 0} 
                        className="h-2" 
                      />
                      <p className="text-xs text-muted-foreground">
                        {tierData ? ((tierData.count / tierData.total_clients) * 100).toFixed(1) : 0}% of total clients
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {/* Six Figure Barber Methodology Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Six Figure Barber Methodology Insights
              </CardTitle>
              <CardDescription>
                Strategic insights based on your client value analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tierData.methodology_insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{insight}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Client Tier Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Tier Advancement Opportunities
                </CardTitle>
                <CardDescription>
                  Strategies to move clients to higher value tiers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-medium">Developing → Core Regular</h4>
                  <p className="text-sm text-muted-foreground">
                    Implement consistent booking reminders and loyalty rewards to build regular visit patterns
                  </p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium">Core Regular → Premium VIP</h4>
                  <p className="text-sm text-muted-foreground">
                    Introduce premium services and personalized experiences to increase average ticket
                  </p>
                </div>
                <div className="border-l-4 border-yellow-500 pl-4">
                  <h4 className="font-medium">Occasional → Developing</h4>
                  <p className="text-sm text-muted-foreground">
                    Increase engagement through personalized communication and special offers
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Retention Strategies
                </CardTitle>
                <CardDescription>
                  Actions to prevent client churn and maintain value
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="border-l-4 border-red-500 pl-4">
                  <h4 className="font-medium">At Risk Clients</h4>
                  <p className="text-sm text-muted-foreground">
                    Immediate outreach with personalized offers and check-in calls
                  </p>
                </div>
                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-medium">Premium VIP Retention</h4>
                  <p className="text-sm text-muted-foreground">
                    Exclusive events, priority booking, and premium service guarantees
                  </p>
                </div>
                <div className="border-l-4 border-indigo-500 pl-4">
                  <h4 className="font-medium">Relationship Building</h4>
                  <p className="text-sm text-muted-foreground">
                    Personal touchpoints, remember preferences, and celebrate milestones
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Client Profile Dialog */}
      <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Client Value Profile</DialogTitle>
            <DialogDescription>
              Comprehensive analysis of client value and journey
            </DialogDescription>
          </DialogHeader>
          
          {selectedClient && clientJourney && (
            <div className="space-y-6">
              {/* Client Header */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <h3 className="text-xl font-bold">{selectedClient.client_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{CLIENT_TIERS[selectedClient.value_tier as keyof typeof CLIENT_TIERS]?.name}</Badge>
                    <Badge variant={getRiskBadgeVariant(selectedClient.churn_risk_score)}>
                      {selectedClient.churn_risk_score >= 80 ? 'High Risk' :
                       selectedClient.churn_risk_score >= 60 ? 'Medium Risk' : 'Low Risk'}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">${selectedClient.lifetime_value.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Lifetime Value</p>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{selectedClient.total_visits}</p>
                  <p className="text-xs text-muted-foreground">Total Visits</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">${selectedClient.average_ticket.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Average Ticket</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{selectedClient.visit_frequency_days?.toFixed(0) || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">Days Between Visits</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{selectedClient.premium_service_adoption.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Premium Services</p>
                </div>
              </div>

              {/* Scores */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Relationship Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getScoreColor(selectedClient.relationship_score)}`}>
                      {selectedClient.relationship_score.toFixed(0)}
                    </div>
                    <Progress value={selectedClient.relationship_score} className="mt-2 h-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Loyalty Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getScoreColor(selectedClient.loyalty_score)}`}>
                      {selectedClient.loyalty_score.toFixed(0)}
                    </div>
                    <Progress value={selectedClient.loyalty_score} className="mt-2 h-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Growth Potential</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getScoreColor(selectedClient.growth_potential)}`}>
                      {selectedClient.growth_potential.toFixed(0)}
                    </div>
                    <Progress value={selectedClient.growth_potential} className="mt-2 h-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Journey Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Client Journey
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Current Stage: {clientJourney.current_stage}</p>
                      <p className="text-sm text-muted-foreground">
                        {clientJourney.days_in_stage} days in this stage
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Relationship Score</p>
                      <p className="text-lg font-bold">{clientJourney.relationship_building_score.toFixed(0)}</p>
                    </div>
                  </div>
                  
                  {clientJourney.next_milestone && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium">Next Milestone</h4>
                      <p className="text-sm text-muted-foreground">{clientJourney.next_milestone.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recommendations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Recommended Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedClient.recommended_actions.slice(0, 3).map((action, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{action.title || action.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Growth Opportunities</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedClient.opportunities.slice(0, 3).map((opportunity, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{opportunity.title || opportunity.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}