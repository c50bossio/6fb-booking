'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Mock data - in real app this would come from API
const mockSixFBScore = {
  overallScore: 87.2,
  grade: "B+",
  components: {
    bookingUtilization: 85.0,
    revenueGrowth: 92.5,
    customerRetention: 78.3,
    averageTicket: 89.1,
    serviceQuality: 91.0
  }
}

const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A+':
    case 'A':
      return 'bg-green-500 text-white'
    case 'B+':
    case 'B':
      return 'bg-blue-500 text-white'
    case 'C+':
    case 'C':
      return 'bg-yellow-500 text-white'
    default:
      return 'bg-red-500 text-white'
  }
}

const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-green-600'
  if (score >= 80) return 'text-blue-600'
  if (score >= 70) return 'text-yellow-600'
  return 'text-red-600'
}

export default function SixFBScore() {
  const [selectedPeriod, setSelectedPeriod] = useState('weekly')
  const [showDetails, setShowDetails] = useState(false)

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period)
    // In Phase 2: This would trigger API call to get score for different period
    alert(`Switching to ${period} view. In Phase 2: API call to get ${period} 6FB score.`)
  }

  const handleScoreClick = () => {
    setShowDetails(!showDetails)
  }

  return (
    <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-2 border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">6FB Performance Score</CardTitle>
            <CardDescription>Your overall business performance this week</CardDescription>
            <div className="flex gap-2 mt-2">
              {['daily', 'weekly', 'monthly'].map((period) => (
                <button
                  key={period}
                  onClick={() => handlePeriodChange(period)}
                  className={`px-3 py-1 text-xs rounded-full capitalize ${
                    selectedPeriod === period 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <div className="text-center cursor-pointer" onClick={handleScoreClick}>
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold transition-transform hover:scale-105 ${getGradeColor(mockSixFBScore.grade)}`}>
              {mockSixFBScore.grade}
            </div>
            <div className={`text-3xl font-bold mt-2 ${getScoreColor(mockSixFBScore.overallScore)}`}>
              {mockSixFBScore.overallScore}
            </div>
            <div className="text-xs text-gray-500 mt-1">Click for details</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Booking Utilization */}
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 mb-1">Booking Utilization</div>
            <div className={`text-2xl font-bold ${getScoreColor(mockSixFBScore.components.bookingUtilization)}`}>
              {mockSixFBScore.components.bookingUtilization}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${mockSixFBScore.components.bookingUtilization}%` }}
              ></div>
            </div>
          </div>

          {/* Revenue Growth */}
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 mb-1">Revenue Growth</div>
            <div className={`text-2xl font-bold ${getScoreColor(mockSixFBScore.components.revenueGrowth)}`}>
              {mockSixFBScore.components.revenueGrowth}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${mockSixFBScore.components.revenueGrowth}%` }}
              ></div>
            </div>
          </div>

          {/* Customer Retention */}
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 mb-1">Customer Retention</div>
            <div className={`text-2xl font-bold ${getScoreColor(mockSixFBScore.components.customerRetention)}`}>
              {mockSixFBScore.components.customerRetention}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-slate-600 h-2 rounded-full" 
                style={{ width: `${mockSixFBScore.components.customerRetention}%` }}
              ></div>
            </div>
          </div>

          {/* Average Ticket */}
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 mb-1">Average Ticket</div>
            <div className={`text-2xl font-bold ${getScoreColor(mockSixFBScore.components.averageTicket)}`}>
              {mockSixFBScore.components.averageTicket}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-yellow-600 h-2 rounded-full" 
                style={{ width: `${mockSixFBScore.components.averageTicket}%` }}
              ></div>
            </div>
          </div>

          {/* Service Quality */}
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 mb-1">Service Quality</div>
            <div className={`text-2xl font-bold ${getScoreColor(mockSixFBScore.components.serviceQuality)}`}>
              {mockSixFBScore.components.serviceQuality}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-red-600 h-2 rounded-full" 
                style={{ width: `${mockSixFBScore.components.serviceQuality}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-center space-x-4 text-sm text-gray-600">
          <span>💡 Tip: Focus on customer retention to improve your overall score</span>
        </div>
        
        {showDetails && (
          <div className="mt-4 p-4 bg-white rounded-lg border">
            <h4 className="font-semibold text-gray-900 mb-2">Score Breakdown Details</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• <strong>Booking Utilization:</strong> You&apos;re operating at {mockSixFBScore.components.bookingUtilization}% capacity</p>
              <p>• <strong>Revenue Growth:</strong> Strong {mockSixFBScore.components.revenueGrowth}% growth trend</p>
              <p>• <strong>Customer Retention:</strong> {mockSixFBScore.components.customerRetention}% of customers are returning</p>
              <p>• <strong>Average Ticket:</strong> Performing at {mockSixFBScore.components.averageTicket}% of target</p>
              <p>• <strong>Service Quality:</strong> {mockSixFBScore.components.serviceQuality}% based on tip percentages</p>
            </div>
            <div className="mt-3 text-xs text-blue-600">
              In Phase 2: Detailed analytics, historical trends, and improvement recommendations
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}