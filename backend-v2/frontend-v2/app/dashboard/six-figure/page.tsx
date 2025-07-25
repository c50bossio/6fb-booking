'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Six Figure Goal Tracker Dashboard - Matching your screenshots
export default function SixFigureGoalTracker() {
  const [goalProgress, setGoalProgress] = useState({
    current: 68420,
    goal: 100000,
    percentage: 68.4
  })

  const [metrics, setMetrics] = useState({
    monthlyTarget: 6316,
    projectedTotal: 117291429,
    dailyTarget: 211,
    servicesNeeded: 98,
    newClients: 41,
    retentionRate: 78,
    averageServicePrice: 65,
    upsellOpportunities: 23
  })

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Sidebar Navigation */}
      <div className="fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-800">
        <div className="p-6">
          <div className="flex items-center mb-8">
            <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div>
              <div className="font-semibold">Admin User</div>
              <div className="text-gray-400 text-sm">Platform Admin</div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">CORE</div>
              <div className="space-y-1">
                <div className="flex items-center py-2 px-3 bg-gray-800 rounded-lg text-teal-400">
                  <span className="mr-3">📊</span>
                  Dashboard
                </div>
                <div className="flex items-center py-2 px-3 text-gray-300 hover:bg-gray-800 rounded-lg cursor-pointer">
                  <span className="mr-3">📅</span>
                  Calendar & Scheduling
                </div>
                <div className="flex items-center py-2 px-3 text-gray-300 hover:bg-gray-800 rounded-lg cursor-pointer">
                  <span className="mr-3">👥</span>
                  Clients
                </div>
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">BUSINESS</div>
              <div className="space-y-1">
                <div className="flex items-center py-2 px-3 text-gray-300 hover:bg-gray-800 rounded-lg cursor-pointer">
                  <span className="mr-3">👤</span>
                  Customer Management
                </div>
                <div className="flex items-center py-2 px-3 text-gray-300 hover:bg-gray-800 rounded-lg cursor-pointer">
                  <span className="mr-3">💬</span>
                  Communication
                </div>
                <div className="flex items-center py-2 px-3 text-gray-300 hover:bg-gray-800 rounded-lg cursor-pointer">
                  <span className="mr-3">📈</span>
                  Marketing Suite
                  <Badge className="ml-auto bg-green-500 text-white">New</Badge>
                </div>
                <div className="flex items-center py-2 px-3 text-gray-300 hover:bg-gray-800 rounded-lg cursor-pointer">
                  <span className="mr-3">⭐</span>
                  Reviews
                </div>
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">FINANCE & ANALYTICS</div>
              <div className="space-y-1">
                <div className="flex items-center py-2 px-3 text-gray-300 hover:bg-gray-800 rounded-lg cursor-pointer">
                  <span className="mr-3">📊</span>
                  Analytics
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-400 mt-1">Welcome back, there. Here's your day at a glance.</p>
          </div>
          <div className="flex gap-3">
            <Button className="bg-teal-500 hover:bg-teal-600 text-white">
              📅 View Calendar
            </Button>
            <Button variant="outline" className="border-gray-700 text-gray-300">
              👥 Clients
            </Button>
            <Button variant="outline" className="border-gray-700 text-gray-300">
              📊 Analytics
            </Button>
          </div>
        </div>

        <div className="text-sm text-gray-400 mb-6">
          📅 0 appointments today
        </div>

        {/* Six Figure Goal Tracker */}
        <Card className="bg-gray-900 border-teal-500 border-2 mb-8">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-white text-xl">🏆</span>
                </div>
                <div>
                  <CardTitle className="text-xl text-white">Six Figure Goal Tracker</CardTitle>
                  <p className="text-gray-400">Building your six-figure barbering business</p>
                </div>
              </div>
              <Badge className="bg-yellow-500 text-black">Building</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="flex items-end gap-2 mb-2">
                <span className="text-4xl font-bold text-white">${goalProgress.current.toLocaleString()}</span>
                <span className="text-gray-400 mb-1">of ${goalProgress.goal.toLocaleString()} goal</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Progress to Six Figures</span>
                <span className="text-teal-400 text-lg font-semibold">{goalProgress.percentage}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3">
                <div 
                  className="bg-teal-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${goalProgress.percentage}%` }}
                ></div>
              </div>
              <div className="text-right text-sm text-gray-400 mt-1">{goalProgress.percentage}% Complete</div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-teal-400 text-2xl font-bold">${metrics.monthlyTarget.toLocaleString()}</div>
                <div className="text-gray-400 text-sm">Monthly Target</div>
                <div className="text-green-400 text-xs">5 months remaining</div>
              </div>
              <div className="text-center">
                <div className="text-blue-400 text-2xl font-bold">${metrics.projectedTotal.toLocaleString()}</div>
                <div className="text-gray-400 text-sm">Projected Total</div>
                <div className="text-green-400 text-xs">On track for goal!</div>
              </div>
              <div className="text-center">
                <div className="text-green-400 text-2xl font-bold">${metrics.dailyTarget}</div>
                <div className="text-gray-400 text-sm">Daily Target</div>
                <div className="text-green-400 text-xs">To hit monthly goal</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Six Figure Strategy Insights */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <span className="mr-2">💡</span>
              Six Figure Strategy Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-6 mb-6">
              <div>
                <div className="text-white text-2xl font-bold">{metrics.servicesNeeded}</div>
                <div className="text-gray-400 text-sm">Services needed monthly</div>
              </div>
              <div>
                <div className="text-white text-2xl font-bold">${metrics.averageServicePrice}</div>
                <div className="text-gray-400 text-sm">Average service price</div>
              </div>
              <div>
                <div className="text-white text-2xl font-bold">{metrics.newClients}</div>
                <div className="text-gray-400 text-sm">New clients to acquire</div>
              </div>
              <div>
                <div className="text-white text-2xl font-bold">{metrics.upsellOpportunities}</div>
                <div className="text-gray-400 text-sm">Upsell opportunities</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-gray-400 font-medium">Recommended Focus Areas:</div>
              <div className="space-y-2">
                <div className="flex items-center text-green-400">
                  <span className="mr-2">•</span>
                  Improve client retention (current: {metrics.retentionRate}%)
                </div>
                <div className="flex items-center text-green-400">
                  <span className="mr-2">•</span>
                  Consider premium service offerings
                </div>
                <div className="flex items-center text-green-400">
                  <span className="mr-2">•</span>
                  Capitalize on {metrics.upsellOpportunities} upsell opportunities
                </div>
              </div>
            </div>

            {/* Revenue Gap Section */}
            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <div className="text-gray-400 text-sm mb-2">Current retention rate:</div>
              <div className="text-white text-lg font-semibold">{metrics.retentionRate}%</div>
              <div className="text-gray-400 text-sm">Revenue gap:</div>
            </div>
          </CardContent>
        </Card>

        {/* Upselling Opportunity */}
        <div className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-start">
            <div className="mr-3 mt-1">💡</div>
            <div>
              <div className="font-semibold">Upselling Opportunity: Marcus Johnson</div>
              <div className="text-blue-100 text-sm">Suggest Premium Cut + Beard Trim for +$35 potential revenue</div>
              <Button className="mt-2 bg-blue-700 hover:bg-blue-800 text-white text-sm">
                View Details
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}