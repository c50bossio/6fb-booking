'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  CurrencyDollarIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import {
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from '@/lib/recharts'

interface ServiceData {
  id: number
  name: string
  category: string
  price: number
  duration: number
  appointments_count: number
  total_revenue: number
  completion_rate: number
  avg_rating: number
  profit_margin: number
  hourly_rate: number
}

interface ServiceProfitabilityChartProps {
  services: ServiceData[]
  dateRange: {
    startDate: string
    endDate: string
  }
}

const CATEGORY_COLORS = {
  'Premium': '#8B5CF6',
  'Standard': '#3B82F6',
  'Basic': '#6B7280',
  'Add-on': '#10B981',
  'Package': '#F59E0B'
}

export default function ServiceProfitabilityChart({ services, dateRange }: ServiceProfitabilityChartProps) {
  const [selectedView, setSelectedView] = useState<'profitability' | 'efficiency' | 'performance' | 'comparison'>('profitability')
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'margin' | 'hourly_rate'>('revenue')
  
  // Calculate aggregate metrics
  const aggregateMetrics = useMemo(() => {
    const totalRevenue = services.reduce((sum, s) => sum + s.total_revenue, 0)
    const totalAppointments = services.reduce((sum, s) => sum + s.appointments_count, 0)
    const avgMargin = services.reduce((sum, s) => sum + s.profit_margin, 0) / services.length
    const avgHourlyRate = services.reduce((sum, s) => sum + s.hourly_rate, 0) / services.length
    
    return {
      totalRevenue,
      totalAppointments,
      avgMargin,
      avgHourlyRate,
      topService: services.sort((a, b) => b.total_revenue - a.total_revenue)[0],
      mostEfficient: services.sort((a, b) => b.hourly_rate - a.hourly_rate)[0]
    }
  }, [services])
  
  // Sort services by selected metric
  const sortedServices = useMemo(() => {
    const sorted = [...services]
    switch (selectedMetric) {
      case 'revenue':
        return sorted.sort((a, b) => b.total_revenue - a.total_revenue)
      case 'margin':
        return sorted.sort((a, b) => b.profit_margin - a.profit_margin)
      case 'hourly_rate':
        return sorted.sort((a, b) => b.hourly_rate - a.hourly_rate)
      default:
        return sorted
    }
  }, [services, selectedMetric])
  
  // Prepare data for scatter plot (price vs demand)
  const scatterData = useMemo(() => {
    return services.map(service => ({
      x: service.price,
      y: service.appointments_count,
      name: service.name,
      category: service.category,
      revenue: service.total_revenue
    }))
  }, [services])
  
  // Prepare data for radar chart (multi-metric comparison)
  const radarData = useMemo(() => {
    const top5Services = sortedServices.slice(0, 5)
    const metrics = ['Revenue', 'Profit Margin', 'Efficiency', 'Popularity', 'Rating']
    
    // Normalize values to 0-100 scale
    const maxRevenue = Math.max(...services.map(s => s.total_revenue))
    const maxCount = Math.max(...services.map(s => s.appointments_count))
    const maxHourly = Math.max(...services.map(s => s.hourly_rate))
    
    return metrics.map(metric => {
      const dataPoint: any = { metric }
      
      top5Services.forEach(service => {
        switch (metric) {
          case 'Revenue':
            dataPoint[service.name] = (service.total_revenue / maxRevenue) * 100
            break
          case 'Profit Margin':
            dataPoint[service.name] = service.profit_margin
            break
          case 'Efficiency':
            dataPoint[service.name] = (service.hourly_rate / maxHourly) * 100
            break
          case 'Popularity':
            dataPoint[service.name] = (service.appointments_count / maxCount) * 100
            break
          case 'Rating':
            dataPoint[service.name] = (service.avg_rating / 5) * 100
            break
        }
      })
      
      return dataPoint
    })
  }, [services, sortedServices])
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-sm">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: ${entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }
  
  const renderProfitabilityView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Service Profitability Analysis</h3>
        <div className="flex gap-2">
          {(['revenue', 'margin', 'hourly_rate'] as const).map((metric) => (
            <Button
              key={metric}
              variant={selectedMetric === metric ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedMetric(metric)}
            >
              {metric === 'hourly_rate' ? 'Hourly Rate' : metric.charAt(0).toUpperCase() + metric.slice(1)}
            </Button>
          ))}
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={sortedServices.slice(0, 10)} margin={{ left: 50 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            height={100}
            interval={0}
          />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {selectedMetric === 'revenue' && (
            <Bar dataKey="total_revenue" fill="#3B82F6" name="Total Revenue">
              {sortedServices.slice(0, 10).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category as keyof typeof CATEGORY_COLORS] || '#6B7280'} />
              ))}
            </Bar>
          )}
          
          {selectedMetric === 'margin' && (
            <Bar dataKey="profit_margin" fill="#10B981" name="Profit Margin (%)">
              {sortedServices.slice(0, 10).map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.profit_margin > 70 ? '#10B981' : entry.profit_margin > 50 ? '#F59E0B' : '#EF4444'} 
                />
              ))}
            </Bar>
          )}
          
          {selectedMetric === 'hourly_rate' && (
            <Bar dataKey="hourly_rate" fill="#8B5CF6" name="Hourly Rate ($)">
              {sortedServices.slice(0, 10).map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.hourly_rate > 150 ? '#8B5CF6' : entry.hourly_rate > 100 ? '#3B82F6' : '#6B7280'} 
                />
              ))}
            </Bar>
          )}
          
          <ReferenceLine 
            y={selectedMetric === 'revenue' ? aggregateMetrics.totalRevenue / services.length :
               selectedMetric === 'margin' ? aggregateMetrics.avgMargin :
               aggregateMetrics.avgHourlyRate} 
            stroke="#EF4444" 
            strokeDasharray="3 3"
            label="Average"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
  
  const renderEfficiencyView = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Price vs Demand Analysis</h3>
      
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="x" 
            name="Price" 
            unit="$" 
            label={{ value: 'Service Price ($)', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            dataKey="y" 
            name="Bookings" 
            label={{ value: 'Number of Bookings', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload
              return (
                <div className="bg-white p-3 border rounded-lg shadow-lg">
                  <p className="font-medium text-sm">{data.name}</p>
                  <p className="text-sm">Price: ${data.x}</p>
                  <p className="text-sm">Bookings: {data.y}</p>
                  <p className="text-sm">Revenue: ${data.revenue.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">{data.category}</p>
                </div>
              )
            }
            return null
          }} />
          <Scatter 
            name="Services" 
            data={scatterData} 
            fill="#8884d8"
          >
            {scatterData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category as keyof typeof CATEGORY_COLORS] || '#6B7280'} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Sweet Spot Services</p>
            <p className="text-lg font-bold">
              {services.filter(s => s.price > 50 && s.price < 100 && s.appointments_count > 10).length}
            </p>
            <p className="text-xs text-gray-500">$50-100, High demand</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Underpriced Services</p>
            <p className="text-lg font-bold">
              {services.filter(s => s.price < 50 && s.appointments_count > 20).length}
            </p>
            <p className="text-xs text-gray-500">High demand, low price</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Premium Opportunities</p>
            <p className="text-lg font-bold">
              {services.filter(s => s.price > 100 && s.appointments_count > 5).length}
            </p>
            <p className="text-xs text-gray-500">Premium with demand</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Review Candidates</p>
            <p className="text-lg font-bold">
              {services.filter(s => s.appointments_count < 5).length}
            </p>
            <p className="text-xs text-gray-500">Low demand services</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
  
  const renderPerformanceView = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Multi-Metric Performance Comparison</h3>
      
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={radarData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="metric" />
          <PolarRadiusAxis angle={90} domain={[0, 100]} />
          {sortedServices.slice(0, 5).map((service, index) => (
            <Radar
              key={service.name}
              name={service.name}
              dataKey={service.name}
              stroke={['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'][index]}
              fill={['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'][index]}
              fillOpacity={0.3}
            />
          ))}
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
  
  const renderComparisonView = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Service Category Comparison</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(
          services.reduce((acc, service) => {
            if (!acc[service.category]) {
              acc[service.category] = {
                services: [],
                totalRevenue: 0,
                avgPrice: 0,
                avgMargin: 0,
                totalBookings: 0
              }
            }
            acc[service.category].services.push(service)
            acc[service.category].totalRevenue += service.total_revenue
            acc[service.category].totalBookings += service.appointments_count
            return acc
          }, {} as Record<string, any>)
        ).map(([category, data]) => {
          data.avgPrice = data.services.reduce((sum: number, s: ServiceData) => sum + s.price, 0) / data.services.length
          data.avgMargin = data.services.reduce((sum: number, s: ServiceData) => sum + s.profit_margin, 0) / data.services.length
          
          return (
            <Card key={category}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">{category}</CardTitle>
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#6B7280' }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Services</span>
                    <span className="font-medium">{data.services.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Revenue</span>
                    <span className="font-medium">${data.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Price</span>
                    <span className="font-medium">${data.avgPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Margin</span>
                    <span className="font-medium">{data.avgMargin.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Bookings</span>
                    <span className="font-medium">{data.totalBookings}</span>
                  </div>
                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">Top Services:</p>
                    {data.services
                      .sort((a: ServiceData, b: ServiceData) => b.total_revenue - a.total_revenue)
                      .slice(0, 3)
                      .map((service: ServiceData) => (
                        <div key={service.id} className="text-sm text-gray-600">
                          • {service.name} (${service.total_revenue.toLocaleString()})
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-bold">Service Profitability Analysis</h2>
        <div className="flex gap-2">
          {(['profitability', 'efficiency', 'performance', 'comparison'] as const).map((view) => (
            <Button
              key={view}
              variant={selectedView === view ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedView(view)}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">${aggregateMetrics.totalRevenue.toLocaleString()}</p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Top Service</p>
                <p className="text-lg font-bold">{aggregateMetrics.topService?.name}</p>
                <p className="text-xs text-gray-500">${aggregateMetrics.topService?.total_revenue.toLocaleString()}</p>
              </div>
              <ArrowTrendingUpIcon className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Margin</p>
                <p className="text-2xl font-bold">{aggregateMetrics.avgMargin.toFixed(1)}%</p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Most Efficient</p>
                <p className="text-lg font-bold">{aggregateMetrics.mostEfficient?.name}</p>
                <p className="text-xs text-gray-500">${aggregateMetrics.mostEfficient?.hourly_rate}/hr</p>
              </div>
              <ClockIcon className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {selectedView === 'profitability' && renderProfitabilityView()}
      {selectedView === 'efficiency' && renderEfficiencyView()}
      {selectedView === 'performance' && renderPerformanceView()}
      {selectedView === 'comparison' && renderComparisonView()}
      
      {/* Six Figure Barber Recommendations */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <SparklesIcon className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium text-purple-900">Six Figure Barber Optimization</p>
              <div className="mt-2 space-y-2 text-sm text-purple-700">
                {aggregateMetrics.avgMargin < 60 && (
                  <p>• Increase profit margins by optimizing supply costs and service efficiency</p>
                )}
                {services.filter(s => s.hourly_rate < 100).length > services.length / 2 && (
                  <p>• Over 50% of services have hourly rates below $100 - consider price adjustments</p>
                )}
                {services.filter(s => s.appointments_count < 5).length > 3 && (
                  <p>• {services.filter(s => s.appointments_count < 5).length} services have low demand - consider discontinuing or repositioning</p>
                )}
                {aggregateMetrics.topService && aggregateMetrics.topService.total_revenue > aggregateMetrics.totalRevenue * 0.3 && (
                  <p>• "{aggregateMetrics.topService.name}" generates {((aggregateMetrics.topService.total_revenue / aggregateMetrics.totalRevenue) * 100).toFixed(0)}% of revenue - develop similar premium services</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}