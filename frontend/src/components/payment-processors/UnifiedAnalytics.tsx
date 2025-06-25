'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  TrendingUp,
  CreditCard,
  Building2,
  DollarSign,
  Activity,
  Loader2
} from 'lucide-react'
import { paymentProcessorsApi, UnifiedAnalytics } from '@/lib/api/payment-processors'
import { formatCurrency } from '@/lib/utils'
import { format, subDays } from 'date-fns'

const COLORS = {
  stripe: '#635BFF',
  square: '#00D924'
}

export default function UnifiedAnalyticsView() {
  const [analytics, setAnalytics] = useState<UnifiedAnalytics | null>(null)
  const [dateRange, setDateRange] = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const endDate = new Date()
      const startDate = subDays(endDate, dateRange)

      const data = await paymentProcessorsApi.getUnifiedAnalytics(startDate, endDate)
      setAnalytics(data)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!analytics) {
    return null
  }

  const pieData = [
    { name: 'Stripe', value: analytics.summary.stripe.volume },
    { name: 'Square', value: analytics.summary.square.volume }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Unified Payment Analytics</h2>
          <p className="text-muted-foreground">
            Combined view of all payment processor activity
          </p>
        </div>
        <Select value={dateRange.toString()} onValueChange={(value) => setDateRange(parseInt(value))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Volume"
          value={formatCurrency(analytics.summary.total_volume)}
          icon={<DollarSign className="h-4 w-4" />}
          trend={analytics.summary.total_volume > 0 ? 'up' : 'neutral'}
        />
        <SummaryCard
          title="Total Transactions"
          value={analytics.summary.total_transactions.toString()}
          icon={<Activity className="h-4 w-4" />}
          trend="neutral"
        />
        <SummaryCard
          title="Stripe Volume"
          value={formatCurrency(analytics.summary.stripe.volume)}
          icon={<CreditCard className="h-4 w-4" />}
          subtitle={`${analytics.summary.stripe.percentage}%`}
        />
        <SummaryCard
          title="Square Volume"
          value={formatCurrency(analytics.summary.square.volume)}
          icon={<Building2 className="h-4 w-4" />}
          subtitle={`${analytics.summary.square.percentage}%`}
        />
      </div>

      {/* Charts */}
      <Tabs defaultValue="volume" className="space-y-4">
        <TabsList>
          <TabsTrigger value="volume">Volume Over Time</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="volume" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Processing Volume</CardTitle>
              <CardDescription>
                Daily payment volume across both processors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={analytics.daily_analytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                  />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="stripe_volume"
                    stroke={COLORS.stripe}
                    name="Stripe"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="square_volume"
                    stroke={COLORS.square}
                    name="Square"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="total_volume"
                    stroke="#8884d8"
                    name="Total"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Count</CardTitle>
              <CardDescription>
                Number of transactions processed daily
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={analytics.daily_analytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                  />
                  <Legend />
                  <Bar
                    dataKey="stripe_transactions"
                    fill={COLORS.stripe}
                    name="Stripe"
                  />
                  <Bar
                    dataKey="square_transactions"
                    fill={COLORS.square}
                    name="Square"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Volume Distribution</CardTitle>
                <CardDescription>
                  Share of total processing volume
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill={COLORS.stripe} />
                      <Cell fill={COLORS.square} />
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Processor Breakdown</CardTitle>
                <CardDescription>
                  Detailed metrics by processor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ProcessorMetric
                  name="Stripe"
                  icon={<CreditCard className="h-4 w-4" />}
                  transactions={analytics.summary.stripe.transactions}
                  volume={analytics.summary.stripe.volume}
                  percentage={analytics.summary.stripe.percentage}
                  color={COLORS.stripe}
                />
                <ProcessorMetric
                  name="Square"
                  icon={<Building2 className="h-4 w-4" />}
                  transactions={analytics.summary.square.transactions}
                  volume={analytics.summary.square.volume}
                  percentage={analytics.summary.square.percentage}
                  color={COLORS.square}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface SummaryCardProps {
  title: string
  value: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  subtitle?: string
}

function SummaryCard({ title, value, icon, trend = 'neutral', subtitle }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
        {trend === 'up' && (
          <div className="flex items-center text-xs text-green-600">
            <TrendingUp className="h-3 w-3 mr-1" />
            Trending up
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface ProcessorMetricProps {
  name: string
  icon: React.ReactNode
  transactions: number
  volume: number
  percentage: number
  color: string
}

function ProcessorMetric({ name, icon, transactions, volume, percentage, color }: ProcessorMetricProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-full" style={{ backgroundColor: `${color}20` }}>
          {icon}
        </div>
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-sm text-muted-foreground">
            {transactions} transactions
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold">{formatCurrency(volume)}</p>
        <p className="text-sm text-muted-foreground">{percentage}%</p>
      </div>
    </div>
  )
}
