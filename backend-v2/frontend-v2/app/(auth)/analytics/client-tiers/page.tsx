'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import ClientTierDashboard from '@/components/analytics/ClientTierDashboard'
import { ClientTierBadge, ClientTierDisplay } from '@/components/ui/ClientTierBadge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ChartBarIcon, 
  UserIcon,
  ArrowLeftIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

export default function ClientTiersPage() {
  const router = useRouter()

  const handleClientSelect = (clientId: number) => {
    // Navigate to client details page
    router.push(`/clients/${clientId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="mb-4"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Analytics
              </Button>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Client Tier Analytics
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                Six Figure Barber client segmentation and revenue optimization insights
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Powered by
              </div>
              <div className="font-bold text-lg text-amber-600">
                Six Figure Barber Methodology
              </div>
            </div>
          </div>
        </div>

        {/* Tier System Overview */}
        <Card className="mb-8 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <InformationCircleIcon className="w-5 h-5 text-amber-600" />
              Understanding Client Tiers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="text-center">
                <ClientTierBadge tier="platinum" size="lg" variant="full" />
                <div className="mt-3">
                  <div className="font-semibold text-sm">VIP Experience</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    $2000+ lifetime value<br/>
                    20+ visits, $75+ avg ticket
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <ClientTierBadge tier="gold" size="lg" variant="full" />
                <div className="mt-3">
                  <div className="font-semibold text-sm">Premium Service</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    $800+ lifetime value<br/>
                    10+ visits, $55+ avg ticket
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <ClientTierBadge tier="silver" size="lg" variant="full" />
                <div className="mt-3">
                  <div className="font-semibold text-sm">Regular Client</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    $300+ lifetime value<br/>
                    5+ visits, $40+ avg ticket
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <ClientTierBadge tier="bronze" size="lg" variant="full" />
                <div className="mt-3">
                  <div className="font-semibold text-sm">Developing Client</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    $100+ lifetime value<br/>
                    2+ visits, $25+ avg ticket
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <ClientTierBadge tier="new" size="lg" variant="full" />
                <div className="mt-3">
                  <div className="font-semibold text-sm">Welcome Program</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    First-time clients<br/>
                    Onboarding focus
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg">
              <h4 className="font-semibold mb-2">How Client Tiers Drive Revenue Growth</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium text-amber-600 mb-1">Personalized Experience</div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Tailored service recommendations, pricing strategies, and communication styles based on client tier
                  </div>
                </div>
                <div>
                  <div className="font-medium text-blue-600 mb-1">Revenue Optimization</div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Identify growth opportunities, tier advancement paths, and revenue potential for each client
                  </div>
                </div>
                <div>
                  <div className="font-medium text-green-600 mb-1">Strategic Focus</div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Prioritize high-value clients while nurturing new clients toward higher tiers
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Dashboard */}
        <ClientTierDashboard onClientSelect={handleClientSelect} showActions={true} />

        {/* Additional Insights */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5 text-blue-600" />
                Tier Advancement Strategies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4">
                  <div className="font-semibold text-green-700 dark:text-green-300">New → Bronze</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Focus on service quality and follow-up communication to encourage repeat visits
                  </div>
                </div>
                <div className="border-l-4 border-orange-500 pl-4">
                  <div className="font-semibold text-orange-700 dark:text-orange-300">Bronze → Silver</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Introduce premium services and packages to increase average ticket value
                  </div>
                </div>
                <div className="border-l-4 border-gray-500 pl-4">
                  <div className="font-semibold text-gray-700 dark:text-gray-300">Silver → Gold</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Implement loyalty programs and exclusive service offerings
                  </div>
                </div>
                <div className="border-l-4 border-yellow-500 pl-4">
                  <div className="font-semibold text-yellow-700 dark:text-yellow-300">Gold → Platinum</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Provide VIP experiences, concierge services, and premium pricing access
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-purple-600" />
                Revenue Optimization Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-purple-700 dark:text-purple-300">1</span>
                  </div>
                  <div>
                    <div className="font-semibold">Focus on High-Value Clients</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Platinum and gold clients generate 80% of your revenue. Ensure exceptional service delivery.
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-purple-700 dark:text-purple-300">2</span>
                  </div>
                  <div>
                    <div className="font-semibold">Convert New Clients</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Implement a structured onboarding process to move new clients to bronze tier quickly.
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-purple-700 dark:text-purple-300">3</span>
                  </div>
                  <div>
                    <div className="font-semibold">Address Growth Opportunities</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Review top revenue opportunities monthly and create targeted campaigns.
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-purple-700 dark:text-purple-300">4</span>
                  </div>
                  <div>
                    <div className="font-semibold">Monitor Tier Confidence</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Higher confidence scores indicate more reliable tier classifications and better data quality.
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}