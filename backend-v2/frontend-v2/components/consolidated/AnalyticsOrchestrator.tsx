/**
 * Analytics Orchestrator Component
 * 
 * This component consolidates and replaces the following duplicate analytics components:
 * - AnalyticsDashboard.tsx
 * - AdvancedAnalyticsDashboard.tsx  
 * - EnhancedAnalyticsDashboard.tsx
 * - SixFigureAnalyticsDashboard.tsx
 * - ClientAnalytics.tsx
 * - BookingAnalytics.tsx
 * - RevenueAnalytics.tsx
 * - PerformanceAnalytics.tsx
 * - BusinessHealthScoreCard.tsx
 * - InteractiveAnalytics.tsx
 * - MarketingAnalyticsDashboard.tsx
 * - TrackingAnalyticsDashboard.tsx
 * - And 15+ more analytics components
 * 
 * REDUCTION: 25+ components → 1 unified orchestrator (96% reduction)
 */

import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, TrendingUp, Users, Calendar, DollarSign, Target, Brain, Zap } from 'lucide-react';

// Lazy load chart library to optimize bundle size
const ChartLibrary = lazy(() => import('./ChartLibrary'));
const MetricsDisplay = lazy(() => import('./MetricsDisplay'));

type AnalyticsProvider = 'six_figure_barber' | 'marketing' | 'franchise' | 'enterprise' | 'basic';
type AnalyticsLevel = 'basic' | 'standard' | 'advanced' | 'enterprise';
type ViewMode = 'dashboard' | 'detailed' | 'mobile' | 'executive' | 'realtime';
type TimeRange = '24h' | '7d' | '30d' | '90d' | '1y' | 'custom';

interface AnalyticsConfig {
  provider: AnalyticsProvider;
  level: AnalyticsLevel;
  viewMode: ViewMode;
  timeRange: TimeRange;
  widgets: string[];
  enablePredictions?: boolean;
  enableAI?: boolean;
  enableRealtime?: boolean;
  customization?: Record<string, any>;
}

interface AnalyticsData {
  revenue: {
    total: number;
    growth: number;
    average_ticket: number;
    trend: number[];
  };
  clients: {
    total: number;
    new: number;
    retention_rate: number;
    lifetime_value: number;
  };
  appointments: {
    total: number;
    completed: number;
    completion_rate: number;
    utilization: number;
  };
  efficiency: {
    score: number;
    time_utilization: number;
    booking_efficiency: number;
    resource_optimization: number;
  };
  six_figure_score: number;
  ai_insights?: {
    health_score: number;
    recommendations: string[];
    risk_factors: string[];
    opportunities: string[];
  };
  predictions?: Record<string, any>;
}

interface AnalyticsOrchestratorProps {
  provider?: AnalyticsProvider;
  level?: AnalyticsLevel;
  viewMode?: ViewMode;
  timeRange?: TimeRange;
  widgets?: string[];
  userId?: number;
  organizationId?: number;
  enablePredictions?: boolean;
  enableAI?: boolean;
  enableRealtime?: boolean;
  customization?: Record<string, any>;
  onConfigChange?: (config: AnalyticsConfig) => void;
  className?: string;
}

const DEFAULT_WIDGETS = {
  basic: ['revenue', 'clients', 'appointments'],
  standard: ['revenue', 'clients', 'appointments', 'efficiency'],
  advanced: ['revenue', 'clients', 'appointments', 'efficiency', 'six_figure_score', 'trends'],
  enterprise: ['revenue', 'clients', 'appointments', 'efficiency', 'six_figure_score', 'trends', 'ai_insights', 'predictions']
};

const WIDGET_ICONS = {
  revenue: DollarSign,
  clients: Users,
  appointments: Calendar,
  efficiency: Zap,
  six_figure_score: Target,
  trends: TrendingUp,
  ai_insights: Brain,
  predictions: AlertCircle
};

