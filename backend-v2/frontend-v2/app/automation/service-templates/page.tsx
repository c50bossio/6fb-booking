"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  BeakerIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ArrowRightIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { ServiceTemplateSelector } from '@/components/onboarding/ServiceTemplateSelector'
import { ServiceTemplate } from '@/lib/types/service-templates'

interface TemplateStats {
  totalTemplates: number
  appliedTemplates: number
  revenueIncrease: string
  timesSaved: string
}

export default function ServiceTemplatesPage() {
  const [selectedTemplates, setSelectedTemplates] = useState<ServiceTemplate[]>([])
  const [activeTab, setActiveTab] = useState('browse')
  const [stats, setStats] = useState<TemplateStats>({
    totalTemplates: 30,
    appliedTemplates: 0,
    revenueIncrease: '+25%',
    timesSaved: '3 hours'
  })
  const [loading, setLoading] = useState(false)

  const handleTemplateSelect = (templates: ServiceTemplate[]) => {
    setSelectedTemplates(templates)
  }

  const handleApplyTemplates = async (templates: ServiceTemplate[]) => {
    setLoading(true)
    try {
      // Here you would integrate with your actual service API
      console.log('Applying templates:', templates)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Update stats
      setStats(prev => ({
        ...prev,
        appliedTemplates: prev.appliedTemplates + templates.length
      }))
      
      toast.success(`Successfully applied ${templates.length} service template${templates.length !== 1 ? 's' : ''}`)
      setSelectedTemplates([])
      setActiveTab('applied')
    } catch (error) {
      toast.error('Failed to apply templates. Please try again.')
      console.error('Template application error:', error)
    } finally {
      setLoading(false)
    }
  }

  const benefits = [
    {
      icon: StarIcon,
      title: 'Six Figure Barber Methodology',
      description: 'All templates align with proven revenue optimization principles'
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Revenue Impact Scoring',
      description: 'Each template includes AI-calculated revenue potential'
    },
    {
      icon: SparklesIcon,
      title: 'Professional Descriptions',
      description: 'Marketing-optimized service descriptions that convert'
    },
    {
      icon: ArrowTrendingUpIcon,
      title: 'Pricing Optimization',
      description: 'Smart pricing recommendations based on market analysis'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BeakerIcon className="h-8 w-8 text-primary-600" />
            Service Templates
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            30+ Six Figure Barber methodology-aligned templates to optimize your services
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <SparklesIcon className="h-3 w-3" />
          AI-Powered Recommendations
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Available Templates
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalTemplates}+
                </p>
              </div>
              <BeakerIcon className="h-8 w-8 text-primary-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Applied Templates
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.appliedTemplates}
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
                  Revenue Increase
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.revenueIncrease}
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
                  Time Saved
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.timesSaved}
                </p>
              </div>
              <ClockIcon className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Benefits Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <InformationCircleIcon className="h-5 w-5 text-primary-600" />
            Why Use Service Templates?
          </CardTitle>
          <CardDescription>
            Professional service templates designed with Six Figure Barber methodology
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex-shrink-0">
                  <benefit.icon className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                    {benefit.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Template Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" defaultValue="browse">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="browse">Browse Templates</TabsTrigger>
          <TabsTrigger value="applied">Applied Templates</TabsTrigger>
          <TabsTrigger value="custom">Custom Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          <Alert>
            <InformationCircleIcon className="h-4 w-4" />
            <AlertDescription>
              Select up to 5 templates to apply to your services. Each template includes optimized pricing, descriptions, and Six Figure Barber methodology alignment.
            </AlertDescription>
          </Alert>

          <ServiceTemplateSelector
            onTemplatesSelect={handleTemplateSelect}
            selectedTemplates={selectedTemplates}
            maxSelections={5}
            allowMultiSelect={true}
            onApply={handleApplyTemplates}
          />
        </TabsContent>

        <TabsContent value="applied" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Applied Service Templates</CardTitle>
              <CardDescription>
                Templates currently active in your service catalog
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.appliedTemplates === 0 ? (
                <div className="text-center py-12">
                  <BeakerIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Templates Applied Yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Browse and apply templates to get started with service optimization
                  </p>
                  <Button onClick={() => setActiveTab('browse')}>
                    Browse Templates
                    <ArrowRightIcon className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircleIcon className="h-4 w-4" />
                    <AlertDescription>
                      You have {stats.appliedTemplates} active service template{stats.appliedTemplates !== 1 ? 's' : ''} 
                      {stats.revenueIncrease && ` contributing to a ${stats.revenueIncrease} revenue increase`}.
                    </AlertDescription>
                  </Alert>
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-400">
                      Applied templates will be displayed here with management options.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Templates</CardTitle>
              <CardDescription>
                Create and manage your own service templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <SparklesIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Custom Templates Coming Soon
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Create your own templates based on successful service configurations
                </p>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}