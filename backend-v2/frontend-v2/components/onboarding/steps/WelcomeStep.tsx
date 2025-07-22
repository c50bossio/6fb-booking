'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, TrendingUp, Users, DollarSign, Target, Clock, CheckCircle } from 'lucide-react'
import { useSixFigureWizard } from '../SixFigureWizardContext'

export function WelcomeStep() {
  const { goToNextStep } = useSixFigureWizard()

  const principlesList = [
    {
      icon: DollarSign,
      title: 'Value-Based Pricing',
      description: 'Price based on the value you deliver, not just time spent'
    },
    {
      icon: Users,
      title: 'Client Relationship Focus',
      description: 'Build long-term relationships that drive repeat business and referrals'
    },
    {
      icon: Star,
      title: 'Premium Positioning',
      description: 'Position yourself as a premium service provider, not a commodity'
    },
    {
      icon: TrendingUp,
      title: 'Business Systems',
      description: 'Implement scalable systems that work without constant oversight'
    }
  ]

  const pathwayMilestones = [
    {
      year: 'Year 1',
      target: '$40,000-$60,000',
      focus: 'Foundation & Brand Building',
      description: 'Establish premium positioning and core client base'
    },
    {
      year: 'Year 2',
      target: '$60,000-$80,000',
      focus: 'Growth & Optimization',
      description: 'Expand services and increase transaction value'
    },
    {
      year: 'Year 3',
      target: '$80,000-$100,000+',
      focus: 'Scale & Mastery',
      description: 'Achieve premium market position and six-figure milestone'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full">
          <Star className="w-6 h-6 text-yellow-600" />
          <span className="font-semibold text-yellow-800">OWN THE CHAIR. OWN THE BRAND. OWN THE FUTURE.</span>
        </div>
        <h2 className="text-4xl font-bold text-gray-900">Welcome to Six Figure Success</h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Transform your barbering from a trade into a scalable, profitable business model 
          capable of generating six-figure annual revenues through proven methodologies.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Core Philosophy */}
        <Card className="border-2 border-blue-100 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-900">
              <Target className="w-6 h-6" />
              <span>Core Philosophy</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-blue-800">
              The Six Figure Barber methodology transforms barbers from service providers 
              into entrepreneurs, artists, and business owners.
            </p>
            
            <div className="space-y-3">
              {principlesList.map((principle, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded-lg">
                  <principle.icon className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <div className="font-semibold text-blue-900">{principle.title}</div>
                    <div className="text-sm text-blue-700">{principle.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Success Pathway */}
        <Card className="border-2 border-green-100 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-900">
              <TrendingUp className="w-6 h-6" />
              <span>Your Success Pathway</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-green-800">
              A proven 3-year roadmap to achieving and sustaining six-figure annual revenue.
            </p>
            
            <div className="space-y-3">
              {pathwayMilestones.map((milestone, index) => (
                <div key={index} className="p-4 bg-white rounded-lg border-l-4 border-green-500">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {milestone.year}
                    </Badge>
                    <span className="font-bold text-green-700">{milestone.target}</span>
                  </div>
                  <div className="font-semibold text-green-900 mb-1">{milestone.focus}</div>
                  <div className="text-sm text-green-700">{milestone.description}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* What This Wizard Will Do */}
      <Card className="border-2 border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-purple-900">What This Setup Wizard Will Do</CardTitle>
          <p className="text-purple-700">
            In the next 30-40 minutes, we'll configure your BookedBarber platform to implement 
            the Six Figure Barber methodology perfectly aligned with your goals.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-semibold text-purple-900">Set Revenue Goals</div>
                  <div className="text-sm text-purple-700">Define your path to six figures</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-semibold text-purple-900">Design Service Portfolio</div>
                  <div className="text-sm text-purple-700">Create premium signature offerings</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-semibold text-purple-900">Implement Value Pricing</div>
                  <div className="text-sm text-purple-700">Strategic pricing for premium positioning</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-semibold text-purple-900">Configure Business Hours</div>
                  <div className="text-sm text-purple-700">Optimize availability for maximum revenue</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-semibold text-purple-900">Create Client Tiers</div>
                  <div className="text-sm text-purple-700">VIP experiences and loyalty programs</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-semibold text-purple-900">Setup Marketing Systems</div>
                  <div className="text-sm text-purple-700">Automated referral and retention engine</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-semibold text-purple-900">Analytics Dashboard</div>
                  <div className="text-sm text-purple-700">Track progress toward six-figure goals</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-semibold text-purple-900">Success Monitoring</div>
                  <div className="text-sm text-purple-700">KPIs aligned with Six Figure methodology</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-white rounded-lg border-2 border-yellow-200">
            <div className="flex items-start space-x-3">
              <Clock className="w-6 h-6 text-yellow-600 mt-1" />
              <div>
                <div className="font-semibold text-yellow-900 mb-2">Time Investment: ~30-40 minutes</div>
                <div className="text-sm text-yellow-800 space-y-1">
                  <div>• You can save progress and return at any time</div>
                  <div>• Each step builds on previous configuration</div>
                  <div>• Skip sections and customize later if needed</div>
                  <div>• Your setup will be optimized for immediate results</div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-6">
            <Button 
              onClick={goToNextStep}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3"
            >
              Start Your Six Figure Journey
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}