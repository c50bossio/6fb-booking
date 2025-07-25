'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api-client-sentry'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarDays, TrendingUp, DollarSign, Users, ArrowUp, ArrowDown, Loader2 } from 'lucide-react'

interface UpsellAttempt {
    id: string
    service_name: string
    original_service: string
    status: 'pending' | 'converted' | 'declined' | 'expired'
    created_at: string
    conversion_date?: string
    revenue_impact?: number
    channel: 'email' | 'sms' | 'in_person'
}

interface UpsellAnalytics {
    total_attempts: number
    conversions: number
    conversion_rate: number
    total_revenue: number
    average_revenue_per_conversion: number
    top_converting_services: Array<{
        service_name: string
        conversions: number
        revenue: number
    }>
    trends: Array<{
        date: string
        attempts: number
        conversions: number
        revenue: number
    }>
}

export default function UpsellAnalyticsPage() {
    const { user } = useAuth()
    const [analytics, setAnalytics] = useState<UpsellAnalytics | null>(null)
    const [recentAttempts, setRecentAttempts] = useState<UpsellAttempt[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [dateRange, setDateRange] = useState('30d')

    useEffect(() => {
        if (user) {
            loadAnalytics()
        }
    }, [user, dateRange])

    const loadAnalytics = async () => {
        try {
            setLoading(true)
            setError(null)

            // Load analytics overview
            const overviewResponse = await api.get('/api/v2/analytics/upselling/overview', {
                params: { period: dateRange }
            })
            
            setAnalytics(overviewResponse.data)

            // Load recent attempts
            const attemptsResponse = await api.get('/api/v2/analytics/upselling/attempts', {
                params: { limit: 10 }
            })
            
            setRecentAttempts(attemptsResponse.data.attempts || [])

        } catch (err: any) {
            console.error('Failed to load upselling analytics:', err)
            setError(err.message || 'Failed to load analytics data')
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'converted': return 'bg-green-100 text-green-800'
            case 'pending': return 'bg-yellow-100 text-yellow-800'
            case 'declined': return 'bg-red-100 text-red-800'
            case 'expired': return 'bg-gray-100 text-gray-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    if (loading) {
        return (
            <div className="container mx-auto p-6 max-w-7xl">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="flex items-center space-x-2">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Loading upselling analytics...</span>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="container mx-auto p-6 max-w-7xl">
                <Alert className="max-w-lg mx-auto">
                    <AlertDescription>
                        Failed to Load Analytics: {error}
                    </AlertDescription>
                </Alert>
                <div className="text-center mt-4">
                    <Button onClick={loadAnalytics} variant="outline">
                        Try Again
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Upselling Analytics</h1>
                    <p className="text-muted-foreground mt-2">
                        Track conversion rates and revenue from upselling campaigns
                    </p>
                </div>
                
                <div className="flex items-center space-x-4">
                    <select 
                        value={dateRange} 
                        onChange={(e) => setDateRange(e.target.value)}
                        className="px-3 py-2 border rounded-lg"
                    >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 3 months</option>
                    </select>
                </div>
            </div>

            {/* Key Metrics */}
            {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{analytics.total_attempts}</div>
                            <p className="text-xs text-muted-foreground">
                                Upselling opportunities created
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {(analytics.conversion_rate * 100).toFixed(1)}%
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {analytics.conversions} conversions
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(analytics.total_revenue)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                From upselling conversions
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg Revenue</CardTitle>
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(analytics.average_revenue_per_conversion)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Per conversion
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Converting Services */}
                {analytics && analytics.top_converting_services.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Converting Services</CardTitle>
                            <CardDescription>
                                Services with highest conversion rates
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {analytics.top_converting_services.map((service, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{service.service_name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {service.conversions} conversions
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium">
                                                {formatCurrency(service.revenue)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Recent Attempts */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Upsell Attempts</CardTitle>
                        <CardDescription>
                            Latest upselling activities and their status
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentAttempts.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">
                                    No recent upselling attempts
                                </p>
                            ) : (
                                recentAttempts.map((attempt) => (
                                    <div key={attempt.id} className="flex items-center justify-between border-b pb-3">
                                        <div className="flex-1">
                                            <p className="font-medium">{attempt.service_name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                from {attempt.original_service}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDate(attempt.created_at)} • {attempt.channel}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Badge className={getStatusColor(attempt.status)}>
                                                {attempt.status}
                                            </Badge>
                                            {attempt.revenue_impact && (
                                                <span className="text-sm font-medium text-green-600">
                                                    {formatCurrency(attempt.revenue_impact)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Performance Trends */}
            {analytics && analytics.trends.length > 0 && (
                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle>Performance Trends</CardTitle>
                        <CardDescription>
                            Daily performance over the selected period
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {analytics.trends.map((trend, index) => (
                                <div key={index} className="flex items-center justify-between border-b pb-2">
                                    <div>
                                        <p className="font-medium">{formatDate(trend.date)}</p>
                                    </div>
                                    <div className="flex items-center space-x-6 text-sm">
                                        <span>{trend.attempts} attempts</span>
                                        <span className="text-green-600">{trend.conversions} conversions</span>
                                        <span className="font-medium">{formatCurrency(trend.revenue)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}