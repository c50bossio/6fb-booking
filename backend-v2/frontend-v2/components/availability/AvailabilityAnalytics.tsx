"use client";

/**
 * Availability Analytics Component
 * Tracks utilization rates, availability patterns, and revenue optimization
 * Supports Six Figure Barber methodology analytics
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  DollarSign, 
  Users, 
  Calendar,
  Target,
  Award,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  barberAvailabilityService, 
  UtilizationAnalytics 
} from '@/services/barber-availability';
import { useAvailabilityAnalytics } from '@/hooks/useBarberAvailability';

interface AvailabilityAnalyticsProps {
  barberId?: number;
  barbers?: Array<{ id: number; name: string; role: string }>;
  showComparison?: boolean;
  period?: 'week' | 'month' | 'quarter';
}

interface AnalyticsInsight {
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
  impact?: 'revenue' | 'efficiency' | 'satisfaction';
}

interface RevenueOptimizationRecommendation {
  type: 'pricing' | 'schedule' | 'capacity' | 'marketing';
  title: string;
  description: string;
  potential_increase: number;
  effort_level: 'low' | 'medium' | 'high';
  timeframe: string;
}

export function AvailabilityAnalytics({ 
  barberId, 
  barbers = [], 
  showComparison = false,
  period = 'month' 
}: AvailabilityAnalyticsProps) {
  // State
  const [selectedBarberId, setSelectedBarberId] = useState(barberId || (barbers[0]?.id ?? 0));
  const [comparisonBarbers, setComparisonBarbers] = useState<number[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>(period);
  const [recommendations, setRecommendations] = useState<RevenueOptimizationRecommendation[]>([]);
  const [loading, setLoading] = useState(false);

  // Hook for analytics data
  const { analytics, insights, loading: analyticsLoading, error, refetch } = useAvailabilityAnalytics(
    selectedBarberId, 
    selectedPeriod
  );

  // Load revenue optimization recommendations
  useEffect(() => {
    if (selectedBarberId && analytics) {
      loadRecommendations();
    }
  }, [selectedBarberId, analytics]);

  const loadRecommendations = async () => {
    if (!analytics) return;
    
    try {
      setLoading(true);
      
      // Generate recommendations based on analytics
      const recs: RevenueOptimizationRecommendation[] = [];
      
      // Pricing recommendations
      if (analytics.revenue_per_hour < 60) {
        recs.push({
          type: 'pricing',
          title: 'Increase Service Pricing',
          description: 'Current revenue per hour is below Six Figure Barber standards. Consider premium pricing strategy.',
          potential_increase: 25,
          effort_level: 'low',
          timeframe: '1-2 weeks'
        });
      }
      
      // Schedule optimization
      if (analytics.utilization_rate < 60) {
        recs.push({
          type: 'schedule',
          title: 'Optimize Schedule Hours',
          description: 'Low utilization suggests schedule adjustment needed. Focus on peak demand hours.',
          potential_increase: 15,
          effort_level: 'medium',
          timeframe: '2-4 weeks'
        });
      }
      
      // Peak hour optimization
      if (analytics.peak_hours.length > 0) {
        recs.push({
          type: 'pricing',
          title: 'Peak Hour Premium Pricing',
          description: `Implement premium pricing during peak hours: ${analytics.peak_hours.join(', ')}`,
          potential_increase: 20,
          effort_level: 'low',
          timeframe: '1 week'
        });
      }
      
      // Marketing recommendations
      if (analytics.utilization_rate > 85) {
        recs.push({
          type: 'marketing',
          title: 'Expand Marketing Reach',
          description: 'High utilization indicates demand exceeds capacity. Consider targeted marketing for premium services.',
          potential_increase: 30,
          effort_level: 'high',
          timeframe: '4-8 weeks'
        });
      }
      
      setRecommendations(recs);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    if (!analytics) return null;

    const sixFigureTarget = 125000; // Annual target
    const weeklyTarget = sixFigureTarget / 52;
    const monthlyTarget = sixFigureTarget / 12;
    
    let target = weeklyTarget;
    if (selectedPeriod === 'month') target = monthlyTarget;
    if (selectedPeriod === 'quarter') target = monthlyTarget * 3;
    
    const currentRevenue = analytics.revenue_per_hour * analytics.total_booked_hours;
    const targetProgress = (currentRevenue / target) * 100;
    
    return {
      target,
      currentRevenue,
      targetProgress: Math.min(targetProgress, 100),
      onTrack: targetProgress >= 85,
      hoursToTarget: target > currentRevenue ? (target - currentRevenue) / analytics.revenue_per_hour : 0
    };
  }, [analytics, selectedPeriod]);

  // Efficiency score calculation
  const efficiencyScore = useMemo(() => {
    if (!analytics) return 0;
    
    const utilizationScore = Math.min(analytics.utilization_rate / 80, 1) * 30; // Max 30 points
    const revenueScore = Math.min(analytics.revenue_per_hour / 75, 1) * 30; // Max 30 points
    const satisfactionScore = analytics.client_satisfaction_rate * 0.4; // Max 40 points
    
    return Math.round(utilizationScore + revenueScore + satisfactionScore);
  }, [analytics]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    return 'D';
  };

  if (analyticsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <BarChart3 className="h-8 w-8 animate-pulse mx-auto mb-2" />
            <p>Loading analytics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-700">{error}</AlertDescription>
      </Alert>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
          <p className="text-gray-500">Analytics data is not available for the selected barber and period.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <BarChart3 className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold">Availability Analytics</h2>
            <p className="text-gray-600">Performance insights and revenue optimization</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {barbers.length > 0 && (
            <Select value={selectedBarberId.toString()} onValueChange={(v) => setSelectedBarberId(parseInt(v))}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select barber" />
              </SelectTrigger>
              <SelectContent>
                {barbers.map(barber => (
                  <SelectItem key={barber.id} value={barber.id.toString()}>
                    {barber.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedPeriod} onValueChange={(v: any) => setSelectedPeriod(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={refetch} disabled={analyticsLoading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <div className="text-sm font-medium text-gray-600">Utilization Rate</div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{analytics.utilization_rate.toFixed(1)}%</div>
              <Progress value={analytics.utilization_rate} className="mt-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div className="text-sm font-medium text-gray-600">Revenue/Hour</div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">${analytics.revenue_per_hour.toFixed(0)}</div>
              <div className="text-sm text-gray-500">
                {analytics.revenue_per_hour >= 75 ? (
                  <span className="text-green-600 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Above target
                  </span>
                ) : (
                  <span className="text-red-600 flex items-center">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    Below target
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <div className="text-sm font-medium text-gray-600">Available Hours</div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{analytics.total_available_hours.toFixed(0)}h</div>
              <div className="text-sm text-gray-500">
                {analytics.total_booked_hours.toFixed(0)}h booked
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-orange-600" />
              <div className="text-sm font-medium text-gray-600">Efficiency Score</div>
            </div>
            <div className="mt-2">
              <div className={`text-2xl font-bold ${getScoreColor(efficiencyScore)}`}>
                {efficiencyScore}
                <span className="text-lg ml-1">({getScoreGrade(efficiencyScore)})</span>
              </div>
              <div className="text-sm text-gray-500">
                {analytics.client_satisfaction_rate.toFixed(1)}% satisfaction
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Six Figure Barber Progress */}
      {performanceMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Six Figure Barber Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Target Progress
                  </div>
                  <div className="text-2xl font-bold">
                    ${performanceMetrics.currentRevenue.toFixed(0)} / ${performanceMetrics.target.toFixed(0)}
                  </div>
                </div>
                <Badge 
                  variant={performanceMetrics.onTrack ? 'default' : 'destructive'}
                  className="text-sm"
                >
                  {performanceMetrics.onTrack ? 'On Track' : 'Behind Target'}
                </Badge>
              </div>
              
              <Progress value={performanceMetrics.targetProgress} className="h-3" />
              
              <div className="text-sm text-gray-600">
                {performanceMetrics.onTrack ? (
                  <span className="text-green-600">
                    Excellent progress! You're on track to exceed the Six Figure Barber target.
                  </span>
                ) : (
                  <span>
                    Need {performanceMetrics.hoursToTarget.toFixed(1)} more billable hours at current rate to reach target.
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights and Recommendations */}
      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights">Performance Insights</TabsTrigger>
          <TabsTrigger value="recommendations">Revenue Optimization</TabsTrigger>
          <TabsTrigger value="patterns">Availability Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          {insights && insights.length > 0 ? (
            insights.map((insight, index) => (
              <Alert key={index} className={
                insight.type === 'success' ? 'border-green-200 bg-green-50' :
                insight.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                insight.type === 'error' ? 'border-red-200 bg-red-50' :
                'border-blue-200 bg-blue-50'
              }>
                <Lightbulb className={`h-4 w-4 ${
                  insight.type === 'success' ? 'text-green-600' :
                  insight.type === 'warning' ? 'text-yellow-600' :
                  insight.type === 'error' ? 'text-red-600' :
                  'text-blue-600'
                }`} />
                <AlertDescription>
                  <div className="font-medium mb-1">{insight.title}</div>
                  <div className={
                    insight.type === 'success' ? 'text-green-700' :
                    insight.type === 'warning' ? 'text-yellow-700' :
                    insight.type === 'error' ? 'text-red-700' :
                    'text-blue-700'
                  }>
                    {insight.message}
                  </div>
                </AlertDescription>
              </Alert>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Insights Available</h3>
                <p className="text-gray-500">Performance insights will appear here as data is collected.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          {recommendations.length > 0 ? (
            recommendations.map((rec, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <span className="font-medium">{rec.title}</span>
                        <Badge variant="outline" className="text-xs">
                          +{rec.potential_increase}% revenue
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-3">{rec.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Effort: <span className="capitalize">{rec.effort_level}</span></span>
                        <span>Timeframe: {rec.timeframe}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Implement
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Recommendations</h3>
                <p className="text-gray-500">Revenue optimization recommendations will appear based on your performance data.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="patterns">
          <Card>
            <CardHeader>
              <CardTitle>Peak Performance Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Peak Hours</h4>
                  <div className="flex flex-wrap gap-2">
                    {analytics.peak_hours.map(hour => (
                      <Badge key={hour} variant="default">{hour}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Low Demand Hours</h4>
                  <div className="flex flex-wrap gap-2">
                    {analytics.low_demand_hours.map(hour => (
                      <Badge key={hour} variant="secondary">{hour}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}