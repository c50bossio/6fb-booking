"use client"

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  RocketLaunchIcon,
  BeakerIcon,
  ChatBubbleLeftRightIcon,
  RectangleStackIcon,
  ClipboardDocumentListIcon,
  CogIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  LightBulbIcon,
  UsersIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'

interface AutomationFeature {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  status: 'active' | 'beta' | 'new' | 'coming_soon'
  category: 'templates' | 'generation' | 'optimization' | 'forms'
  benefits: string[]
  setupTime?: string
}

const automationFeatures: AutomationFeature[] = [
  {
    id: 'service-templates',
    name: 'Service Templates',
    description: '30+ Six Figure Barber methodology-aligned templates to jumpstart your services with AI-powered recommendations',
    icon: BeakerIcon,
    href: '/automation/service-templates',
    status: 'active',
    category: 'templates',
    benefits: [
      'Methodology-aligned service structures',
      'Instant pricing optimization',
      'Revenue impact scoring',
      'Professional descriptions'
    ],
    setupTime: '5 minutes'
  },
  {
    id: 'smart-cta',
    name: 'Smart CTA Generator',
    description: 'AI-powered call-to-action generation with context-aware personalization and A/B testing automation',
    icon: ChatBubbleLeftRightIcon,
    href: '/automation/smart-cta',
    status: 'new',
    category: 'generation',
    benefits: [
      'Context-aware personalization',
      'Automated A/B testing',
      'Sentiment-based optimization',
      'Performance tracking'
    ],
    setupTime: '10 minutes'
  },
  {
    id: 'homepage-builder',
    name: 'Homepage Builder',
    description: 'Professional homepage builder with 8-component suite, live preview, and conversion optimization',
    icon: RectangleStackIcon,
    href: '/settings/homepage-builder',
    status: 'active',
    category: 'optimization',
    benefits: [
      'Professional templates',
      'Live preview',
      'SEO optimization',
      'Brand integration'
    ],
    setupTime: '15 minutes'
  },
  {
    id: 'progressive-forms',
    name: 'Progressive Forms',
    description: 'Smart form validation and user experience optimization with real-time validation feedback',
    icon: ClipboardDocumentListIcon,
    href: '/automation/progressive-validation',
    status: 'active',
    category: 'forms',
    benefits: [
      'Real-time validation',
      'User experience optimization',
      'Reduced abandonment rates',
      'Accessibility features'
    ],
    setupTime: '3 minutes'
  }
]

const stats = {
  totalAutomations: 4,
  activeFeatures: 3,
  timesSaved: '2.5 hours/week',
  conversionIncrease: '+15%'
}

export default function AutomationHubPage() {
  const { user } = useAuth()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'new': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'beta': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'coming_soon': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'templates': return BeakerIcon
      case 'generation': return SparklesIcon
      case 'optimization': return ArrowTrendingUpIcon
      case 'forms': return ClipboardDocumentListIcon
      default: return CogIcon
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <RocketLaunchIcon className="h-8 w-8 text-primary-600" />
            Automation Hub
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Powerful automation features designed for the Six Figure Barber methodology
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <SparklesIcon className="h-3 w-3" />
            AI-Powered
          </Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Automations
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalAutomations}
                </p>
              </div>
              <RocketLaunchIcon className="h-8 w-8 text-primary-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Active Features
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.activeFeatures}
                </p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Time Saved
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.timesSaved}
                </p>
              </div>
              <ArrowTrendingUpIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Conversion Boost
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.conversionIncrease}
                </p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Automation Features */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
          Available Automations
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {automationFeatures.map((feature) => {
            const IconComponent = feature.icon
            const CategoryIcon = getCategoryIcon(feature.category)
            
            return (
              <Card key={feature.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
                        <IconComponent className="h-6 w-6 text-primary-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{feature.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getStatusColor(feature.status)}>
                            {feature.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          {feature.setupTime && (
                            <span className="text-sm text-gray-500">
                              Setup: {feature.setupTime}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <CategoryIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Benefits */}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        Key Benefits:
                      </h4>
                      <ul className="space-y-1">
                        {feature.benefits.map((benefit, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Button */}
                    <Separator />
                    <Link href={feature.href}>
                      <Button className="w-full flex items-center justify-center gap-2">
                        {feature.status === 'active' ? 'Launch Feature' : 'Learn More'}
                        <ArrowRightIcon className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Getting Started */}
      <Card className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/10 dark:to-blue-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LightBulbIcon className="h-6 w-6 text-primary-600" />
            Getting Started with Automation
          </CardTitle>
          <CardDescription>
            Maximize your business efficiency with these automation features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">
                1. Start with Service Templates
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose from 30+ Six Figure Barber methodology templates to instantly optimize your service offerings
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">
                2. Build Your Homepage
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create a professional homepage that converts visitors into customers with our drag-and-drop builder
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">
                3. Automate CTAs
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generate smart call-to-actions that adapt to customer sentiment and drive more bookings
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}