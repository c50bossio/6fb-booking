"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  EyeIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  InformationCircleIcon,
  LightBulbIcon,
  TagIcon,
  HeartIcon
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

interface CTAExample {
  id: string
  text: string
  context: string
  sentiment: 'positive' | 'neutral' | 'negative'
  type: 'book' | 'visit' | 'contact' | 'follow' | 'special_offer'
  score: number
  metrics?: {
    clicks: number
    conversions: number
    rating: number
  }
}

interface SmartCTAConfig {
  businessType: string
  targetAudience: string
  tone: string
  context: string
  sentiment: string
  ctaType: string
}

const exampleCTAs: CTAExample[] = [
  {
    id: '1',
    text: "Ready to transform your look? Book your premium cut with our master barber today and experience the Six Figure Barber difference.",
    context: 'Homepage',
    sentiment: 'positive',
    type: 'book',
    score: 94,
    metrics: { clicks: 245, conversions: 47, rating: 4.8 }
  },
  {
    id: '2',
    text: "Don't let another day pass with an average haircut. Elevate your style—schedule your appointment now!",
    context: 'Review Response',
    sentiment: 'neutral',
    type: 'book',
    score: 87,
    metrics: { clicks: 198, conversions: 34, rating: 4.5 }
  },
  {
    id: '3',
    text: "Thank you for your feedback! We'd love to show you our improved service. Visit us for a complimentary consultation.",
    context: 'Negative Review Response',
    sentiment: 'negative',
    type: 'visit',
    score: 91,
    metrics: { clicks: 67, conversions: 23, rating: 4.7 }
  },
  {
    id: '4',
    text: "Limited time: 15% off your first visit! Join hundreds of satisfied clients who trust us with their signature look.",
    context: 'Marketing Campaign',
    sentiment: 'positive',
    type: 'special_offer',
    score: 96,
    metrics: { clicks: 412, conversions: 89, rating: 4.9 }
  }
]

