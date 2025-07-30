'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
  ReferenceLine
} from '@/lib/recharts-dynamic';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Target, 
  AlertTriangle,
  Crown,
  Star,
  Calendar,
  Activity,
  Zap,
  Brain,
  Eye,
  Shield,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

// Import our analytics engines
import { BusinessIntelligenceEngine } from '@/lib/business-intelligence';
import { PredictiveAnalyticsEngine } from '@/lib/predictive-analytics';
import { RevenueAnalyticsEngine } from '@/lib/revenue-analytics';
import { ClientBehaviorAnalyticsEngine } from '@/lib/client-behavior-analytics';

interface AnalyticsDashboardProps {
  appointments: any[];
  clients: any[];
  services: any[];
  referrals?: any[];
  className?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function AdvancedAnalyticsDashboard({
  appointments = [],
  clients = [],
  services = [],
  referrals = [],
  className
}: AnalyticsDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize analytics engines
  const biEngine = useMemo(() => 
    new BusinessIntelligenceEngine(appointments, clients, services), 
    [appointments, clients, services]
  );
  
  const predictiveEngine = useMemo(() => 
    new PredictiveAnalyticsEngine(appointments, clients, services), 
    [appointments, clients, services]
  );
  
  const revenueEngine = useMemo(() => 
    new RevenueAnalyticsEngine(appointments, clients, services), 
    [appointments, clients, services]
  );
  
  const behaviorEngine = useMemo(() => 
    new ClientBehaviorAnalyticsEngine(appointments, clients, services, referrals), 
    [appointments, clients, services, referrals]
  );

  // Calculate analytics data
  const [analyticsData, setAnalyticsData] = useState<any>({});

  useEffect(() => {
    const calculateAnalytics = async () => {
      setIsLoading(true);
      
      try {
        const [
          businessMetrics,
          clientSegments,
          revenueOptimization,
          revenueForecast,
          churnPredictions,
          loyaltyScores,
          serviceProfitability,
          revenueGoals
        ] = await Promise.all([
          Promise.resolve(biEngine.calculateBusinessMetrics()),
          Promise.resolve(biEngine.analyzeClientSegments()),
          Promise.resolve(biEngine.generateRevenueOptimization()),
          Promise.resolve(predictiveEngine.forecastRevenue('monthly', 12)),
          Promise.resolve(predictiveEngine.predictClientChurn()),
          Promise.resolve(behaviorEngine.calculateLoyaltyScores()),
          Promise.resolve(revenueEngine.analyzeServiceProfitability()),
          Promise.resolve(revenueEngine.trackRevenueGoals())
        ]);

        setAnalyticsData({
          businessMetrics,
          clientSegments,
          revenueOptimization,
          revenueForecast,
          churnPredictions,
          loyaltyScores,
          serviceProfitability,
          revenueGoals
        });
      } catch (error) {
        console.error('Error calculating analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (appointments.length > 0 || clients.length > 0) {
      calculateAnalytics();
    } else {
      setIsLoading(false);
    }
  }, [biEngine, predictiveEngine, behaviorEngine, revenueEngine, selectedPeriod]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number, decimals: number = 1) => {
    return `${value.toFixed(decimals)}%`;
  };

  const getTrendIcon = (value: number) => {
    if (value > 5) return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    if (value < -5) return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 5) return 'text-green-600';
    if (value < -5) return 'text-red-600';
    return 'text-gray-600';
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-300">Analyzing business data...</p>
        </div>
      </div>
    );
  }

  const { 
    businessMetrics = {}, 
    clientSegments = [], 
    revenueOptimization = {}, 
    revenueForecast = {}, 
    churnPredictions = [],
    loyaltyScores = [],
    serviceProfitability = [],
    revenueGoals = {}
  } = analyticsData;

  // Six Figure Progress Calculation
  const sixFigureProgress = revenueOptimization.sixFigureProgress || {};
  const currentAnnualRevenue = sixFigureProgress.currentAnnualRevenue || 0;
  const progressPercentage = sixFigureProgress.progressPercentage || 0;
  const monthsToTarget = sixFigureProgress.monthsToTarget || 0;

  // High-risk clients
  const highRiskClients = churnPredictions.filter(c => c.riskLevel === 'high' || c.riskLevel === 'critical').length;

  // VIP clients
  const vipClients = loyaltyScores.filter(c => c.loyaltyTier === 'champion').length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Key Metrics */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Business Intelligence</h1>
            <p className="text-gray-600 dark:text-gray-300">Six Figure Barber Analytics Dashboard</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>

        {/* Six Figure Progress Banner */}
        <Card className="bg-gradient-to-r from-purple-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Six Figure Journey</h2>
                <p className="text-purple-100">
                  {formatCurrency(currentAnnualRevenue)} of $100,000 target
                </p>
                <div className="w-64">
                  <Progress value={progressPercentage} className="h-3 bg-purple-300" />
                </div>
                <p className="text-sm text-purple-100">
                  {monthsToTarget > 0 ? `${monthsToTarget} months to six figures` : 'Target achieved!'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">{progressPercentage.toFixed(1)}%</div>
                <div className="text-purple-100">Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(businessMetrics.revenueMetrics?.monthlyRevenue || 0)}
                </p>
                <div className="flex items-center mt-1">
                  {getTrendIcon(businessMetrics.revenueMetrics?.revenueGrowthRate || 0)}
                  <span className={`ml-1 text-sm ${getTrendColor(businessMetrics.revenueMetrics?.revenueGrowthRate || 0)}`}>
                    {formatPercentage(businessMetrics.revenueMetrics?.revenueGrowthRate || 0)}
                  </span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Clients</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {businessMetrics.clientMetrics?.activeClients || 0}
                </p>
                <div className="flex items-center mt-1">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {formatPercentage(businessMetrics.clientMetrics?.retentionRate || 0)} retention
                  </span>
                </div>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Average Ticket</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(businessMetrics.revenueMetrics?.averageTicket || 0)}
                </p>
                <div className="flex items-center mt-1">
                  <Crown className="h-4 w-4 text-yellow-500 mr-1" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {vipClients} VIP clients
                  </span>
                </div>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Utilization Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatPercentage(businessMetrics.operationalMetrics?.utilizationRate || 0)}
                </p>
                <div className="flex items-center mt-1">
                  {highRiskClients > 0 && (
                    <>
                      <AlertTriangle className="h-4 w-4 text-orange-500 mr-1" />
                      <span className="text-sm text-orange-600 dark:text-orange-400">
                        {highRiskClients} at risk
                      </span>
                    </>
                  )}
                </div>
              </div>
              <Activity className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4" />
            <span>Revenue</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Clients</span>
          </TabsTrigger>
          <TabsTrigger value="predictive" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>Predictive</span>
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center space-x-2">
            <Star className="h-4 w-4" />
            <span>Services</span>
          </TabsTrigger>
          <TabsTrigger value="optimization" className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>Optimize</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Forecast Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span>Revenue Forecast</span>
                </CardTitle>
                <CardDescription>12-month revenue projection</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueForecast.predictions || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Area 
                      type="monotone" 
                      dataKey="predictedRevenue" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Client Segments Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span>Client Segments</span>
                </CardTitle>
                <CardDescription>Revenue distribution by client type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={clientSegments.map((segment: any) => ({
                        name: segment.name,
                        value: segment.totalRevenue,
                        clients: segment.clients.length
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {clientSegments.map((segment: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Optimization Opportunities */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <span>Revenue Optimization Opportunities</span>
                </CardTitle>
                <CardDescription>Top opportunities to increase revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueOptimization.optimizationOpportunities?.map((opportunity: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{opportunity.description}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{opportunity.timeframe}</p>
                        <Badge variant={opportunity.difficulty === 'easy' ? 'default' : opportunity.difficulty === 'medium' ? 'secondary' : 'destructive'}>
                          {opportunity.difficulty}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          +{formatCurrency(opportunity.potentialIncrease)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Priority #{opportunity.priority}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Goals Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-purple-500" />
                  <span>Revenue Goals</span>
                </CardTitle>
                <CardDescription>Progress toward Six Figure targets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {revenueGoals.milestones?.map((milestone: any, index: number) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white">{milestone.milestone}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {formatCurrency(milestone.current)} / {formatCurrency(milestone.target)}
                      </span>
                    </div>
                    <Progress value={milestone.progress} className="h-2" />
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Est. completion: {milestone.estimatedDate}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Service Profitability */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-gold-500" />
                  <span>Service Profitability</span>
                </CardTitle>
                <CardDescription>Revenue and profit by service</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={serviceProfitability}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="serviceName" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalRevenue" fill="#8884d8" />
                    <Bar dataKey="netProfit" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Loyalty Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-purple-500" />
                  <span>Loyalty Tiers</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['champion', 'loyal', 'potential', 'new', 'at-risk'].map((tier) => {
                    const count = loyaltyScores.filter((client: any) => client.loyaltyTier === tier).length;
                    const percentage = loyaltyScores.length > 0 ? (count / loyaltyScores.length) * 100 : 0;
                    
                    return (
                      <div key={tier} className="flex items-center justify-between">
                        <span className="capitalize font-medium">{tier.replace('-', ' ')}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600 dark:text-gray-300">{count}</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* High-Risk Clients */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-red-500" />
                  <span>Retention Alerts</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {churnPredictions
                    .filter((client: any) => client.riskLevel === 'high' || client.riskLevel === 'critical')
                    .slice(0, 5)
                    .map((client: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{client.clientName}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {client.churnRisk}% risk · {client.timeToChurn} days
                          </p>
                        </div>
                        <Badge variant="destructive">{client.riskLevel}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Client Lifetime Value */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  <span>Client Value</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(businessMetrics.clientMetrics?.lifetimeValue || 0)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Average LTV</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(businessMetrics.revenueMetrics?.revenuePerClient || 0)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">Per Client</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatPercentage(businessMetrics.clientMetrics?.retentionRate || 0)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">Retention</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Predictive Tab */}
        <TabsContent value="predictive" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Churn Risk Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  <span>Churn Risk Analysis</span>
                </CardTitle>
                <CardDescription>Predictive client retention insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['low', 'medium', 'high', 'critical'].map((riskLevel) => {
                    const count = churnPredictions.filter((client: any) => client.riskLevel === riskLevel).length;
                    const percentage = churnPredictions.length > 0 ? (count / churnPredictions.length) * 100 : 0;
                    
                    return (
                      <div key={riskLevel} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            riskLevel === 'low' ? 'bg-green-500' :
                            riskLevel === 'medium' ? 'bg-yellow-500' :
                            riskLevel === 'high' ? 'bg-orange-500' : 'bg-red-500'
                          }`}></div>
                          <span className="capitalize font-medium">{riskLevel} Risk</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{count} clients</span>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Revenue Projection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span>Revenue Projection</span>
                </CardTitle>
                <CardDescription>Next 6 months forecast</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={revenueForecast.predictions?.slice(0, 6) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Line 
                      type="monotone" 
                      dataKey="predictedRevenue" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-4 text-center">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    Projected Growth: +{formatPercentage(revenueForecast.growthProjection || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span>Service Performance Analysis</span>
              </CardTitle>
              <CardDescription>Detailed breakdown of service metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-3 font-medium text-gray-900 dark:text-white">Service</th>
                      <th className="text-right p-3 font-medium text-gray-900 dark:text-white">Revenue</th>
                      <th className="text-right p-3 font-medium text-gray-900 dark:text-white">Bookings</th>
                      <th className="text-right p-3 font-medium text-gray-900 dark:text-white">Avg Price</th>
                      <th className="text-right p-3 font-medium text-gray-900 dark:text-white">Profit Margin</th>
                      <th className="text-center p-3 font-medium text-gray-900 dark:text-white">Growth</th>
                      <th className="text-center p-3 font-medium text-gray-900 dark:text-white">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceProfitability.map((service: any, index: number) => (
                      <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="p-3 font-medium text-gray-900 dark:text-white">
                          {service.serviceName}
                        </td>
                        <td className="p-3 text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrency(service.totalRevenue)}
                        </td>
                        <td className="p-3 text-right text-gray-600 dark:text-gray-300">
                          {service.totalBookings}
                        </td>
                        <td className="p-3 text-right text-gray-600 dark:text-gray-300">
                          {formatCurrency(service.averagePrice)}
                        </td>
                        <td className="p-3 text-right text-gray-600 dark:text-gray-300">
                          {formatPercentage(service.profitMargin)}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center">
                            {getTrendIcon(service.growthRate)}
                            <span className={`ml-1 text-sm ${getTrendColor(service.growthRate)}`}>
                              {formatPercentage(service.growthRate)}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant={
                            service.competitivePosition === 'leading' ? 'default' :
                            service.competitivePosition === 'competitive' ? 'secondary' : 'outline'
                          }>
                            {service.competitivePosition}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization" className="space-y-6">
          <div className="space-y-6">
            {/* Quick Wins */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <span>Quick Wins</span>
                </CardTitle>
                <CardDescription>Easy optimizations with high impact</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {revenueOptimization.optimizationOpportunities
                    ?.filter((opp: any) => opp.difficulty === 'easy')
                    .map((opportunity: any, index: number) => (
                      <div key={index} className="p-4 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/20">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                          {opportunity.description}
                        </h4>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-green-600">
                            +{formatCurrency(opportunity.potentialIncrease)}
                          </span>
                          <Badge variant="default">Easy</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                          Expected timeframe: {opportunity.timeframe}
                        </p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Strategic Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-purple-500" />
                  <span>Strategic Opportunities</span>
                </CardTitle>
                <CardDescription>Long-term growth initiatives</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueOptimization.optimizationOpportunities
                    ?.filter((opp: any) => opp.difficulty === 'medium' || opp.difficulty === 'hard')
                    .map((opportunity: any, index: number) => (
                      <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                              {opportunity.description}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                              {opportunity.timeframe}
                            </p>
                            <Badge variant={opportunity.difficulty === 'medium' ? 'secondary' : 'destructive'}>
                              {opportunity.difficulty}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-purple-600">
                              +{formatCurrency(opportunity.potentialIncrease)}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              Priority #{opportunity.priority}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}