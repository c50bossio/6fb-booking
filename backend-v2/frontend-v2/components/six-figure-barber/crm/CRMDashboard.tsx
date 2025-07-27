"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  TrendingUp,
  Heart,
  MessageCircle,
  Target,
  AlertTriangle,
  Crown,
  Star,
  ChevronRight,
  Activity,
  DollarSign,
  Clock,
  Zap
} from 'lucide-react';

// Types
interface CRMAnalyticsSummary {
  summary_date: string;
  period: string;
  client_metrics: {
    total_clients: number;
    new_clients_acquired: number;
    clients_retained: number;
    clients_lost: number;
    client_growth_rate: number;
  };
  tier_distribution: {
    premium_vip: number;
    core_regular: number;
    developing: number;
    occasional: number;
    at_risk: number;
  };
  relationship_metrics: {
    average_relationship_score: number;
    average_engagement_score: number;
    communication_response_rate: number;
    relationship_improvement_rate: number;
  };
  financial_metrics: {
    total_client_lifetime_value: number;
    average_client_lifetime_value: number;
    revenue_per_client: number;
  };
  retention_metrics: {
    retention_rate: number;
    churn_rate: number;
    average_churn_risk_score: number;
    clients_at_high_churn_risk: number;
  };
  automation_metrics: {
    automated_workflows_executed: number;
    automation_success_rate: number;
    time_saved_hours: number;
  };
  six_figure_barber_alignment: {
    premium_positioning_score: number;
    relationship_building_effectiveness: number;
    value_creation_success_rate: number;
    methodology_alignment_score: number;
  };
}

interface ClientDistribution {
  tier_distribution: Record<string, number>;
  stage_distribution: Record<string, number>;
  total_clients_analyzed: number;
}

