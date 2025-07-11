'use client'

import { 
  TrendingUp, 
  TrendingDown, 
  Award, 
  AlertTriangle,
  Clock,
  DollarSign,
  Users,
  Star,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { type Service } from '@/lib/api'

interface ServicePerformanceMetricsProps {
  topServices: Service[]
  underperformingServices: Service[]
  dateRange: string
}

export default function ServicePerformanceMetrics({
  topServices,
  underperformingServices,
  dateRange
}: ServicePerformanceMetricsProps) {
  // Mock performance data - in real implementation, this would come from API
  const getPerformanceData = (service: Service) => ({
    bookings: service.booking_count || 0,
    revenue: (service.booking_count || 0) * service.base_price,
    growth: Math.random() * 100 - 20, // Mock growth percentage
    rating: service.average_rating || 4.5,
    utilizationRate: Math.random() * 100,
    rebookingRate: Math.random() * 100,
    avgTimeToBook: Math.floor(Math.random() * 48) // hours
  })

  const getPerformanceIndicator = (growth: number) => {
    if (growth > 20) return { icon: ArrowUp, color: 'text-green-600', label: 'Excellent' }
    if (growth > 5) return { icon: ArrowUp, color: 'text-blue-600', label: 'Good' }
    if (growth > -5) return { icon: ArrowDown, color: 'text-yellow-600', label: 'Stable' }
    return { icon: ArrowDown, color: 'text-red-600', label: 'Declining' }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Top Performing Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topServices.map((service, index) => {
                const data = getPerformanceData(service)
                const indicator = getPerformanceIndicator(data.growth)
                const IndicatorIcon = indicator.icon

                return (
                  <div key={service.id} className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-sm font-bold text-yellow-700">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-semibold">{service.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            ${service.base_price} • {service.duration_minutes}min
                          </p>
                        </div>
                      </div>
                      <Badge variant={indicator.color.includes('green') ? 'success' : 'default'}>
                        {indicator.label}
                      </Badge>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-xs text-gray-500">Bookings</p>
                        <p className="font-semibold">{data.bookings}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Revenue</p>
                        <p className="font-semibold">${data.revenue}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Growth</p>
                        <p className={`font-semibold flex items-center justify-center gap-1 ${indicator.color}`}>
                          <IndicatorIcon className="w-3 h-3" />
                          {Math.abs(data.growth).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Performance Bars */}
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Utilization Rate</span>
                          <span>{data.utilizationRate.toFixed(0)}%</span>
                        </div>
                        <Progress value={data.utilizationRate} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Client Satisfaction</span>
                          <span>{data.rating}/5</span>
                        </div>
                        <Progress value={data.rating * 20} className="h-2" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Underperformers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Services Needing Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {underperformingServices.map((service) => {
                const data = getPerformanceData(service)
                const issues = []
                
                if (data.bookings < 5) issues.push('Low bookings')
                if (data.utilizationRate < 30) issues.push('Underutilized')
                if (data.rating < 4) issues.push('Low satisfaction')
                if (data.growth < -10) issues.push('Declining demand')

                return (
                  <div key={service.id} className="space-y-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{service.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          ${service.base_price} • {service.duration_minutes}min
                        </p>
                      </div>
                      <TrendingDown className="w-5 h-5 text-orange-500" />
                    </div>

                    {/* Issues */}
                    <div className="flex flex-wrap gap-1">
                      {issues.map((issue, idx) => (
                        <Badge key={idx} variant="destructive" className="text-xs">
                          {issue}
                        </Badge>
                      ))}
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-3 text-center text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Bookings</p>
                        <p className="font-semibold text-red-600">{data.bookings}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Utilization</p>
                        <p className="font-semibold text-orange-600">{data.utilizationRate.toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Rating</p>
                        <p className="font-semibold">{data.rating.toFixed(1)}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        Analyze
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        Optimize
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Recommendations */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Improvement Strategies
              </h4>
              <ul className="space-y-1 text-sm">
                <li>• Review pricing strategy for underperforming services</li>
                <li>• Consider bundling with popular services</li>
                <li>• Enhance service descriptions and marketing</li>
                <li>• Train staff to promote these services</li>
                <li>• Analyze competitor offerings and adjust</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary ({dateRange})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-2xl font-bold">{topServices.length}</p>
              <p className="text-sm text-gray-600">High Performers</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-2xl font-bold">{underperformingServices.length}</p>
              <p className="text-sm text-gray-600">Need Attention</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-2xl font-bold">68%</p>
              <p className="text-sm text-gray-600">Avg Utilization</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Star className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-2xl font-bold">4.6</p>
              <p className="text-sm text-gray-600">Avg Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}