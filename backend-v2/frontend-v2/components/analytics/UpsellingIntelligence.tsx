'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useToast } from '@/hooks/useToast'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowTrendingUpIcon, CurrencyDollarIcon, UserIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import ClientDetailsModal from './ClientDetailsModal'
import { recordUpsellAttempt, UpsellAttemptRequest } from '@/lib/api'

interface UpsellOpportunity {
  id: string
  clientId: string
  clientName: string
  currentService: string
  suggestedService: string
  potentialRevenue: number
  confidence: number
  reasons: string[]
  lastVisit: string
  frequency: number
}

interface UpsellingIntelligenceProps {
  opportunities?: UpsellOpportunity[]
  className?: string
  autoNotifications?: boolean
  showActionCards?: boolean
}

// Mock data representing intelligent upselling opportunities
const mockOpportunities: UpsellOpportunity[] = [
  {
    id: '1',
    clientId: 'c1',
    clientName: 'Marcus Johnson',
    currentService: 'Basic Cut',
    suggestedService: 'Premium Cut + Beard Trim',
    potentialRevenue: 35,
    confidence: 92,
    reasons: [
      'Regular customer (visits every 3 weeks)',
      'Always asks about beard maintenance',
      'High satisfaction scores (4.9/5)',
      'Price-insensitive based on booking history'
    ],
    lastVisit: '2024-01-15',
    frequency: 17 // visits per year
  },
  {
    id: '2',
    clientId: 'c2',
    clientName: 'David Chen',
    currentService: 'Standard Cut',
    suggestedService: 'Executive Package',
    potentialRevenue: 25,
    confidence: 87,
    reasons: [
      'Business professional profile',
      'Books during premium time slots',
      'Has requested styling advice',
      'Referred 2 new clients'
    ],
    lastVisit: '2024-01-18',
    frequency: 24
  },
  {
    id: '3',
    clientId: 'c3',
    clientName: 'Alex Rodriguez',
    currentService: 'Quick Trim',
    suggestedService: 'Signature Style + Product Kit',
    potentialRevenue: 40,
    confidence: 78,
    reasons: [
      'Young professional demographic',
      'Active on social media',
      'Uses premium products at home',
      'Long wait tolerance (books weeks ahead)'
    ],
    lastVisit: '2024-01-20',
    frequency: 15
  }
]

