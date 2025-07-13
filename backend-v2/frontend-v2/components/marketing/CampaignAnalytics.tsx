import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BarChart3, 
  TrendingUp,
  TrendingDown,
  Mail,
  MessageSquare,
  Users,
  Eye,
  MousePointer,
  DollarSign,
  Calendar,
  RefreshCw,
  Download,
  Filter,
  ArrowUp,
  ArrowDown,
  Minus,
  Target,
  Zap,
  Clock
} from 'lucide-react'
import { marketingApi } from '@/lib/api/integrations'
import { useToast } from '@/hooks/use-toast'

interface CampaignAnalyticsProps {
  campaignId?: number
  className?: string
}

interface CampaignMetrics {
  campaign_id: number
  campaign_name: string
  campaign_type: 'email' | 'sms'
  sent_count: number
  delivered_count: number
  opened_count: number
  clicked_count: number
  unsubscribed_count: number
  bounced_count: number
  conversion_count: number
  revenue_generated: number
  delivery_rate: number
  open_rate: number
  click_rate: number
  conversion_rate: number
  unsubscribe_rate: number
  bounce_rate: number
  sent_at: string
}

interface OverallAnalytics {
  total_campaigns: number
  total_sent: number
  total_revenue: number
  avg_open_rate: number
  avg_click_rate: number
  avg_conversion_rate: number
  top_performing_campaigns: CampaignMetrics[]
  recent_campaigns: CampaignMetrics[]
  performance_trends: {
    period: string
    sent: number
    opened: number
    clicked: number
    revenue: number
  }[]
}

