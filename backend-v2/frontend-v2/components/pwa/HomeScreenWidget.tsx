/**
 * Home Screen Widget
 * Quick access widget for PWA home screen integration
 * Six Figure Barber dashboard with revenue tracking
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, isToday, isTomorrow } from 'date-fns';
import { 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  User, 
  Phone, 
  Plus,
  ChevronRight,
  Star,
  Target,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { offlineCalendarManager, OfflineAppointment } from '@/lib/offline-calendar-manager';
import { pushNotificationManager } from '@/lib/push-notifications';

interface HomeScreenWidgetProps {
  barberId?: string;
  barberName?: string;
  onNavigate?: (path: string) => void;
  className?: string;
}

interface DashboardStats {
  todayAppointments: number;
  todayRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  dailyGoal: number;
  weeklyGoal: number;
  monthlyGoal: number;
  nextAppointment: OfflineAppointment | null;
  upcomingAppointments: OfflineAppointment[];
  completionRate: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  action: () => void;
}

export function HomeScreenWidget({
  barberId,
  barberName = 'Barber',
  onNavigate,
  className = ''
}: HomeScreenWidgetProps) {
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    todayRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    dailyGoal: 500,
    weeklyGoal: 2500,
    monthlyGoal: 10000,
    nextAppointment: null,
    upcomingAppointments: [],
    completionRate: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Load dashboard stats
  useEffect(() => {
    loadDashboardStats();
  }, [barberId]);

  const loadDashboardStats = async () => {
    setIsLoading(true);
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayAppointments = await offlineCalendarManager.getAppointments(
        today,
        today,
        barberId
      );

      const nextAppointment = todayAppointments
        .filter(apt => new Date(apt.startTime) > new Date() && apt.status === 'scheduled')
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] || null;

      const upcomingAppointments = todayAppointments
        .filter(apt => new Date(apt.startTime) > new Date() && apt.status === 'scheduled')
        .slice(0, 3);

      const todayRevenue = todayAppointments
        .filter(apt => apt.status === 'completed')
        .reduce((sum, apt) => sum + apt.price, 0);

      const completedToday = todayAppointments.filter(apt => apt.status === 'completed').length;
      const completionRate = todayAppointments.length > 0 
        ? (completedToday / todayAppointments.length) * 100 
        : 0;

      setStats({
        todayAppointments: todayAppointments.length,
        todayRevenue,
        weeklyRevenue: todayRevenue * 5, // Simplified calculation
        monthlyRevenue: todayRevenue * 22, // Simplified calculation
        dailyGoal: 500,
        weeklyGoal: 2500,
        monthlyGoal: 10000,
        nextAppointment,
        upcomingAppointments,
        completionRate
      });

      // Check for goal achievements
      checkGoalAchievements(todayRevenue);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkGoalAchievements = async (todayRevenue: number) => {
    // Check daily goal
    if (todayRevenue >= stats.dailyGoal) {
      await pushNotificationManager.showNotification({
        id: 'daily_goal_achieved',
        title: '🎯 Daily Goal Achieved!',
        body: `Congratulations! You've earned $${todayRevenue} today`,
        tag: 'goal_achievement',
        requireInteraction: true
      });
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'new_appointment',
      title: 'New Booking',
      description: 'Add appointment',
      icon: <Plus className="h-5 w-5" />,
      color: 'bg-blue-500',
      action: () => onNavigate?.('/calendar?action=new')
    },
    {
      id: 'view_calendar',
      title: 'Calendar',
      description: 'View schedule',
      icon: <Calendar className="h-5 w-5" />,
      color: 'bg-green-500',
      action: () => onNavigate?.('/calendar')
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'View insights',
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'bg-purple-500',
      action: () => onNavigate?.('/analytics')
    },
    {
      id: 'clients',
      title: 'Clients',
      description: 'Manage clients',
      icon: <User className="h-5 w-5" />,
      color: 'bg-orange-500',
      action: () => onNavigate?.('/clients')
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const dailyProgress = (stats.todayRevenue / stats.dailyGoal) * 100;
  const weeklyProgress = (stats.weeklyRevenue / stats.weeklyGoal) * 100;

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <motion.div
        className="text-center py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Good {currentTime.getHours() < 12 ? 'Morning' : currentTime.getHours() < 17 ? 'Afternoon' : 'Evening'}, {barberName}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {format(currentTime, 'EEEE, MMMM d')} • {format(currentTime, 'h:mm a')}
        </p>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Today</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.todayAppointments}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    appointments
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Revenue</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(stats.todayRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    today
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Goal Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Target className="h-5 w-5 mr-2 text-blue-600" />
              Daily Goal Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">
                  {formatCurrency(stats.todayRevenue)} / {formatCurrency(stats.dailyGoal)}
                </span>
                <Badge variant={dailyProgress >= 100 ? 'default' : 'secondary'}>
                  {Math.round(dailyProgress)}%
                </Badge>
              </div>
              <Progress value={dailyProgress} className="h-2" />
              {dailyProgress >= 100 && (
                <div className="flex items-center mt-2 text-green-600 dark:text-green-400">
                  <Star className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">Goal Achieved!</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Next Appointment */}
      {stats.nextAppointment && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Clock className="h-5 w-5 mr-2 text-orange-600" />
                Next Appointment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {stats.nextAppointment.clientName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {stats.nextAppointment.serviceName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(stats.nextAppointment.startTime), 'h:mm a')} • {formatCurrency(stats.nextAppointment.price)}
                    </p>
                  </div>
                </div>
                {stats.nextAppointment.clientPhone && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`tel:${stats.nextAppointment!.clientPhone}`)}
                    className="shrink-0"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Zap className="h-5 w-5 mr-2 text-yellow-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, index) => (
                <motion.button
                  key={action.id}
                  className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={action.action}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                >
                  <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center text-white mr-3`}>
                    {action.icon}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {action.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {action.description}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Upcoming Appointments */}
      {stats.upcomingAppointments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Upcoming Today
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate?.('/calendar')}
                  className="text-blue-600 dark:text-blue-400"
                >
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.upcomingAppointments.slice(0, 3).map((appointment, index) => (
                <motion.div
                  key={appointment.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(appointment.startTime), 'h:mm')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(appointment.startTime), 'a')}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {appointment.clientName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {appointment.serviceName}
                      </p>
                    </div>
                  </div>
                  <p className="font-medium text-green-600 dark:text-green-400 text-sm">
                    {formatCurrency(appointment.price)}
                  </p>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Performance Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.7 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(stats.completionRate)}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Completion Rate
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(stats.weeklyRevenue)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Weekly Revenue
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom padding for safe area */}
      <div className="h-20" />
    </div>
  );
}