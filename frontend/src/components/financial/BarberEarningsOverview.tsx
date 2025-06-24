import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AnimatedNumber } from '@/components/ui/animated-number';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Users,
  Scissors,
  Package
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BarberEarningsOverviewProps {
  barberId?: string;
  showAllBarbers?: boolean;
}

interface EarningsData {
  today: {
    services: number;
    tips: number;
    products: number;
    total: number;
    appointments: number;
  };
  week: {
    services: number;
    tips: number;
    products: number;
    total: number;
    appointments: number;
    trend: number;
  };
  month: {
    services: number;
    tips: number;
    products: number;
    total: number;
    appointments: number;
    trend: number;
  };
  pending_payout: number;
  next_payout_date: string;
  commission_rate: number;
  booth_rent_due?: number;
  booth_rent_status?: string;
}

interface BarberInfo {
  id: string;
  name: string;
  profile_image?: string;
}

export function BarberEarningsOverview({ barberId, showAllBarbers }: BarberEarningsOverviewProps) {
  const [selectedBarberId, setSelectedBarberId] = useState(barberId);
  const [barbers, setBarbers] = useState<BarberInfo[]>([]);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    if (showAllBarbers) {
      fetchBarbers();
    }
  }, [showAllBarbers]);

  useEffect(() => {
    if (selectedBarberId) {
      fetchEarnings();
    }
  }, [selectedBarberId, timeframe]);

  const fetchBarbers = async () => {
    try {
      const response = await api.get('/barbers');
      setBarbers(response.data);
      if (!selectedBarberId && response.data.length > 0) {
        setSelectedBarberId(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch barbers:', error);
    }
  };

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/financial/earnings/${selectedBarberId}`);
      setEarnings(response.data);
    } catch (error) {
      console.error('Failed to fetch earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeframeData = () => {
    if (!earnings) return null;
    return earnings[timeframe];
  };

  const timeframeData = getTimeframeData();

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardHeader className="h-20 bg-gray-200 dark:bg-gray-700" />
          <CardContent className="h-40 bg-gray-100 dark:bg-gray-800" />
        </Card>
      </div>
    );
  }

  if (!earnings || !timeframeData) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">No earnings data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Barber Selection */}
      {showAllBarbers && barbers.length > 0 && (
        <div className="flex items-center justify-between">
          <Select value={selectedBarberId} onValueChange={setSelectedBarberId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a barber" />
            </SelectTrigger>
            <SelectContent>
              {barbers.map((barber) => (
                <SelectItem key={barber.id} value={barber.id}>
                  {barber.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              variant={timeframe === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeframe('today')}
            >
              Today
            </Button>
            <Button
              variant={timeframe === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeframe('week')}
            >
              This Week
            </Button>
            <Button
              variant={timeframe === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeframe('month')}
            >
              This Month
            </Button>
          </div>
        </div>
      )}

      {/* Main Earnings Card */}
      <Card className="border-2 border-green-200 dark:border-green-800">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Total Earnings</CardTitle>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-4xl font-bold text-green-600 dark:text-green-400">
            <AnimatedNumber value={timeframeData.total} format={formatCurrency} />
          </div>
          {timeframe !== 'today' && timeframeData.trend !== undefined && (
            <div className="flex items-center gap-2 mt-2">
              {timeframeData.trend > 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">
                    +{timeframeData.trend}% from last {timeframe}
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-600">
                    {timeframeData.trend}% from last {timeframe}
                  </span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Earnings Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Revenue</CardTitle>
            <Scissors className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(timeframeData.services)}</div>
            <Progress
              value={(timeframeData.services / timeframeData.total) * 100}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tips</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(timeframeData.tips)}</div>
            <Progress
              value={(timeframeData.tips / timeframeData.total) * 100}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Product Sales</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(timeframeData.products)}</div>
            <Progress
              value={(timeframeData.products / timeframeData.total) * 100}
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timeframeData.appointments}</div>
            <p className="text-xs text-muted-foreground">
              {timeframe === 'today' ? 'Completed today' : `This ${timeframe}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(earnings.pending_payout)}</div>
            <p className="text-xs text-muted-foreground">
              Next payout: {formatDate(earnings.next_payout_date)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{earnings.commission_rate}%</div>
            <p className="text-xs text-muted-foreground">Current rate</p>
          </CardContent>
        </Card>

        {earnings.booth_rent_due !== undefined && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Booth Rent</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(earnings.booth_rent_due)}</div>
              <Badge
                variant={earnings.booth_rent_status === 'paid' ? 'success' : 'warning'}
                className="mt-1"
              >
                {earnings.booth_rent_status}
              </Badge>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              Request Early Payout
            </Button>
            <Button variant="outline" size="sm">
              View Detailed Report
            </Button>
            <Button variant="outline" size="sm">
              Update Bank Info
            </Button>
            <Button variant="outline" size="sm">
              Tax Documents
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