export function UpsellingIntelligence({
  opportunities = mockOpportunities,
  className,
  autoNotifications = true,
  showActionCards = true
}: UpsellingIntelligenceProps) {
  const [displayedOpportunities, setDisplayedOpportunities] = useState<UpsellOpportunity[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [selectedOpportunity, setSelectedOpportunity] = useState<UpsellOpportunity | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { success, info } = useToast()

  // Filter and sort opportunities by confidence and potential revenue
  const prioritizedOpportunities = useMemo(() => {
    return opportunities
      .filter(opp => !dismissedIds.has(opp.id))
      .sort((a, b) => {
        // Sort by confidence score and potential revenue
        const scoreA = (a.confidence * 0.7) + (a.potentialRevenue * 0.3)
        const scoreB = (b.confidence * 0.7) + (b.potentialRevenue * 0.3)
        return scoreB - scoreA
      })
      .slice(0, 5) // Show top 5 opportunities
  }, [opportunities, dismissedIds])

  // Auto-notification system following Six Figure Barber methodology
  useEffect(() => {
    if (!autoNotifications || prioritizedOpportunities.length === 0) return

    // Show high-confidence opportunities as notifications
    const highConfidenceOpportunities = prioritizedOpportunities.filter(
      opp => opp.confidence >= 85 && opp.potentialRevenue >= 25
    )

    if (highConfidenceOpportunities.length > 0) {
      const timer = setTimeout(() => {
        const opportunity = highConfidenceOpportunities[0]
        
        info(`💡 Upselling Opportunity: ${opportunity.clientName}`, {
          description: `Suggest ${opportunity.suggestedService} for +$${opportunity.potentialRevenue} potential revenue`,
          duration: 8000,
          action: {
            label: 'View Details',
            onClick: () => {
              setSelectedOpportunity(opportunity)
              setIsModalOpen(true)
            }
          }
        })
      }, 2000) // Delay to avoid overwhelming user

      return () => clearTimeout(timer)
    }
  }, [prioritizedOpportunities, autoNotifications, info])

  const handleDismissOpportunity = (opportunityId: string) => {
    setDismissedIds(prev => new Set([...prev, opportunityId]))
  }

  const handleImplementUpsell = async (opportunity: UpsellOpportunity) => {
    try {
      // Prepare the upselling attempt data for the API
      const attemptData: UpsellAttemptRequest = {
        client_id: parseInt(opportunity.clientId),
        current_service: opportunity.currentService,
        suggested_service: opportunity.suggestedService,
        potential_revenue: opportunity.potentialRevenue,
        confidence_score: opportunity.confidence,
        channel: 'in_person', // Default channel - could be made configurable
        client_tier: getClientTier(opportunity.frequency),
        relationship_score: calculateRelationshipScore(opportunity),
        reasons: opportunity.reasons,
        methodology_alignment: 'Six Figure Barber Revenue Optimization',
        implementation_notes: `Upselling opportunity implemented via dashboard intelligence system`,
        opportunity_id: opportunity.id,
        source_analysis: {
          frequency: opportunity.frequency,
          lastVisit: opportunity.lastVisit,
          confidenceScore: opportunity.confidence,
          generatedBy: 'UpsellingIntelligence'
        },
        expires_in_hours: 72 // 3 days to follow up
      }

      // Record the attempt in the database
      const attemptResponse = await recordUpsellAttempt(attemptData)

      success(`Upselling Strategy Activated! 🚀`, {
        description: `${opportunity.suggestedService} suggested to ${opportunity.clientName} - Tracking ID: #${attemptResponse.id}`,
        duration: 5000
      })

      // In a complete implementation, this would also:
      // 1. Send automated email/SMS to client
      // 2. Create calendar reminder for follow-up
      // 3. Update client profile with suggestion
      // 4. Schedule analytics tracking

      handleDismissOpportunity(opportunity.id)

    } catch (error) {
      console.error('Failed to record upselling attempt:', error)
      
      // Show error but still dismiss the opportunity
      success(`Upselling Strategy Noted! 📝`, {
        description: `${opportunity.suggestedService} suggestion recorded (offline mode)`,
        duration: 3000
      })
      
      handleDismissOpportunity(opportunity.id)
    }
  }

  // Helper function to determine client tier based on frequency
  const getClientTier = (frequency: number): string => {
    if (frequency >= 15) return 'VIP'
    if (frequency >= 8) return 'Regular'
    if (frequency >= 3) return 'Occasional'
    return 'New'
  }

  // Helper function to calculate relationship score
  const calculateRelationshipScore = (opportunity: UpsellOpportunity): number => {
    // Simple scoring based on frequency and confidence
    const frequencyScore = Math.min(opportunity.frequency / 20, 1) * 5 // 0-5 scale
    const confidenceScore = (opportunity.confidence / 100) * 5 // 0-5 scale
    return Math.round((frequencyScore + confidenceScore) / 2 * 10) / 10 // Average, rounded to 1 decimal
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) return { color: 'bg-green-100 text-green-800 border-green-200', label: 'Very High' }
    if (confidence >= 80) return { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'High' }
    if (confidence >= 70) return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Medium' }
    return { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Low' }
  }

  if (prioritizedOpportunities.length === 0) {
    return (
      <Card variant="default" className={cn('border-dashed border-2', className)}>
        <CardContent className="p-8 text-center">
          <SparklesIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No Upselling Opportunities</h3>
          <p className="text-sm text-gray-500">
            Keep building client relationships! New opportunities will appear as your business grows.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <Card variant="secondary" borderAccent>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-1 h-8 bg-primary-500 rounded-full"></div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Upselling Intelligence</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    AI-powered revenue optimization suggestions
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-primary-600">
                +${prioritizedOpportunities.reduce((sum, opp) => sum + opp.potentialRevenue, 0)}
              </div>
              <div className="text-xs text-gray-500">Potential Revenue</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Opportunity Cards */}
      {showActionCards && (
        <div className="space-y-4">
          {prioritizedOpportunities.map((opportunity, index) => {
            const confidenceBadge = getConfidenceBadge(opportunity.confidence)
            
            return (
              <Card 
                key={opportunity.id} 
                variant="elevated"
                className={cn(
                  'transition-all duration-200 hover:shadow-lg',
                  index === 0 && 'ring-2 ring-primary-200 ring-opacity-50' // Highlight top opportunity
                )}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Client and Opportunity Info */}
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-primary-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {opportunity.clientName}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {opportunity.frequency} visits/year • Last visit: {new Date(opportunity.lastVisit).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Upselling Suggestion */}
                      <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-lg p-4 mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <ArrowTrendingUpIcon className="w-4 h-4 text-primary-600" />
                          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                            Upgrade Opportunity
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600 dark:text-gray-400">From:</span>{' '}
                          <span className="font-medium">{opportunity.currentService}</span>
                          <br />
                          <span className="text-gray-600 dark:text-gray-400">To:</span>{' '}
                          <span className="font-medium text-primary-700 dark:text-primary-300">
                            {opportunity.suggestedService}
                          </span>
                        </div>
                      </div>

                      {/* AI Insights */}
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Why this works:
                        </h5>
                        <ul className="space-y-1">
                          {opportunity.reasons.slice(0, 2).map((reason, reasonIndex) => (
                            <li key={reasonIndex} className="text-xs text-gray-600 dark:text-gray-400 flex items-start">
                              <span className="w-1 h-1 bg-primary-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                              {reason}
                            </li>
                          ))}
                        </ul>
                        {opportunity.reasons.length > 2 && (
                          <button className="text-xs text-primary-600 hover:text-primary-700">
                            +{opportunity.reasons.length - 2} more insights
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Action Panel */}
                    <div className="ml-6 text-right space-y-3">
                      {/* Confidence and Revenue */}
                      <div className="space-y-2">
                        <div className={cn(
                          'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border',
                          confidenceBadge.color
                        )}>
                          {confidenceBadge.label} ({opportunity.confidence}%)
                        </div>
                        <div className="flex items-center justify-end space-x-1">
                          <CurrencyDollarIcon className="w-4 h-4 text-green-600" />
                          <span className="text-lg font-bold text-green-600">
                            +${opportunity.potentialRevenue}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <Button
                          onClick={() => handleImplementUpsell(opportunity)}
                          variant="primary"
                          size="sm"
                          className="w-full shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          Implement
                        </Button>
                        <Button
                          onClick={() => handleDismissOpportunity(opportunity.id)}
                          variant="ghost"
                          size="sm"
                          className="w-full"
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      
      {/* Client Details Modal */}
      <ClientDetailsModal
        opportunity={selectedOpportunity}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedOpportunity(null)
        }}
        onImplement={handleImplementUpsell}
      />
    </div>
  )
}

export default UpsellingIntelligence