const CRMDashboard: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<CRMAnalyticsSummary | null>(null);
  const [distributionData, setDistributionData] = useState<ClientDistribution | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load analytics summary
      const analyticsResponse = await fetch(
        `/api/v2/six-figure-barber/crm/analytics/summary?period=${selectedPeriod}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );

      if (!analyticsResponse.ok) {
        throw new Error('Failed to load analytics data');
      }

      const analytics = await analyticsResponse.json();
      setAnalyticsData(analytics);

      // Load client distribution
      const distributionResponse = await fetch(
        '/api/v2/six-figure-barber/crm/analytics/client-distribution',
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );

      if (!distributionResponse.ok) {
        throw new Error('Failed to load distribution data');
      }

      const distribution = await distributionResponse.json();
      setDistributionData(distribution);

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getTierColor = (tier: string) => {
    const colors = {
      premium_vip: 'bg-gradient-to-r from-purple-500 to-pink-500',
      core_regular: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      developing: 'bg-gradient-to-r from-green-500 to-emerald-500',
      occasional: 'bg-gradient-to-r from-yellow-500 to-orange-500',
      at_risk: 'bg-gradient-to-r from-red-500 to-rose-500',
    };
    return colors[tier as keyof typeof colors] || 'bg-gray-500';
  };

  const getTierIcon = (tier: string) => {
    const icons = {
      premium_vip: Crown,
      core_regular: Star,
      developing: TrendingUp,
      occasional: Users,
      at_risk: AlertTriangle,
    };
    const Icon = icons[tier as keyof typeof icons] || Users;
    return <Icon className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!analyticsData || !distributionData) {
    return (
      <Alert>
        <AlertDescription>No data available</AlertDescription>
      </Alert>
    );
  }

  const totalClients = analyticsData.client_metrics.total_clients;
  const churnRiskClients = analyticsData.retention_metrics.clients_at_high_churn_risk;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Six Figure Barber CRM</h1>
          <p className="text-gray-600 mt-1">
            Advanced client relationship management aligned with premium barbering methodology
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Clients</p>
                <p className="text-2xl font-bold text-blue-900">{totalClients}</p>
                <p className="text-xs text-blue-600">
                  {analyticsData.client_metrics.client_growth_rate > 0 ? '+' : ''}
                  {formatPercentage(analyticsData.client_metrics.client_growth_rate)} growth
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Avg LTV</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(analyticsData.financial_metrics.average_client_lifetime_value)}
                </p>
                <p className="text-xs text-green-600">Per client value</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Retention Rate</p>
                <p className="text-2xl font-bold text-purple-900">
                  {formatPercentage(analyticsData.retention_metrics.retention_rate)}
                </p>
                <p className="text-xs text-purple-600">Client retention</p>
              </div>
              <Heart className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">At Risk</p>
                <p className="text-2xl font-bold text-orange-900">{churnRiskClients}</p>
                <p className="text-xs text-orange-600">Clients need attention</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clients">Client Tiers</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Six Figure Barber Methodology Alignment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Six Figure Barber Alignment
                </CardTitle>
                <CardDescription>
                  Performance across core methodology principles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Premium Positioning</span>
                      <span>{formatPercentage(analyticsData.six_figure_barber_alignment.premium_positioning_score)}</span>
                    </div>
                    <Progress value={analyticsData.six_figure_barber_alignment.premium_positioning_score} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Relationship Building</span>
                      <span>{formatPercentage(analyticsData.six_figure_barber_alignment.relationship_building_effectiveness)}</span>
                    </div>
                    <Progress value={analyticsData.six_figure_barber_alignment.relationship_building_effectiveness} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Value Creation</span>
                      <span>{formatPercentage(analyticsData.six_figure_barber_alignment.value_creation_success_rate)}</span>
                    </div>
                    <Progress value={analyticsData.six_figure_barber_alignment.value_creation_success_rate} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Overall Methodology Score</span>
                      <span>{formatPercentage(analyticsData.six_figure_barber_alignment.methodology_alignment_score)}</span>
                    </div>
                    <Progress value={analyticsData.six_figure_barber_alignment.methodology_alignment_score} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Relationship Quality Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Relationship Quality
                </CardTitle>
                <CardDescription>
                  Client engagement and relationship strength
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-900">
                      {analyticsData.relationship_metrics.average_relationship_score.toFixed(1)}
                    </div>
                    <div className="text-sm text-blue-600">Relationship Score</div>
                  </div>
                  
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-900">
                      {analyticsData.relationship_metrics.average_engagement_score.toFixed(1)}
                    </div>
                    <div className="text-sm text-green-600">Engagement Score</div>
                  </div>
                  
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-900">
                      {formatPercentage(analyticsData.relationship_metrics.communication_response_rate)}
                    </div>
                    <div className="text-sm text-purple-600">Response Rate</div>
                  </div>
                  
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-900">
                      {formatPercentage(analyticsData.relationship_metrics.relationship_improvement_rate)}
                    </div>
                    <div className="text-sm text-orange-600">Improvement Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Client Journey Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Client Journey Distribution</CardTitle>
              <CardDescription>
                Current stage distribution across your client base
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Object.entries(distributionData.stage_distribution).map(([stage, count]) => (
                  <div key={stage} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-xl font-bold text-gray-900">{count}</div>
                    <div className="text-xs text-gray-600 capitalize">
                      {stage.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Client Tiers Tab */}
        <TabsContent value="clients" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Value Tier Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Client Value Tiers</CardTitle>
                <CardDescription>
                  Distribution across Six Figure Barber value tiers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(analyticsData.tier_distribution).map(([tier, count]) => {
                  const percentage = totalClients > 0 ? (count / totalClients) * 100 : 0;
                  return (
                    <div key={tier} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getTierColor(tier)}`}></div>
                        <div className="flex items-center gap-2">
                          {getTierIcon(tier)}
                          <span className="font-medium capitalize">
                            {tier.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{count}</Badge>
                        <span className="text-sm text-gray-600">{formatPercentage(percentage)}</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Retention Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Retention Insights
                </CardTitle>
                <CardDescription>
                  Client retention and churn risk analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-900">
                      {formatPercentage(analyticsData.retention_metrics.retention_rate)}
                    </div>
                    <div className="text-sm text-green-600">Retention Rate</div>
                  </div>
                  
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-900">
                      {formatPercentage(analyticsData.retention_metrics.churn_rate)}
                    </div>
                    <div className="text-sm text-red-600">Churn Rate</div>
                  </div>
                </div>
                
                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-orange-800">High Risk Clients</span>
                    <Badge variant="destructive">{churnRiskClients}</Badge>
                  </div>
                  <div className="text-xs text-orange-600 mt-1">
                    Average risk score: {analyticsData.retention_metrics.average_churn_risk_score.toFixed(1)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Communication Tab */}
        <TabsContent value="communication" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Communication Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-900">
                    {formatPercentage(analyticsData.relationship_metrics.communication_response_rate)}
                  </div>
                  <div className="text-sm text-blue-600">Response Rate</div>
                </div>
                
                <Button className="w-full" variant="outline" size="sm">
                  View Communication Analytics
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Activity className="w-4 h-4" />
                    <span>Communication tracking active</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Zap className="w-4 h-4" />
                    <span>Automation workflows running</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Real-time engagement tracking</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" size="sm">
                  Send Batch Communication
                </Button>
                <Button className="w-full" variant="outline" size="sm">
                  Create Touchpoint Plan
                </Button>
                <Button className="w-full" variant="outline" size="sm">
                  Review At-Risk Clients
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Automation Performance
                </CardTitle>
                <CardDescription>
                  Automated workflow effectiveness and efficiency
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-900">
                      {analyticsData.automation_metrics.automated_workflows_executed}
                    </div>
                    <div className="text-sm text-green-600">Workflows Executed</div>
                  </div>
                  
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-900">
                      {formatPercentage(analyticsData.automation_metrics.automation_success_rate)}
                    </div>
                    <div className="text-sm text-blue-600">Success Rate</div>
                  </div>
                </div>
                
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-800">Time Saved</span>
                    <span className="text-lg font-bold text-purple-900">
                      {analyticsData.automation_metrics.time_saved_hours.toFixed(1)}h
                    </span>
                  </div>
                  <div className="text-xs text-purple-600 mt-1">
                    Through automated processes
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Workflow Management</CardTitle>
                <CardDescription>
                  Create and manage automated client workflows
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full">
                  Create New Workflow
                </Button>
                <Button className="w-full" variant="outline">
                  Manage Existing Workflows
                </Button>
                <Button className="w-full" variant="outline">
                  View Execution History
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CRM Performance Insights</CardTitle>
              <CardDescription>
                Key insights and recommendations for optimizing client relationships
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Opportunities */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2">Opportunities</h4>
                  <ul className="space-y-1 text-sm text-green-700">
                    <li>• {analyticsData.tier_distribution.developing} clients ready for tier upgrade</li>
                    <li>• High engagement score indicates strong relationships</li>
                    <li>• Automation saving {analyticsData.automation_metrics.time_saved_hours.toFixed(1)} hours</li>
                  </ul>
                </div>

                {/* Areas for Improvement */}
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-800 mb-2">Focus Areas</h4>
                  <ul className="space-y-1 text-sm text-orange-700">
                    <li>• {churnRiskClients} clients at high churn risk</li>
                    <li>• Communication response rate could improve</li>
                    <li>• At-risk tier needs immediate attention</li>
                  </ul>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Recommended Actions</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <Target className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-blue-900">Review At-Risk Clients</div>
                      <div className="text-sm text-blue-700">
                        Focus on {churnRiskClients} clients with high churn risk scores
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-purple-900">Tier Progression Campaign</div>
                      <div className="text-sm text-purple-700">
                        Target developing clients for premium service adoption
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CRMDashboard;