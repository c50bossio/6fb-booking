'use client'

import { useState } from 'react'
import { 
  Target, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Info,
  Award,
  Lightbulb,
  ChevronRight,
  Brain,
  Package
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { type Service } from '@/lib/api'

interface Service6FBComplianceProps {
  services: Service[]
  compliance: {
    score: number
    tier: string
    opportunities: string[]
  } | undefined
  onImprove: () => void
}

export default function Service6FBCompliance({
  services,
  compliance,
  onImprove
}: Service6FBComplianceProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const complianceCategories = [
    {
      id: 'pricing',
      name: 'Premium Pricing Strategy',
      description: 'Optimize pricing to reflect value and expertise',
      score: calculatePricingScore(services),
      recommendations: [
        'Increase base service prices by 15-20%',
        'Add premium service tiers ($75+)',
        'Implement dynamic pricing for peak hours',
        'Create value-based pricing packages'
      ]
    },
    {
      id: 'packages',
      name: 'Service Packages & Bundles',
      description: 'Create compelling packages to increase average ticket',
      score: calculatePackageScore(services),
      recommendations: [
        'Bundle complementary services',
        'Create monthly membership packages',
        'Offer VIP service tiers',
        'Design seasonal promotions'
      ]
    },
    {
      id: 'upselling',
      name: 'Upsell & Cross-sell Opportunities',
      description: 'Maximize revenue per client visit',
      score: calculateUpsellScore(services),
      recommendations: [
        'Add premium add-on services',
        'Create service upgrade paths',
        'Implement product recommendations',
        'Train staff on upselling techniques'
      ]
    },
    {
      id: 'efficiency',
      name: 'Service Time Optimization',
      description: 'Maximize revenue per hour',
      score: calculateEfficiencyScore(services),
      recommendations: [
        'Reduce service time without quality loss',
        'Implement express service options',
        'Optimize booking intervals',
        'Add buffer time for premium services'
      ]
    },
    {
      id: 'clientExp',
      name: 'Client Experience Enhancement',
      description: 'Build loyalty and increase retention',
      score: calculateExperienceScore(services),
      recommendations: [
        'Add luxury service elements',
        'Implement VIP client perks',
        'Create memorable service rituals',
        'Enhance ambiance and comfort'
      ]
    }
  ]

  function calculatePricingScore(services: Service[]) {
    const avgPrice = services.reduce((sum, s) => sum + s.base_price, 0) / services.length
    if (avgPrice >= 75) return 100
    if (avgPrice >= 50) return 75
    if (avgPrice >= 35) return 50
    return 25
  }

  function calculatePackageScore(services: Service[]) {
    const packages = services.filter(s => s.is_package)
    const ratio = packages.length / services.length
    return Math.min(ratio * 200, 100)
  }

  function calculateUpsellScore(services: Service[]) {
    const premiumServices = services.filter(s => s.base_price >= 75)
    const ratio = premiumServices.length / services.length
    return Math.min(ratio * 150, 100)
  }

  function calculateEfficiencyScore(services: Service[]) {
    const avgDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0) / services.length
    if (avgDuration <= 30) return 100
    if (avgDuration <= 45) return 75
    if (avgDuration <= 60) return 50
    return 25
  }

  function calculateExperienceScore(services: Service[]) {
    // Mock calculation based on service descriptions and features
    const luxuryKeywords = ['premium', 'vip', 'luxury', 'exclusive', 'deluxe']
    const luxuryServices = services.filter(s => 
      luxuryKeywords.some(keyword => 
        s.name.toLowerCase().includes(keyword) || 
        (s.description?.toLowerCase() || '').includes(keyword)
      )
    )
    const ratio = luxuryServices.length / services.length
    return Math.min(ratio * 200, 100)
  }

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case 'elite':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: Award,
          description: 'You\'re implementing Six Figure Barber methodology at the highest level!'
        }
      case 'growth':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: TrendingUp,
          description: 'You\'re on the right track! Focus on the opportunities below to reach Elite status.'
        }
      default:
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          icon: Info,
          description: 'Start implementing Six Figure Barber principles to transform your business.'
        }
    }
  }

  const tierInfo = getTierInfo(compliance?.tier || 'foundation')
  const TierIcon = tierInfo.icon

  return (
    <div className="space-y-6">
      {/* Overall Compliance Score */}
      <Card className={`${tierInfo.bgColor} ${tierInfo.borderColor} border-2`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${tierInfo.bgColor} rounded-full flex items-center justify-center`}>
                <TierIcon className={`w-6 h-6 ${tierInfo.color}`} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Six Figure Barber Compliance Score</h3>
                <p className={`text-sm ${tierInfo.color} font-medium`}>
                  {compliance?.tier.toUpperCase()} TIER
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{compliance?.score || 0}%</p>
              <Progress value={compliance?.score || 0} className="w-32 mt-2" />
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">{tierInfo.description}</p>
        </CardContent>
      </Card>

      {/* Compliance Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {complianceCategories.map((category) => (
          <Card 
            key={category.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedCategory(
              selectedCategory === category.id ? null : category.id
            )}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">{category.name}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{category.score}%</span>
                  {category.score >= 75 ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : category.score >= 50 ? (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
              
              <Progress value={category.score} className="mb-3" />
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {category.description}
              </p>

              {selectedCategory === category.id && (
                <div className="mt-4 pt-4 border-t">
                  <h5 className="font-medium mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                    Recommendations
                  </h5>
                  <ul className="space-y-2">
                    {category.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top Opportunities */}
      {compliance?.opportunities && compliance.opportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              Top Growth Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {compliance.opportunities.map((opportunity, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-semibold text-purple-600">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{opportunity}</p>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-purple-600 p-0 h-auto mt-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Navigate to relevant section
                      }}
                    >
                      Learn how to implement →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          variant="primary"
          onClick={() => {
            // Navigate to service template recommendations
            window.location.href = '/services/templates?filter=six-fb'
          }}
          className="flex-1"
        >
          <Package className="w-4 h-4 mr-2" />
          Browse 6FB Templates
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            // Download compliance report
          }}
          className="flex-1"
        >
          Download Compliance Report
        </Button>
        <Button
          variant="outline"
          onClick={onImprove}
          className="flex-1"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Improve Score
        </Button>
      </div>
    </div>
  )
}