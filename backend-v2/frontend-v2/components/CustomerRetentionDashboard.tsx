/**
 * Customer Retention and Loyalty Program Dashboard for BookedBarber V2
 * 
 * Comprehensive dashboard aligned with Six Figure Barber methodology:
 * - Client retention analytics and insights
 * - Loyalty program management
 * - Tier progression tracking
 * - Automated retention campaigns
 * - Revenue optimization through retention
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { 
  Users, 
  TrendingUp, 
  Trophy, 
  Star, 
  Gift, 
  Target, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Heart,
  Crown,
  Award,
  Zap,
  Mail,
  MessageSquare
} from 'lucide-react'
import { toast } from 'sonner'

// ================================================================================
// TYPES AND INTERFACES
// ================================================================================

interface RetentionMetrics {
  client_id: number
  lifetime_value: number
  visit_frequency: number
  last_visit_days_ago: number
  tier: string
  status: string
  points_balance: number
  next_reward_threshold: number
  churn_risk_score: number
}

interface LoyaltyTransaction {
  id: string
  points: number
  activity_type: string
  description: string
  created_at: string
}

interface RetentionCampaign {
  campaign_id: string
  campaign_type: string
  status: string
  trigger_date: string
}

interface ClientLoyaltyDashboard {
  client_id: number
  loyalty_tier: string
  points_balance: number
  lifetime_value: number
  tier_progress: {
    current_tier: string
    next_tier?: string
    progress: number
    requirements: {
      visits: number
      spend: number
    }
  }
  available_rewards: Array<{
    id: string
    name: string
    points: number
    type: string
  }>
  recent_transactions: LoyaltyTransaction[]
  active_campaigns: RetentionCampaign[]
  retention_insights: {
    status: string
    churn_risk: number
    visit_frequency: number
    last_visit_days_ago: number
  }
}

interface CampaignTemplate {
  name: string
  description: string
  target_criteria: Record<string, any>
  message_sequence: string[]
  duration_days: number
  expected_conversion_rate: number
}

// ================================================================================
// UTILITY FUNCTIONS
// ================================================================================

const getTierColor = (tier: string): string => {
  switch (tier.toLowerCase()) {
    case 'newcomer': return 'bg-gray-100 text-gray-800'
    case 'regular': return 'bg-blue-100 text-blue-800'
    case 'vip': return 'bg-purple-100 text-purple-800'
    case 'platinum': return 'bg-yellow-100 text-yellow-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getTierIcon = (tier: string) => {
  switch (tier.toLowerCase()) {
    case 'newcomer': return <Users className="w-4 h-4" />
    case 'regular': return <Star className="w-4 h-4" />
    case 'vip': return <Crown className="w-4 h-4" />
    case 'platinum': return <Award className="w-4 h-4" />
    default: return <Users className="w-4 h-4" />
  }
}

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'active': return 'bg-green-100 text-green-800'
    case 'at_risk': return 'bg-yellow-100 text-yellow-800'
    case 'lapsed': return 'bg-orange-100 text-orange-800'
    case 'churned': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getRiskLevel = (score: number): string => {
  if (score < 0.3) return 'Low'
  if (score < 0.6) return 'Medium'
  return 'High'
}

const getRiskColor = (score: number): string => {
  if (score < 0.3) return 'text-green-600'
  if (score < 0.6) return 'text-yellow-600'
  return 'text-red-600'
}

// ================================================================================
// MAIN COMPONENT
// ================================================================================

export default function CustomerRetentionDashboard() {
  // State management
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [clientDashboard, setClientDashboard] = useState<ClientLoyaltyDashboard | null>(null)
  const [campaignTemplates, setCampaignTemplates] = useState<Record<string, CampaignTemplate>>({})
  const [isLoading, setIsLoading] = useState(false)
  
  // Form states
  const [pointsForm, setPointsForm] = useState({
    client_id: '',
    activity_type: 'booking_completed',
    base_points: 100,
    context: {}
  })
  
  const [campaignForm, setCampaignForm] = useState({
    client_ids: [] as number[],
    campaign_type: 'welcome_series',
    custom_config: {}
  })

  // ================================================================================
  // API FUNCTIONS
  // ================================================================================

  const fetchClientDashboard = async (clientId: string) => {
    if (!clientId) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/v2/customer-retention/dashboard/client/${clientId}`)
      if (!response.ok) throw new Error('Failed to fetch client dashboard')
      
      const data = await response.json()
      setClientDashboard(data)
    } catch (error) {
      console.error('Error fetching client dashboard:', error)
      toast.error('Failed to load client loyalty dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCampaignTemplates = async () => {
    try {
      const response = await fetch('/api/v2/customer-retention/campaigns/templates')
      if (!response.ok) throw new Error('Failed to fetch campaign templates')
      
      const data = await response.json()
      setCampaignTemplates(data.templates)
    } catch (error) {
      console.error('Error fetching campaign templates:', error)
      toast.error('Failed to load campaign templates')
    }
  }

  const awardPoints = async () => {
    if (!pointsForm.client_id) {
      toast.error('Please select a client')
      return
    }

    try {
      const response = await fetch('/api/v2/customer-retention/points/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: parseInt(pointsForm.client_id),
          activity_type: pointsForm.activity_type,
          base_points: pointsForm.base_points,
          context: pointsForm.context
        })
      })

      if (!response.ok) throw new Error('Failed to award points')
      
      const result = await response.json()
      toast.success(`Successfully awarded ${result.points_awarded} points!`)
      
      // Refresh client dashboard if viewing the same client
      if (selectedClient === pointsForm.client_id) {
        await fetchClientDashboard(selectedClient)
      }
      
      // Reset form
      setPointsForm(prev => ({ ...prev, context: {} }))
    } catch (error) {
      console.error('Error awarding points:', error)
      toast.error('Failed to award loyalty points')
    }
  }

  const createCampaign = async () => {
    if (campaignForm.client_ids.length === 0) {
      toast.error('Please select at least one client')
      return
    }

    try {
      const response = await fetch('/api/v2/customer-retention/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignForm)
      })

      if (!response.ok) throw new Error('Failed to create campaign')
      
      const result = await response.json()
      toast.success(`Campaign created successfully! Targeting ${result.clients_targeted} clients.`)
      
      // Reset form
      setCampaignForm(prev => ({ ...prev, client_ids: [], custom_config: {} }))
    } catch (error) {
      console.error('Error creating campaign:', error)
      toast.error('Failed to create retention campaign')
    }
  }

  // ================================================================================
  // EFFECTS
  // ================================================================================

  useEffect(() => {
    fetchCampaignTemplates()
  }, [])

  useEffect(() => {
    if (selectedClient) {
      fetchClientDashboard(selectedClient)
    }
  }, [selectedClient])

  // ================================================================================
  // RENDER COMPONENTS
  // ================================================================================

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">+8% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Lifetime Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2,456</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points Awarded</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45,678</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">3 pending review</p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Loyalty Tier Distribution</CardTitle>
          <CardDescription>Client distribution across loyalty tiers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { tier: 'Newcomer', count: 423, percentage: 34 },
              { tier: 'Regular', count: 567, percentage: 46 },
              { tier: 'VIP', count: 189, percentage: 15 },
              { tier: 'Platinum', count: 55, percentage: 5 }
            ].map((item) => (
              <div key={item.tier} className="text-center">
                <div className="flex items-center justify-center mb-2">
                  {getTierIcon(item.tier)}
                  <Badge className={`ml-2 ${getTierColor(item.tier)}`}>
                    {item.tier}
                  </Badge>
                </div>
                <div className="text-2xl font-bold">{item.count}</div>
                <div className="text-sm text-muted-foreground">{item.percentage}%</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderClientAnalysisTab = () => (
    <div className="space-y-6">
      {/* Client Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Client Analysis</CardTitle>
          <CardDescription>Analyze individual client retention metrics and loyalty status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="client-select">Select Client</Label>
              <Input
                id="client-select"
                type="number"
                placeholder="Enter client ID..."
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
              />
            </div>
            <Button onClick={() => fetchClientDashboard(selectedClient)} disabled={!selectedClient || isLoading}>
              {isLoading ? 'Loading...' : 'Analyze Client'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Client Dashboard */}
      {clientDashboard && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Client Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Client Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Loyalty Tier</span>
                <Badge className={getTierColor(clientDashboard.loyalty_tier)}>
                  {getTierIcon(clientDashboard.loyalty_tier)}
                  <span className="ml-1">{clientDashboard.loyalty_tier}</span>
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Points Balance</span>
                <span className="text-lg font-bold text-primary">{clientDashboard.points_balance}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Lifetime Value</span>
                <span className="text-lg font-bold">${clientDashboard.lifetime_value.toFixed(2)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Retention Status</span>
                <Badge className={getStatusColor(clientDashboard.retention_insights.status)}>
                  {clientDashboard.retention_insights.status}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Churn Risk</span>
                <span className={`font-medium ${getRiskColor(clientDashboard.retention_insights.churn_risk)}`}>
                  {getRiskLevel(clientDashboard.retention_insights.churn_risk)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tier Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Tier Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {clientDashboard.tier_progress.next_tier ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress to {clientDashboard.tier_progress.next_tier}</span>
                      <span>{clientDashboard.tier_progress.progress}%</span>
                    </div>
                    <Progress value={clientDashboard.tier_progress.progress} className="w-full" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Visits Needed</span>
                      <div className="font-medium">{clientDashboard.tier_progress.requirements.visits}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Spend Needed</span>
                      <div className="font-medium">${clientDashboard.tier_progress.requirements.spend}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <Crown className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                  <p className="text-sm font-medium">Highest Tier Achieved!</p>
                  <p className="text-xs text-muted-foreground">Client has reached Platinum status</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Rewards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Available Rewards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clientDashboard.available_rewards.length > 0 ? (
                  clientDashboard.available_rewards.map((reward) => (
                    <div key={reward.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{reward.name}</div>
                        <div className="text-sm text-muted-foreground">{reward.type}</div>
                      </div>
                      <Badge variant="outline">{reward.points} pts</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No rewards available. Client needs more points.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clientDashboard.recent_transactions.length > 0 ? (
                  clientDashboard.recent_transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{transaction.description}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant={transaction.points > 0 ? "default" : "destructive"}>
                        {transaction.points > 0 ? '+' : ''}{transaction.points}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent transactions.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )

  const renderPointsManagementTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Award Loyalty Points
          </CardTitle>
          <CardDescription>Award points to clients for various activities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="points-client-id">Client ID</Label>
              <Input
                id="points-client-id"
                type="number"
                placeholder="Enter client ID..."
                value={pointsForm.client_id}
                onChange={(e) => setPointsForm(prev => ({ ...prev, client_id: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="points-activity">Activity Type</Label>
              <Select 
                value={pointsForm.activity_type} 
                onValueChange={(value) => setPointsForm(prev => ({ ...prev, activity_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="booking_completed">Booking Completed</SelectItem>
                  <SelectItem value="referral_successful">Successful Referral</SelectItem>
                  <SelectItem value="review_left">Review Left</SelectItem>
                  <SelectItem value="social_share">Social Media Share</SelectItem>
                  <SelectItem value="birthday_bonus">Birthday Bonus</SelectItem>
                  <SelectItem value="loyalty_milestone">Loyalty Milestone</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="base-points">Base Points</Label>
            <Input
              id="base-points"
              type="number"
              placeholder="100"
              value={pointsForm.base_points}
              onChange={(e) => setPointsForm(prev => ({ ...prev, base_points: parseInt(e.target.value) || 0 }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Final points will be multiplied by the client's tier bonus
            </p>
          </div>
          
          <Button onClick={awardPoints} className="w-full">
            <Zap className="w-4 h-4 mr-2" />
            Award Points
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  const renderCampaignsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Create Retention Campaign
          </CardTitle>
          <CardDescription>Launch targeted campaigns to improve client retention</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="campaign-type">Campaign Type</Label>
            <Select 
              value={campaignForm.campaign_type}
              onValueChange={(value) => setCampaignForm(prev => ({ ...prev, campaign_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="welcome_series">Welcome Series</SelectItem>
                <SelectItem value="tier_upgrade">Tier Upgrade</SelectItem>
                <SelectItem value="win_back">Win-Back Campaign</SelectItem>
                <SelectItem value="vip_experience">VIP Experience</SelectItem>
                <SelectItem value="referral_incentive">Referral Incentive</SelectItem>
              </SelectContent>
            </Select>
            
            {campaignTemplates[campaignForm.campaign_type] && (
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <h4 className="font-medium">{campaignTemplates[campaignForm.campaign_type].name}</h4>
                <p className="text-sm text-muted-foreground">
                  {campaignTemplates[campaignForm.campaign_type].description}
                </p>
                <div className="flex gap-4 mt-2 text-xs">
                  <span>Duration: {campaignTemplates[campaignForm.campaign_type].duration_days} days</span>
                  <span>Expected Rate: {(campaignTemplates[campaignForm.campaign_type].expected_conversion_rate * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}
          </div>
          
          <div>
            <Label htmlFor="client-ids">Target Client IDs</Label>
            <Textarea
              id="client-ids"
              placeholder="Enter client IDs separated by commas (e.g., 123, 456, 789)"
              onChange={(e) => {
                const ids = e.target.value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
                setCampaignForm(prev => ({ ...prev, client_ids: ids }))
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {campaignForm.client_ids.length} clients will be targeted
            </p>
          </div>
          
          <Button onClick={createCampaign} className="w-full">
            <Mail className="w-4 h-4 mr-2" />
            Launch Campaign
          </Button>
        </CardContent>
      </Card>

      {/* Campaign Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Available Campaign Templates</CardTitle>
          <CardDescription>Six Figure Barber methodology-aligned retention campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(campaignTemplates).map(([key, template]) => (
              <div key={key} className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">{template.name}</h4>
                <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {template.duration_days} days • {(template.expected_conversion_rate * 100).toFixed(0)}% rate
                  </span>
                  <Badge variant="outline">{template.message_sequence.length} messages</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // ================================================================================
  // MAIN RENDER
  // ================================================================================

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Retention Dashboard</h1>
          <p className="text-muted-foreground">
            Manage loyalty programs and retention campaigns with Six Figure Barber methodology
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          <span className="text-sm text-muted-foreground">Building lasting relationships</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clients">Client Analysis</TabsTrigger>
          <TabsTrigger value="points">Points Management</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {renderOverviewTab()}
        </TabsContent>

        <TabsContent value="clients">
          {renderClientAnalysisTab()}
        </TabsContent>

        <TabsContent value="points">
          {renderPointsManagementTab()}
        </TabsContent>

        <TabsContent value="campaigns">
          {renderCampaignsTab()}
        </TabsContent>
      </Tabs>
    </div>
  )
}