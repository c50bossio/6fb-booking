/**
 * Unified Payment Dashboard Component
 * Comprehensive analytics dashboard combining all payment flows with Six Figure Barber insights
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/use-toast';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Target,
  Zap,
  Calendar,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Clock
} from 'lucide-react';

interface UnifiedAnalyticsData {
  period: string;
  date_range: {
    start_date: string;
    end_date: string;
  };
  centralized_payments: PaymentModeData;
  decentralized_payments: PaymentModeData;
  commission_data: CommissionData;
  combined_metrics: CombinedMetrics;
  trend_analysis: TrendAnalysis;
  mode_comparison: ModeComparison;
  six_figure_insights: SixFigureInsights;
  recommendations: string[];
  generated_at: string;
}

interface PaymentModeData {
  total_transactions: number;
  total_volume: number;
  average_transaction: number;
  success_rate: number;
  net_earnings: number;
}

interface CommissionData {
  total_collections: number;
  total_amount: number;
  amount_collected: number;
  success_rate: number;
  outstanding_amount: number;
}

interface CombinedMetrics {
  total_transactions: number;
  total_volume: number;
  total_net_earnings: number;
  weighted_success_rate: number;
  average_transaction: number;
  total_commission_activity: number;
  commission_collection_rate: number;
}

interface TrendAnalysis {
  total_volume_trend: number;
  total_transactions_trend: number;
  net_earnings_trend: number;
}

interface ModeComparison {
  centralized_efficiency: number;
  decentralized_efficiency: number;
  optimal_mode: string;
  volume_distribution: {
    centralized_percentage: number;
    decentralized_percentage: number;
  };
}

interface SixFigureInsights {
  target_annual_revenue: number;
  target_monthly_revenue: number;
  current_monthly_revenue: number;
  progress_percentage: number;
  projected_annual: number;
  recommendations: string[];
  months_to_goal: number;
}

interface RealtimeDashboardData {
  today: CombinedMetrics;
  month_to_date: CombinedMetrics;
  outstanding_commission: {
    amount: number;
    eligible_for_collection: boolean;
    threshold: number;
  };
  next_collection: {
    id: number;
    amount: number;
    scheduled_date: string;
    type: string;
    description: string;
  } | null;
  recent_transactions: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    created_at: string;
    description: string;
  }>;
  last_updated: string;
}

export const UnifiedPaymentDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<UnifiedAnalyticsData | null>(null);
  const [realtimeData, setRealtimeData] = useState<RealtimeDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30_days');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
    loadRealtimeData();
    
    // Set up real-time data refresh
    const interval = setInterval(loadRealtimeData, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/unified-payment-analytics/comprehensive?period=${selectedPeriod}&include_projections=true`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        throw new Error('Failed to load analytics');
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRealtimeData = async () => {
    try {
      const response = await fetch('/api/v1/unified-payment-analytics/dashboard');
      if (response.ok) {
        const data = await response.json();
        setRealtimeData(data);
      }
    } catch (error) {
      console.error('Failed to load realtime data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAnalyticsData(), loadRealtimeData()]);
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Dashboard data has been updated"
    });
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/v1/unified-payment-analytics/export?period=${selectedPeriod}&format=json`);
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export data:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export analytics data",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number, includeSign: boolean = true) => {
    const sign = includeSign && value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getTrendIcon = (value: number) => {
    return value >= 0 ? (
      <ArrowUpRight className="h-4 w-4 text-green-500" />
    ) : (
      <ArrowDownRight className="h-4 w-4 text-red-500" />
    );
  };

  const getTrendColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <div>Loading analytics dashboard...</div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="font-medium">No Analytics Data</h3>
              <p className="text-sm text-muted-foreground">
                Start processing payments to see your unified analytics dashboard
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Unified insights across all payment modes and Six Figure Barber progress
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7_days">Last 7 days</SelectItem>
              <SelectItem value="30_days">Last 30 days</SelectItem>
              <SelectItem value="90_days">Last 3 months</SelectItem>
              <SelectItem value="1_year">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Six Figure Barber Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Six Figure Barber Progress
          </CardTitle>
          <CardDescription>Your journey toward six-figure annual earnings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{formatCurrency(analytics.six_figure_insights.target_monthly_revenue)}</div>
              <div className="text-sm text-muted-foreground">Monthly Goal</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {analytics.six_figure_insights.progress_percentage.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(analytics.six_figure_insights.current_monthly_revenue)}
              </div>
              <div className="text-sm text-muted-foreground">Current Monthly</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(analytics.six_figure_insights.projected_annual)}
              </div>
              <div className="text-sm text-muted-foreground">Projected Annual</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to Six Figures</span>
              <span>{analytics.six_figure_insights.progress_percentage.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(analytics.six_figure_insights.progress_percentage, 100)} className="h-3" />
          </div>
          
          {/* Six Figure Recommendations */}
          {analytics.six_figure_insights.recommendations.length > 0 && (
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                <strong>Six Figure Tip:</strong> {analytics.six_figure_insights.recommendations[0]}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Real-time Metrics */}
      {realtimeData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today's Earnings</p>
                  <p className="text-2xl font-bold">{formatCurrency(realtimeData.today.total_net_earnings)}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Month to Date</p>
                  <p className="text-2xl font-bold">{formatCurrency(realtimeData.month_to_date.total_net_earnings)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Outstanding Commission</p>
                  <p className="text-2xl font-bold">{formatCurrency(realtimeData.outstanding_commission.amount)}</p>
                </div>
                <div className="flex flex-col items-center">
                  <DollarSign className="h-6 w-6 text-orange-500" />
                  {realtimeData.outstanding_commission.eligible_for_collection && (
                    <Badge variant="secondary" className="text-xs mt-1">Ready</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{analytics.combined_metrics.weighted_success_rate.toFixed(1)}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="comparison">Mode Comparison</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Combined Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Combined Performance</CardTitle>
              <CardDescription>Unified metrics across all payment modes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {analytics.combined_metrics.total_transactions}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Transactions</div>
                  <div className="flex items-center justify-center mt-2">
                    {getTrendIcon(analytics.trend_analysis.total_transactions_trend)}
                    <span className={getTrendColor(analytics.trend_analysis.total_transactions_trend)}>
                      {formatPercentage(analytics.trend_analysis.total_transactions_trend)}
                    </span>
                  </div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(analytics.combined_metrics.total_volume)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Volume</div>
                  <div className="flex items-center justify-center mt-2">
                    {getTrendIcon(analytics.trend_analysis.total_volume_trend)}
                    <span className={getTrendColor(analytics.trend_analysis.total_volume_trend)}>
                      {formatPercentage(analytics.trend_analysis.total_volume_trend)}
                    </span>
                  </div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(analytics.combined_metrics.total_net_earnings)}
                  </div>
                  <div className="text-sm text-muted-foreground">Net Earnings</div>
                  <div className="flex items-center justify-center mt-2">
                    {getTrendIcon(analytics.trend_analysis.net_earnings_trend)}
                    <span className={getTrendColor(analytics.trend_analysis.net_earnings_trend)}>
                      {formatPercentage(analytics.trend_analysis.net_earnings_trend)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          {realtimeData && realtimeData.recent_transactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Your latest payment activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {realtimeData.recent_transactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {transaction.type === 'centralized' ? (
                          <CreditCard className="h-5 w-5 text-blue-500" />
                        ) : (
                          <Zap className="h-5 w-5 text-green-500" />
                        )}
                        <div>
                          <div className="font-medium">{transaction.description}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(transaction.amount)}</div>
                        <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trend Analysis</CardTitle>
              <CardDescription>Performance trends compared to previous period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="font-medium">Revenue Trend</div>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(analytics.trend_analysis.total_volume_trend)}
                    <span className={`text-2xl font-bold ${getTrendColor(analytics.trend_analysis.total_volume_trend)}`}>
                      {formatPercentage(analytics.trend_analysis.total_volume_trend)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Compared to previous {selectedPeriod.replace('_', ' ')}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="font-medium">Transaction Trend</div>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(analytics.trend_analysis.total_transactions_trend)}
                    <span className={`text-2xl font-bold ${getTrendColor(analytics.trend_analysis.total_transactions_trend)}`}>
                      {formatPercentage(analytics.trend_analysis.total_transactions_trend)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Transaction volume change
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="font-medium">Earnings Trend</div>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(analytics.trend_analysis.net_earnings_trend)}
                    <span className={`text-2xl font-bold ${getTrendColor(analytics.trend_analysis.net_earnings_trend)}`}>
                      {formatPercentage(analytics.trend_analysis.net_earnings_trend)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Net earnings change
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          {/* Payment Mode Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Centralized Payments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Transactions</div>
                    <div className="text-2xl font-bold">{analytics.centralized_payments.total_transactions}</div>
                  </div>
                  <div>
                    <div className="font-medium">Volume</div>
                    <div className="text-2xl font-bold">{formatCurrency(analytics.centralized_payments.total_volume)}</div>
                  </div>
                  <div>
                    <div className="font-medium">Success Rate</div>
                    <div className="text-lg font-semibold text-green-600">
                      {analytics.centralized_payments.success_rate.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Net Earnings</div>
                    <div className="text-lg font-semibold text-green-600">
                      {formatCurrency(analytics.centralized_payments.net_earnings)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Decentralized Payments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Transactions</div>
                    <div className="text-2xl font-bold">{analytics.decentralized_payments.total_transactions}</div>
                  </div>
                  <div>
                    <div className="font-medium">Volume</div>
                    <div className="text-2xl font-bold">{formatCurrency(analytics.decentralized_payments.total_volume)}</div>
                  </div>
                  <div>
                    <div className="font-medium">Success Rate</div>
                    <div className="text-lg font-semibold text-green-600">
                      {analytics.decentralized_payments.success_rate.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Net Earnings</div>
                    <div className="text-lg font-semibold text-green-600">
                      {formatCurrency(analytics.decentralized_payments.net_earnings)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Optimal Mode Recommendation */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Mode Optimization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center p-6 bg-blue-50 rounded-lg">
                <div className="text-lg font-medium mb-2">Recommended Payment Mode</div>
                <div className="text-3xl font-bold text-blue-600 capitalize mb-4">
                  {analytics.mode_comparison.optimal_mode}
                </div>
                <div className="text-sm text-muted-foreground">
                  Based on your current transaction patterns and volume distribution
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Commission Overview</CardTitle>
              <CardDescription>Track commission collections and outstanding amounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(analytics.commission_data.outstanding_amount)}
                  </div>
                  <div className="text-sm text-muted-foreground">Outstanding</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(analytics.commission_data.amount_collected)}
                  </div>
                  <div className="text-sm text-muted-foreground">Collected</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {analytics.commission_data.success_rate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Collection Rate</div>
                </div>
              </div>

              {/* Next Collection */}
              {realtimeData?.next_collection && (
                <Alert className="mt-6">
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Next Collection:</strong> {formatCurrency(realtimeData.next_collection.amount)} 
                    scheduled for {new Date(realtimeData.next_collection.scheduled_date).toLocaleDateString()}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Personalized Recommendations
              </CardTitle>
              <CardDescription>AI-powered insights to optimize your earnings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.recommendations.map((recommendation, index) => (
                  <Alert key={index}>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Recommendation {index + 1}:</strong> {recommendation}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Six Figure Barber Specific Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Six Figure Barber Insights</CardTitle>
              <CardDescription>Methodology-specific recommendations for reaching your goals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.six_figure_insights.recommendations.map((insight, index) => (
                  <Alert key={index}>
                    <Target className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Six Figure Tip:</strong> {insight}
                    </AlertDescription>
                  </Alert>
                ))}
                
                {analytics.six_figure_insights.months_to_goal > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <div className="text-lg font-semibold">Time to Six Figures</div>
                    <div className="text-3xl font-bold text-blue-600 mt-2">
                      {Math.ceil(analytics.six_figure_insights.months_to_goal)} months
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      At current growth rate
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};