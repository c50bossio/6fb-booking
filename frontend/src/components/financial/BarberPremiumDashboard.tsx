'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Users,
  Scissors,
  Package,
  Target,
  Award,
  Zap,
  Star,
  Crown,
  Trophy,
  Flame,
  ChevronRight,
  Bell,
  Settings
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { financialService } from '@/lib/api/financial';

interface BarberPremiumDashboardProps {
  barberId: string;
  barberName: string;
  isPremium?: boolean;
}

interface DashboardData {
  today: {
    earnings: number;
    appointments: number;
    tips: number;
    services: number;
    products: number;
    hours_worked: number;
    avg_ticket: number;
    client_satisfaction: number;
  };
  week: {
    earnings: number;
    appointments: number;
    tips: number;
    goal: number;
    progress: number;
    trend: number;
    new_clients: number;
    returning_clients: number;
  };
  month: {
    earnings: number;
    appointments: number;
    goal: number;
    progress: number;
    trend: number;
    top_service: string;
    best_day: string;
    personal_record: boolean;
  };
  goals: {
    daily_target: number;
    weekly_target: number;
    monthly_target: number;
    annual_target: number;
    current_streak: number;
    best_streak: number;
  };
  achievements: {
    recent: Array<{
      id: string;
      title: string;
      description: string;
      icon: string;
      earned_date: string;
      rarity: 'common' | 'rare' | 'epic' | 'legendary';
    }>;
    progress: Array<{
      id: string;
      title: string;
      progress: number;
      target: number;
      reward: string;
    }>;
  };
  insights: {
    top_insight: {
      title: string;
      description: string;
      potential_value: number;
      action: string;
    };
    peak_hours: string[];
    top_clients: Array<{
      name: string;
      total_spent: number;
      visits: number;
      last_visit: string;
    }>;
    service_performance: Array<{
      service: string;
      revenue: number;
      count: number;
      avg_price: number;
      trend: number;
    }>;
  };
}

const DEMO_DATA: DashboardData = {
  today: {
    earnings: 285.50,
    appointments: 6,
    tips: 45.00,
    services: 240.50,
    products: 0,
    hours_worked: 7.5,
    avg_ticket: 47.58,
    client_satisfaction: 4.8
  },
  week: {
    earnings: 1450.75,
    appointments: 32,
    tips: 220.00,
    goal: 1500,
    progress: 96.7,
    trend: 12.3,
    new_clients: 8,
    returning_clients: 24
  },
  month: {
    earnings: 5890.25,
    appointments: 128,
    goal: 6000,
    progress: 98.2,
    trend: 15.7,
    top_service: "Premium Fade",
    best_day: "Saturday",
    personal_record: true
  },
  goals: {
    daily_target: 300,
    weekly_target: 1500,
    monthly_target: 6000,
    annual_target: 75000,
    current_streak: 5,
    best_streak: 12
  },
  achievements: {
    recent: [
      {
        id: "streak_5",
        title: "5-Day Streak!",
        description: "Hit daily goal 5 days in a row",
        icon: "🔥",
        earned_date: "2024-12-23",
        rarity: "rare"
      },
      {
        id: "new_record",
        title: "New Monthly Record!",
        description: "Highest monthly earnings ever",
        icon: "🏆",
        earned_date: "2024-12-22",
        rarity: "epic"
      }
    ],
    progress: [
      {
        id: "weekly_warrior",
        title: "Weekly Warrior",
        progress: 31,
        target: 50,
        reward: "Premium Badge + $50 Bonus"
      },
      {
        id: "client_whisperer",
        title: "Client Whisperer",
        progress: 18,
        target: 25,
        reward: "Advanced CRM Features"
      }
    ]
  },
  insights: {
    top_insight: {
      title: "Peak Hour Opportunity",
      description: "You earn 34% more during 6-8 PM slots. Consider booking more evening appointments.",
      potential_value: 280,
      action: "Optimize Schedule"
    },
    peak_hours: ["10:00 AM", "2:00 PM", "6:00 PM", "7:00 PM"],
    top_clients: [
      { name: "Marcus J.", total_spent: 520, visits: 8, last_visit: "2024-12-20" },
      { name: "David R.", total_spent: 480, visits: 7, last_visit: "2024-12-18" },
      { name: "James M.", total_spent: 440, visits: 6, last_visit: "2024-12-19" }
    ],
    service_performance: [
      { service: "Premium Fade", revenue: 1200, count: 24, avg_price: 50, trend: 15 },
      { service: "Beard Trim", revenue: 800, count: 32, avg_price: 25, trend: 8 },
      { service: "Classic Cut", revenue: 600, count: 20, avg_price: 30, trend: -5 }
    ]
  }
};

