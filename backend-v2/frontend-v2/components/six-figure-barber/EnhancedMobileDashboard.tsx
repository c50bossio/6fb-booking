/**
 * Enhanced Mobile Dashboard for Six Figure Barber Methodology
 * 
 * Provides comprehensive mobile-optimized interface for advanced Six Figure Barber features:
 * - Advanced Client Relationship Management
 * - AI-Powered Upselling Recommendations  
 * - Service Excellence Tracking
 * - Professional Growth Planning
 * - Real-time Analytics and Insights
 * 
 * Optimized for mobile devices with touch-friendly interactions and responsive design.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Star, 
  Target, 
  Brain,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  Activity
} from 'lucide-react';

interface MobileDashboardProps {
  userId: number;
  userRole: string;
}

interface DashboardData {
  today_metrics: {
    appointments_today: number;
    revenue_today: number;
    quality_score_avg: number;
    next_appointment: string;
  };
  weekly_progress: {
    revenue_target: number;
    revenue_actual: number;
    completion_percentage: number;
    trend: string;
  };
  priority_alerts: Array<{
    type: string;
    message: string;
    action: string;
  }>;
  quick_actions: string[];
  client_relationship_insights: {
    total_clients: number;
    total_ltv: number;
    portfolio_health: number;
  };
  success_metrics: {
    ltv_growth_rate: number;
    upselling_conversion_rate: number;
    client_retention_rate: number;
    service_excellence_score: number;
    revenue_goal_progress: number;
  };
}

export default function EnhancedMobileDashboard({ userId, userRole }: MobileDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load comprehensive insights
      const response = await fetch('/api/v2/six-figure-enhanced/dashboard/mobile-summary', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const result = await response.json();
      setDashboardData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
      case 'on_track':
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
      case 'behind':
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'client_opportunity':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'quality_alert':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'revenue_alert':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Dashboard</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadDashboardData} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Six Figure Dashboard</h1>
              <p className="text-sm text-gray-500">Mobile Analytics</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <Activity className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Today's Metrics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {dashboardData.today_metrics.appointments_today}
                </div>
                <div className="text-sm text-gray-600">Appointments</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(dashboardData.today_metrics.revenue_today)}
                </div>
                <div className="text-sm text-gray-600">Revenue</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div>
                <div className="text-lg font-semibold text-yellow-600">
                  {formatPercentage(dashboardData.today_metrics.quality_score_avg)}
                </div>
                <div className="text-sm text-gray-600">Quality Score</div>
              </div>
              <Star className="h-6 w-6 text-yellow-500" />
            </div>

            {dashboardData.today_metrics.next_appointment && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Next Appointment</div>
                <div className="font-semibold">{dashboardData.today_metrics.next_appointment}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Weekly Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Revenue Target</span>
                <span className="font-semibold">
                  {formatCurrency(dashboardData.weekly_progress.revenue_target)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Current Revenue</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {formatCurrency(dashboardData.weekly_progress.revenue_actual)}
                  </span>
                  {getTrendIcon(dashboardData.weekly_progress.trend)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Completion</span>
                  <span className="font-semibold">
                    {formatPercentage(dashboardData.weekly_progress.completion_percentage)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, dashboardData.weekly_progress.completion_percentage)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success Metrics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5" />
              Six Figure Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-600">LTV Growth</div>
                <div className="text-lg font-bold text-blue-600">
                  {formatPercentage(dashboardData.success_metrics?.ltv_growth_rate || 0)}
                </div>
              </div>
              
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-sm text-gray-600">Upselling Rate</div>
                <div className="text-lg font-bold text-green-600">
                  {formatPercentage(dashboardData.success_metrics?.upselling_conversion_rate || 0)}
                </div>
              </div>
              
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-sm text-gray-600">Retention</div>
                <div className="text-lg font-bold text-purple-600">
                  {formatPercentage(dashboardData.success_metrics?.client_retention_rate || 0)}
                </div>
              </div>
              
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="text-sm text-gray-600">Service Score</div>
                <div className="text-lg font-bold text-yellow-600">
                  {formatPercentage(dashboardData.success_metrics?.service_excellence_score || 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Priority Alerts */}
        {dashboardData.priority_alerts && dashboardData.priority_alerts.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Priority Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardData.priority_alerts.map((alert, index) => (
                <Alert key={index} className="border-l-4 border-l-blue-500">
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <AlertDescription className="text-sm">
                        {alert.message}
                      </AlertDescription>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="h-auto p-0 mt-1 text-blue-600"
                      >
                        {alert.action}
                      </Button>
                    </div>
                  </div>
                </Alert>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardData.quick_actions?.map((action, index) => (
              <Button 
                key={index}
                variant="outline" 
                className="w-full justify-start text-left h-auto py-3"
              >
                <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                <span className="text-sm">{action}</span>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Client Portfolio Summary */}
        {dashboardData.client_relationship_insights && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Client Portfolio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">
                    {dashboardData.client_relationship_insights.total_clients}
                  </div>
                  <div className="text-xs text-gray-600">Total Clients</div>
                </div>
                
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(dashboardData.client_relationship_insights.total_ltv)}
                  </div>
                  <div className="text-xs text-gray-600">Total LTV</div>
                </div>
                
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">
                    {formatPercentage(dashboardData.client_relationship_insights.portfolio_health)}
                  </div>
                  <div className="text-xs text-gray-600">Health Score</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">All systems operational</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                Enhanced
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}