export const CampaignAnalytics: React.FC<CampaignAnalyticsProps> = ({
  campaignId,
  className = ''
}) => {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [overallAnalytics, setOverallAnalytics] = useState<OverallAnalytics | null>(null)
  const [campaignMetrics, setCampaignMetrics] = useState<CampaignMetrics | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAnalytics()
  }, [campaignId, selectedTimeframe])

  const loadAnalytics = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (campaignId) {
        // Load specific campaign analytics
        const metrics = await marketingApi.getCampaignAnalytics(campaignId)
        setCampaignMetrics(metrics)
      } else {
        // Load overall analytics
        const analytics = await marketingApi.getOverallAnalytics()
        setOverallAnalytics(analytics)
      }
    } catch (err) {
      console.error('Failed to load analytics:', err)
      setError('Failed to load analytics data')
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="h-4 w-4 text-green-500" />
    if (current < previous) return <ArrowDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const getPerformanceColor = (rate: number, type: 'open' | 'click' | 'conversion') => {
    const thresholds = {
      open: { good: 25, excellent: 35 },
      click: { good: 3, excellent: 7 },
      conversion: { good: 2, excellent: 5 }
    }

    const threshold = thresholds[type]
    if (rate >= threshold.excellent) return 'text-green-600'
    if (rate >= threshold.good) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  // Single Campaign Analytics
  if (campaignId && campaignMetrics) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{campaignMetrics.campaign_name}</h2>
            <p className="text-muted-foreground">
              Campaign Analytics • Sent {new Date(campaignMetrics.sent_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadAnalytics}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Sent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaignMetrics.sent_count.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {formatPercentage(campaignMetrics.delivery_rate)} delivered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Opened</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaignMetrics.opened_count.toLocaleString()}</div>
              <p className={`text-xs ${getPerformanceColor(campaignMetrics.open_rate, 'open')}`}>
                {formatPercentage(campaignMetrics.open_rate)} open rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Clicked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaignMetrics.clicked_count.toLocaleString()}</div>
              <p className={`text-xs ${getPerformanceColor(campaignMetrics.click_rate, 'click')}`}>
                {formatPercentage(campaignMetrics.click_rate)} click rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(campaignMetrics.revenue_generated)}</div>
              <p className={`text-xs ${getPerformanceColor(campaignMetrics.conversion_rate, 'conversion')}`}>
                {formatPercentage(campaignMetrics.conversion_rate)} conversion
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Metrics */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Delivery Rate</span>
                  <span className="font-medium">{formatPercentage(campaignMetrics.delivery_rate)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${campaignMetrics.delivery_rate}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Open Rate</span>
                  <span className={`font-medium ${getPerformanceColor(campaignMetrics.open_rate, 'open')}`}>
                    {formatPercentage(campaignMetrics.open_rate)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${campaignMetrics.open_rate}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Click Rate</span>
                  <span className={`font-medium ${getPerformanceColor(campaignMetrics.click_rate, 'click')}`}>
                    {formatPercentage(campaignMetrics.click_rate)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full" 
                    style={{ width: `${Math.min(campaignMetrics.click_rate * 3, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Conversion Rate</span>
                  <span className={`font-medium ${getPerformanceColor(campaignMetrics.conversion_rate, 'conversion')}`}>
                    {formatPercentage(campaignMetrics.conversion_rate)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full" 
                    style={{ width: `${Math.min(campaignMetrics.conversion_rate * 5, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Campaign Type</span>
                  <Badge variant="outline">
                    {campaignMetrics.campaign_type === 'email' ? <Mail className="h-3 w-3 mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                    {campaignMetrics.campaign_type.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Bounce Rate</span>
                  <span className="font-medium">{formatPercentage(campaignMetrics.bounce_rate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Unsubscribe Rate</span>
                  <span className="font-medium">{formatPercentage(campaignMetrics.unsubscribe_rate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Revenue per Recipient</span>
                  <span className="font-medium">
                    {formatCurrency(campaignMetrics.revenue_generated / campaignMetrics.sent_count)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Overall Analytics Dashboard
  if (overallAnalytics) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Marketing Analytics</h2>
            <p className="text-muted-foreground">
              Overview of all campaign performance and trends
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm" onClick={loadAnalytics}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex gap-2">
          {[
            { key: '7d', label: '7 Days' },
            { key: '30d', label: '30 Days' },
            { key: '90d', label: '90 Days' },
            { key: '1y', label: '1 Year' }
          ].map((timeframe) => (
            <Button
              key={timeframe.key}
              size="sm"
              variant={selectedTimeframe === timeframe.key ? 'default' : 'outline'}
              onClick={() => setSelectedTimeframe(timeframe.key as any)}
            >
              {timeframe.label}
            </Button>
          ))}
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallAnalytics.total_campaigns}</div>
              <p className="text-xs text-muted-foreground">
                All time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallAnalytics.total_sent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total reach
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(overallAnalytics.total_revenue)}</div>
              <p className="text-xs text-muted-foreground">
                From campaigns
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(overallAnalytics.avg_open_rate)}</div>
              <p className="text-xs text-muted-foreground">
                Email campaigns
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="campaigns">Top Campaigns</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Open Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">
                    {formatPercentage(overallAnalytics.avg_open_rate)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Industry average: 21.3%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MousePointer className="h-5 w-5" />
                    Click Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">
                    {formatPercentage(overallAnalytics.avg_click_rate)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Industry average: 2.6%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Conversion Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">
                    {formatPercentage(overallAnalytics.avg_conversion_rate)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Industry average: 1.8%
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Performing Campaigns</CardTitle>
                <CardDescription>
                  Based on conversion rate and revenue generated
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overallAnalytics.top_performing_campaigns.map((campaign, index) => (
                    <div key={campaign.campaign_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <div>
                          <h5 className="font-medium text-sm">{campaign.campaign_name}</h5>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>{campaign.sent_count} sent</span>
                            <span>{formatPercentage(campaign.open_rate)} opened</span>
                            <span>{formatPercentage(campaign.click_rate)} clicked</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(campaign.revenue_generated)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatPercentage(campaign.conversion_rate)} conversion
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Trends</CardTitle>
                <CardDescription>
                  Campaign performance over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Performance trend charts will be displayed here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="py-12 text-center">
        <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No Analytics Data</h3>
        <p className="text-muted-foreground">
          Send your first campaign to start seeing analytics
        </p>
      </CardContent>
    </Card>
  )
}