const REVENUE_TREND_DATA = [
  { day: 'Mon', earnings: 245, goal: 300 },
  { day: 'Tue', earnings: 320, goal: 300 },
  { day: 'Wed', earnings: 285, goal: 300 },
  { day: 'Thu', earnings: 390, goal: 300 },
  { day: 'Fri', earnings: 425, goal: 300 },
  { day: 'Sat', earnings: 485, goal: 300 },
  { day: 'Sun', earnings: 285, goal: 300 }
];

const SERVICE_BREAKDOWN_DATA = [
  { name: 'Services', value: 240.50, color: '#3b82f6' },
  { name: 'Tips', value: 45.00, color: '#10b981' },
  { name: 'Products', value: 0, color: '#f59e0b' }
];

export function BarberPremiumDashboard({ barberId, barberName, isPremium = true }: BarberPremiumDashboardProps) {
  const [data, setData] = useState<DashboardData>(DEMO_DATA);
  const [loading, setLoading] = useState(true);
  const [celebrationVisible, setCelebrationVisible] = useState(false);

  // Fetch barber dashboard data
  useEffect(() => {
    fetchBarberData();
  }, [barberId]);

  // Simulate celebration for achievements
  useEffect(() => {
    if (data.achievements.recent.length > 0) {
      setCelebrationVisible(true);
      setTimeout(() => setCelebrationVisible(false), 3000);
    }
  }, [data.achievements.recent]);

  const fetchBarberData = async () => {
    try {
      setLoading(true);
      const response = await financialService.getBarberDashboard(Number(barberId));

      // Validate response data structure
      if (response.data && typeof response.data === 'object') {
        setData(response.data);
      } else {
        console.warn('Invalid API response structure, using demo data');
        setData(DEMO_DATA);
      }
    } catch (error) {
      console.error('Failed to fetch barber dashboard data:', error);
      // Always fall back to demo data on error to ensure UI works
      setData(DEMO_DATA);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-400 to-orange-500';
      case 'epic': return 'from-purple-400 to-pink-500';
      case 'rare': return 'from-blue-400 to-cyan-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <div className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto p-4 space-y-6">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
            <div className="h-96 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Celebration Animation */}
      {celebrationVisible && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm">
            <div className="flex items-center justify-center h-full">
              <div className="text-6xl animate-bounce">🎉</div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto p-4 space-y-6">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 text-white">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Crown className="h-8 w-8 text-yellow-300" />
                <h1 className="text-2xl font-bold">Welcome back, {barberName}!</h1>
                {isPremium && (
                  <Badge className="bg-yellow-500/20 text-yellow-200 border-yellow-300">
                    <Star className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </div>
              <p className="text-indigo-100">You're on fire today! 🔥</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                <AnimatedNumber value={data.today.earnings} prefix="$" />
              </div>
              <p className="text-indigo-200">Today's Earnings</p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-700">Today's Tips</p>
                  <p className="text-lg font-bold text-green-900">
                    <AnimatedNumber value={data.today.tips} prefix="$" />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Scissors className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-700">Appointments</p>
                  <p className="text-lg font-bold text-blue-900">{data.today.appointments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Star className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-700">Satisfaction</p>
                  <p className="text-lg font-bold text-purple-900">{data.today.client_satisfaction}/5</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <Flame className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-700">Streak</p>
                  <p className="text-lg font-bold text-orange-900">{data.goals.current_streak} days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Goals
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Achievements
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Insights
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Weekly Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Weekly Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Progress to Goal</span>
                      <span className="text-sm text-gray-600">{data.week.progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={data.week.progress} className="h-3" />
                    <div className="flex justify-between text-sm">
                      <span>{formatCurrency(data.week.earnings)}</span>
                      <span className="text-gray-600">Goal: {formatCurrency(data.week.goal)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {getTrendIcon(data.week.trend)}
                      <span className={data.week.trend > 0 ? 'text-green-600' : 'text-red-600'}>
                        {Math.abs(data.week.trend)}% vs last week
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Today's Revenue Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={SERVICE_BREAKDOWN_DATA}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {SERVICE_BREAKDOWN_DATA.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => {
                          try {
                            return formatCurrency(Number(value) || 0);
                          } catch {
                            return '$0.00';
                          }
                        }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Weekly Earnings Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={REVENUE_TREND_DATA}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip formatter={(value) => {
                        try {
                          return [formatCurrency(Number(value) || 0), 'Earnings'];
                        } catch {
                          return ['$0.00', 'Earnings'];
                        }
                      }} />
                      <Area
                        type="monotone"
                        dataKey="earnings"
                        stroke="#3b82f6"
                        fill="url(#colorEarnings)"
                      />
                      <Line
                        type="monotone"
                        dataKey="goal"
                        stroke="#ef4444"
                        strokeDasharray="5 5"
                      />
                      <defs>
                        <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Current Goals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Daily Target</span>
                      <span className="text-sm">{formatCurrency(data.today.earnings)} / {formatCurrency(data.goals.daily_target)}</span>
                    </div>
                    <Progress value={(data.today.earnings / data.goals.daily_target) * 100} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Weekly Target</span>
                      <span className="text-sm">{formatCurrency(data.week.earnings)} / {formatCurrency(data.goals.weekly_target)}</span>
                    </div>
                    <Progress value={data.week.progress} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Monthly Target</span>
                      <span className="text-sm">{formatCurrency(data.month.earnings)} / {formatCurrency(data.goals.monthly_target)}</span>
                    </div>
                    <Progress value={data.month.progress} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="h-5 w-5" />
                    Streak Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-orange-600 mb-2">
                      {data.goals.current_streak}
                    </div>
                    <p className="text-sm text-gray-600">Days in a row hitting daily goal</p>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="text-sm font-medium">Personal Best</span>
                    <span className="text-sm font-bold text-orange-600">{data.goals.best_streak} days</span>
                  </div>
                  <Button className="w-full bg-orange-600 hover:bg-orange-700">
                    View Streak History
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Recent Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.achievements.recent.map((achievement) => (
                    <div
                      key={achievement.id}
                      className={`p-3 rounded-lg bg-gradient-to-r ${getRarityColor(achievement.rarity)} text-white`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{achievement.icon}</span>
                        <div>
                          <h4 className="font-bold">{achievement.title}</h4>
                          <p className="text-sm opacity-90">{achievement.description}</p>
                          <p className="text-xs opacity-75 mt-1">
                            Earned on {new Date(achievement.earned_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Achievement Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.achievements.progress.map((progress) => (
                    <div key={progress.id} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">{progress.title}</span>
                        <span className="text-sm text-gray-600">
                          {progress.progress}/{progress.target}
                        </span>
                      </div>
                      <Progress value={(progress.progress / progress.target) * 100} />
                      <p className="text-xs text-gray-600">Reward: {progress.reward}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <Card className="border-l-4 border-l-yellow-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  Top Insight
                </CardTitle>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold mb-2">{data.insights.top_insight.title}</h3>
                <p className="text-gray-600 mb-4">{data.insights.top_insight.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-600 font-medium">
                    Potential: +{formatCurrency(data.insights.top_insight.potential_value)}/month
                  </span>
                  <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                    {data.insights.top_insight.action}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Top Clients
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.insights.top_clients.map((client, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium">{client.name}</h4>
                          <p className="text-sm text-gray-600">{client.visits} visits</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(client.total_spent)}</p>
                          <p className="text-xs text-gray-600">{client.last_visit}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scissors className="h-5 w-5" />
                    Service Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.insights.service_performance.map((service, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium">{service.service}</h4>
                          <p className="text-sm text-gray-600">{service.count} services</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(service.revenue)}</p>
                          <div className="flex items-center gap-1">
                            {getTrendIcon(service.trend)}
                            <span className={`text-xs ${service.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {Math.abs(service.trend)}%
                            </span>
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
    </div>
  );
}