export default function SmartCTAPage() {
  const [config, setConfig] = useState<SmartCTAConfig>({
    businessType: 'barbershop',
    targetAudience: 'professionals',
    tone: 'professional',
    context: 'homepage',
    sentiment: 'positive',
    ctaType: 'book'
  })
  const [generatedCTAs, setGeneratedCTAs] = useState<CTAExample[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('generator')

  const handleGenerate = async () => {
    setLoading(true)
    try {
      // Simulate API call to Smart CTA service
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock generated CTAs based on config
      const mockCTAs: CTAExample[] = [
        {
          id: Date.now().toString(),
          text: generateMockCTA(config),
          context: config.context,
          sentiment: config.sentiment as any,
          type: config.ctaType as any,
          score: Math.floor(Math.random() * 20) + 80
        },
        {
          id: (Date.now() + 1).toString(),
          text: generateMockCTA(config, true),
          context: config.context,
          sentiment: config.sentiment as any,
          type: config.ctaType as any,
          score: Math.floor(Math.random() * 20) + 80
        },
        {
          id: (Date.now() + 2).toString(),
          text: generateMockCTA(config, false, true),
          context: config.context,
          sentiment: config.sentiment as any,
          type: config.ctaType as any,
          score: Math.floor(Math.random() * 20) + 80
        }
      ]
      
      setGeneratedCTAs(mockCTAs)
      toast.success('Generated 3 new CTAs successfully!')
    } catch (error) {
      toast.error('Failed to generate CTAs. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const generateMockCTA = (config: SmartCTAConfig, variant = false, creative = false): string => {
    const templates = {
      book: {
        professional: variant ? "Schedule your premium appointment today and join our community of well-groomed professionals." : "Book your appointment now and experience our premium barber services.",
        casual: variant ? "Ready for a fresh new look? Let's get you booked in!" : "Book now and get the cut you deserve!",
        urgent: creative ? "Don't wait—your best look is just one appointment away. Book today!" : "Last-minute availability! Book your slot before it's gone."
      },
      visit: {
        professional: variant ? "Visit our premium location and discover why professionals choose us." : "Come visit us and experience the difference quality makes.",
        casual: variant ? "Stop by anytime—we'd love to meet you!" : "Come check us out—you won't be disappointed!",
        urgent: creative ? "Limited walk-in slots available today. Visit us now!" : "Visit us today—no appointment needed for consultations!"
      },
      special_offer: {
        professional: variant ? "Exclusive offer for new clients: 20% off your first premium service." : "New client special: Save 15% on your first visit with us.",
        casual: variant ? "First time here? Enjoy 20% off—it's our treat!" : "Welcome bonus: 15% off your first cut!",
        urgent: creative ? "Flash sale: 25% off today only for new clients!" : "Limited time: 20% off your first visit this week only!"
      }
    }
    
    const type = config.ctaType as keyof typeof templates
    const tone = config.tone as keyof typeof templates.book
    return templates[type]?.[tone] || "Book your appointment today and experience our premium services."
  }

  const copyCTA = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('CTA copied to clipboard!')
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <HandThumbUpIcon className="h-4 w-4 text-green-500" />
      case 'negative': return <HandThumbDownIcon className="h-4 w-4 text-red-500" />
      default: return <SparklesIcon className="h-4 w-4 text-blue-500" />
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-primary-600" />
            Smart CTA Generator
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            AI-powered call-to-action generation with context-aware personalization
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <SparklesIcon className="h-3 w-3" />
          AI-Powered
        </Badge>
      </div>

      {/* Info Alert */}
      <Alert>
        <InformationCircleIcon className="h-4 w-4" />
        <AlertDescription>
          Generate context-aware CTAs that adapt to customer sentiment, business type, and marketing context. 
          Perfect for review responses, marketing campaigns, and website optimization.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" defaultValue="generator">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generator">CTA Generator</TabsTrigger>
          <TabsTrigger value="examples">Examples Library</TabsTrigger>
          <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TagIcon className="h-5 w-5 text-primary-600" />
                  CTA Configuration
                </CardTitle>
                <CardDescription>
                  Configure your CTA generation parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Business Type</Label>
                  <Select value={config.businessType} onValueChange={(value) => setConfig({...config, businessType: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="barbershop">Barbershop</SelectItem>
                      <SelectItem value="salon">Hair Salon</SelectItem>
                      <SelectItem value="spa">Spa</SelectItem>
                      <SelectItem value="beauty">Beauty Services</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select value={config.targetAudience} onValueChange={(value) => setConfig({...config, targetAudience: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professionals">Professionals</SelectItem>
                      <SelectItem value="millennials">Millennials</SelectItem>
                      <SelectItem value="gen-z">Gen Z</SelectItem>
                      <SelectItem value="families">Families</SelectItem>
                      <SelectItem value="seniors">Seniors</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={config.tone} onValueChange={(value) => setConfig({...config, tone: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual & Friendly</SelectItem>
                      <SelectItem value="urgent">Urgent & Compelling</SelectItem>
                      <SelectItem value="luxury">Luxury & Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Context</Label>
                  <Select value={config.context} onValueChange={(value) => setConfig({...config, context: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homepage">Homepage</SelectItem>
                      <SelectItem value="review-response">Review Response</SelectItem>
                      <SelectItem value="marketing-email">Marketing Email</SelectItem>
                      <SelectItem value="social-media">Social Media</SelectItem>
                      <SelectItem value="sms">SMS Campaign</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Customer Sentiment</Label>
                  <Select value={config.sentiment} onValueChange={(value) => setConfig({...config, sentiment: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>CTA Type</Label>
                  <Select value={config.ctaType} onValueChange={(value) => setConfig({...config, ctaType: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="book">Book Appointment</SelectItem>
                      <SelectItem value="visit">Visit Location</SelectItem>
                      <SelectItem value="contact">Contact Us</SelectItem>
                      <SelectItem value="follow">Follow/Subscribe</SelectItem>
                      <SelectItem value="special_offer">Special Offer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleGenerate} 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-4 w-4 mr-2" />
                      Generate Smart CTAs
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Generated CTAs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LightBulbIcon className="h-5 w-5 text-primary-600" />
                  Generated CTAs
                </CardTitle>
                <CardDescription>
                  AI-generated call-to-actions based on your configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generatedCTAs.length === 0 ? (
                  <div className="text-center py-8">
                    <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No CTAs Generated Yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Configure your settings and click "Generate Smart CTAs" to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {generatedCTAs.map((cta) => (
                      <div key={cta.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getSentimentIcon(cta.sentiment)}
                            <Badge variant="outline" className={getScoreColor(cta.score)}>
                              Score: {cta.score}
                            </Badge>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyCTA(cta.text)}
                          >
                            <ClipboardDocumentIcon className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-gray-900 dark:text-white mb-2 leading-relaxed">
                          "{cta.text}"
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Type: {cta.type}</span>
                          <span>Context: {cta.context}</span>
                          <span>Sentiment: {cta.sentiment}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="examples" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CTA Examples Library</CardTitle>
              <CardDescription>
                Curated examples of high-performing CTAs across different contexts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exampleCTAs.map((cta) => (
                  <div key={cta.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getSentimentIcon(cta.sentiment)}
                        <Badge variant="secondary" className="capitalize">
                          {cta.type.replace('_', ' ')}
                        </Badge>
                        <Badge className={getScoreColor(cta.score)}>
                          {cta.score}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyCTA(cta.text)}
                      >
                        <ClipboardDocumentIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <p className="text-gray-900 dark:text-white mb-3 leading-relaxed">
                      "{cta.text}"
                    </p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Context:</span>
                        <span className="font-medium">{cta.context}</span>
                      </div>
                      {cta.metrics && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Clicks:</span>
                            <span className="font-medium">{cta.metrics.clicks}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Conversions:</span>
                            <span className="font-medium">{cta.metrics.conversions}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Rating:</span>
                            <div className="flex items-center gap-1">
                              <HeartIcon className="h-3 w-3 text-red-500 fill-current" />
                              <span className="font-medium">{cta.metrics.rating}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Generated CTAs
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      24
                    </p>
                  </div>
                  <ChatBubbleLeftRightIcon className="h-8 w-8 text-primary-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Avg. Performance
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      87
                    </p>
                  </div>
                  <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
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
                      +23%
                    </p>
                  </div>
                  <ArrowTrendingUpIcon className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-primary-600" />
                Performance Analytics
              </CardTitle>
              <CardDescription>
                Track the performance of your generated CTAs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Analytics Coming Soon
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Detailed performance tracking and A/B testing results will be available here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}