export const AnalyticsOrchestrator: React.FC<AnalyticsOrchestratorProps> = ({
  provider = 'six_figure_barber',
  level = 'standard',
  viewMode = 'dashboard',
  timeRange = '30d',
  widgets,
  userId,
  organizationId,
  enablePredictions = false,
  enableAI = false,
  enableRealtime = false,
  customization = {},
  onConfigChange,
  className = ''
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [config, setConfig] = useState<AnalyticsConfig>({
    provider,
    level,
    viewMode,
    timeRange,
    widgets: widgets || DEFAULT_WIDGETS[level],
    enablePredictions,
    enableAI,
    enableRealtime,
    customization
  });

  // Memoize widget configuration
  const widgetConfig = useMemo(() => {
    return config.widgets.map(widgetName => ({
      name: widgetName,
      icon: WIDGET_ICONS[widgetName as keyof typeof WIDGET_ICONS],
      title: widgetName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      enabled: true
    }));
  }, [config.widgets]);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/v2/analytics/unified', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            provider: config.provider,
            level: config.level,
            time_range: config.timeRange,
            widgets: config.widgets,
            user_id: userId,
            organization_id: organizationId,
            enable_predictions: config.enablePredictions,
            enable_ai: config.enableAI,
            enable_realtime: config.enableRealtime
          })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const analyticsData = await response.json();
        setData(analyticsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [config, userId, organizationId]);

  // Handle configuration changes
  const handleConfigChange = (updates: Partial<AnalyticsConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  // Render loading state
  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-20 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render mobile view
  if (config.viewMode === 'mobile') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex flex-col space-y-2">
          <h2 className="text-xl font-bold">Analytics</h2>
          <Select 
            value={config.timeRange} 
            onValueChange={(value) => handleConfigChange({ timeRange: value as TimeRange })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {widgetConfig.slice(0, 4).map((widget) => (
            <Card key={widget.name} className="p-3">
              <div className="flex items-center space-x-2">
                {widget.icon && <widget.icon className="h-4 w-4 text-blue-600" />}
                <span className="text-xs font-medium text-gray-600">{widget.title}</span>
              </div>
              <Suspense fallback={<Skeleton className="h-6 w-16 mt-2" />}>
                <MetricsDisplay 
                  type={widget.name} 
                  data={data} 
                  compact 
                />
              </Suspense>
            </Card>
          ))}
        </div>

        {data?.six_figure_score && (
          <Card className="p-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Six Figure Score</h3>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {Math.round(data.six_figure_score)}/100
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${data.six_figure_score}%` }}
                />
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  }

  // Render main dashboard view
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {config.provider === 'six_figure_barber' ? 'Six Figure Barber Analytics' : 'Analytics Dashboard'}
          </h2>
          <p className="text-gray-600">
            {config.level.charAt(0).toUpperCase() + config.level.slice(1)} analytics for {config.timeRange}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select 
            value={config.timeRange} 
            onValueChange={(value) => handleConfigChange({ timeRange: value as TimeRange })}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={config.level} 
            onValueChange={(value) => handleConfigChange({ level: value as AnalyticsLevel })}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>

          {config.enableRealtime && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Live</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {widgetConfig.map((widget) => (
          <Card 
            key={widget.name} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedWidget(widget.name)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {widget.title}
              </CardTitle>
              {widget.icon && <widget.icon className="h-4 w-4 text-gray-400" />}
            </CardHeader>
            <CardContent>
              <Suspense fallback={<Skeleton className="h-8 w-24" />}>
                <MetricsDisplay 
                  type={widget.name} 
                  data={data} 
                  detailed={selectedWidget === widget.name}
                />
              </Suspense>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Six Figure Barber Score (if enabled) */}
      {data?.six_figure_score && config.provider === 'six_figure_barber' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-600" />
              <span>Six Figure Barber Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl font-bold text-blue-600">
                {Math.round(data.six_figure_score)}/100
              </span>
              <Badge variant={data.six_figure_score >= 80 ? 'default' : data.six_figure_score >= 60 ? 'secondary' : 'destructive'}>
                {data.six_figure_score >= 80 ? 'Excellent' : data.six_figure_score >= 60 ? 'Good' : 'Needs Improvement'}
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${data.six_figure_score}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">
              Progress toward Six Figure Barber methodology goals
            </p>
          </CardContent>
        </Card>
      )}

      {/* Charts and detailed analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
          {config.enableAI && <TabsTrigger value="insights">AI Insights</TabsTrigger>}
          {config.enablePredictions && <TabsTrigger value="predictions">Predictions</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Suspense fallback={<Skeleton className="h-80" />}>
              <ChartLibrary 
                type="line"
                data={data?.revenue?.trend || []}
                title="Revenue Trend"
                config={{ showGrid: true, animated: true }}
              />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-80" />}>
              <ChartLibrary 
                type="donut"
                data={{
                  completed: data?.appointments?.completed || 0,
                  cancelled: (data?.appointments?.total || 0) - (data?.appointments?.completed || 0)
                }}
                title="Appointment Status"
                config={{ showLegend: true }}
              />
            </Suspense>
          </div>
        </TabsContent>

        <TabsContent value="revenue">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <ChartLibrary 
              type="combo"
              data={data}
              title="Revenue Analytics"
              config={{ 
                showGrid: true, 
                animated: true,
                responsive: true 
              }}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="clients">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <ChartLibrary 
              type="bar"
              data={data?.clients}
              title="Client Analytics"
              config={{ 
                stacked: true,
                showTooltip: true 
              }}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="efficiency">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <ChartLibrary 
              type="gauge"
              data={{ value: data?.efficiency?.score || 0 }}
              title="Efficiency Score"
              config={{ 
                min: 0, 
                max: 100,
                zones: [
                  { min: 0, max: 50, color: '#ef4444' },
                  { min: 50, max: 80, color: '#f59e0b' },
                  { min: 80, max: 100, color: '#10b981' }
                ]
              }}
            />
          </Suspense>
        </TabsContent>

        {config.enableAI && (
          <TabsContent value="insights">
            {data?.ai_insights ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {data.ai_insights.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Risk Factors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {data.ai_insights.risk_factors.map((risk, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center p-8">
                  <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Insights</h3>
                  <p className="text-gray-600">
                    AI insights are being generated. Check back in a few minutes.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {config.enablePredictions && (
          <TabsContent value="predictions">
            <Suspense fallback={<Skeleton className="h-96" />}>
              <ChartLibrary 
                type="forecast"
                data={data?.predictions}
                title="Revenue Prediction"
                config={{ 
                  prediction: true,
                  confidence: true 
                }}
              />
            </Suspense>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default AnalyticsOrchestrator;