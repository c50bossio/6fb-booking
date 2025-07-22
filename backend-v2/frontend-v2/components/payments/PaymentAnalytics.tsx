/**
 * Payment Analytics Component
 * Displays comprehensive analytics for both centralized and decentralized payment flows
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  Calendar, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface PaymentAnalyticsData {
  period: string;
  centralized_payments: {
    total_transactions: number;
    total_volume: number;
    success_rate: number;
    average_transaction: number;
    commission_paid: number;
  };
  decentralized_payments: {
    total_transactions: number;
    total_volume: number;
    success_rate: number;
    average_transaction: number;
    commission_owed: number;
    commission_collected: number;
  };
  revenue_comparison: {
    centralized_net: number;
    decentralized_net: number;
    optimal_mode: string;
    potential_savings: number;
  };
  trends: {
    transaction_growth: number;
    revenue_growth: number;
    commission_trend: number;
  };
  six_figure_metrics: {
    monthly_goal: number;
    current_progress: number;
    projected_annual: number;
    recommendations: string[];
  };
}

export const PaymentAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<PaymentAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30_days');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      const response = await fetch(`/api/v2/external-payments/analytics?period=${selectedPeriod}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to load payment analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
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
          <div>Loading payment analytics...</div>
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
                Start processing payments to see your analytics dashboard
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
          <h2 className="text-2xl font-bold">Payment Analytics</h2>
          <p className="text-muted-foreground mt-2">
            Track your earnings, commissions, and payment performance
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
        </div>
      </div>

      {/* Six Figure Barber Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Six Figure Barber Progress
          </CardTitle>
          <CardDescription>Your journey toward six-figure earnings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{formatCurrency(analytics.six_figure_metrics.monthly_goal)}</div>
              <div className="text-sm text-muted-foreground">Monthly Goal</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {analytics.six_figure_metrics.current_progress}%
              </div>
              <div className="text-sm text-muted-foreground">Progress This Month</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(analytics.six_figure_metrics.projected_annual)}
              </div>
              <div className="text-sm text-muted-foreground">Projected Annual</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(analytics.six_figure_metrics.current_progress, 100)}%` }}
            />
          </div>
          
          {/* Recommendations */}
          {analytics.six_figure_metrics.recommendations.length > 0 && (
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                <strong>Six Figure Tip:</strong> {analytics.six_figure_metrics.recommendations[0]}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    analytics.centralized_payments.total_volume + 
                    analytics.decentralized_payments.total_volume
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {getTrendIcon(analytics.trends.revenue_growth)}
                <span className={getTrendColor(analytics.trends.revenue_growth)}>
                  {formatPercentage(analytics.trends.revenue_growth)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Earnings</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    analytics.revenue_comparison.centralized_net + 
                    analytics.revenue_comparison.decentralized_net
                  )}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold">
                  {analytics.centralized_payments.total_transactions + 
                   analytics.decentralized_payments.total_transactions}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {getTrendIcon(analytics.trends.transaction_growth)}
                <span className={getTrendColor(analytics.trends.transaction_growth)}>
                  {formatPercentage(analytics.trends.transaction_growth)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">
                  {(
                    (analytics.centralized_payments.success_rate + 
                     analytics.decentralized_payments.success_rate) / 2
                  ).toFixed(1)}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Mode Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Mode Comparison</CardTitle>
          <CardDescription>Compare performance across centralized and decentralized payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Centralized Payments */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
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
                    <div className="font-medium">Avg Transaction</div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(analytics.centralized_payments.average_transaction)}
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span>Net Earnings:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(analytics.revenue_comparison.centralized_net)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Decentralized Payments */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
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
                    <div className="font-medium">Avg Transaction</div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(analytics.decentralized_payments.average_transaction)}
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Commission Owed:</span>
                    <span className="text-orange-600">
                      {formatCurrency(analytics.decentralized_payments.commission_owed)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Net Earnings:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(analytics.revenue_comparison.decentralized_net)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Optimization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue Optimization
          </CardTitle>
          <CardDescription>Smart insights to maximize your earnings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-lg font-semibold">Optimal Mode</div>
              <div className="text-2xl font-bold text-blue-600 capitalize">
                {analytics.revenue_comparison.optimal_mode}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Based on current volume
              </div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-lg font-semibold">Potential Savings</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(analytics.revenue_comparison.potential_savings)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Per month with optimization
              </div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-lg font-semibold">Commission Trend</div>
              <div className={`text-2xl font-bold ${getTrendColor(analytics.trends.commission_trend)}`}>
                {formatPercentage(analytics.trends.commission_trend)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Change from last period
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-3">
            {analytics.six_figure_metrics.recommendations.map((recommendation, index) => (
              <Alert key={index}>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  <strong>Optimization Tip:</strong> {recommendation}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Commission Details */}
      {analytics.decentralized_payments.total_transactions > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Commission Summary
            </CardTitle>
            <CardDescription>Track commission collections and outstanding amounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">Commission Owed</div>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(analytics.decentralized_payments.commission_owed)}
                </div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">Commission Collected</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(analytics.decentralized_payments.commission_collected)}
                </div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">Collection Rate</div>
                <div className="text-2xl font-bold">
                  {(
                    (analytics.decentralized_payments.commission_collected / 
                     (analytics.decentralized_payments.commission_collected + analytics.decentralized_payments.commission_owed)) * 100
                  ).toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};