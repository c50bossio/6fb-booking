'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getProfile, fetchAPI, type User } from '@/lib/api'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { 
  UsersIcon,
  UserPlusIcon,
  EnvelopeIcon,
  PhoneIcon,
  TagIcon,
  ChartBarIcon,
  StarIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline'

// Lazy load customer sections
const ClientsSection = React.lazy(() => import('@/components/customers/sections/ClientsSection'))
const ContactsSection = React.lazy(() => import('@/components/customers/sections/ContactsSection'))
const SegmentsSection = React.lazy(() => import('@/components/customers/sections/SegmentsSection'))
const CampaignsSection = React.lazy(() => import('@/components/customers/sections/CampaignsSection'))
const LoyaltySection = React.lazy(() => import('@/components/customers/sections/LoyaltySection'))

interface CustomerTab {
  id: string
  label: string
  icon: React.ReactNode
  description: string
  roles: string[]
}

const customerTabs: CustomerTab[] = [
  { 
    id: 'overview', 
    label: 'Overview', 
    icon: <ChartBarIcon className="w-4 h-4" />,
    description: 'Customer insights and metrics',
    roles: ['all']
  },
  { 
    id: 'clients', 
    label: 'All Clients', 
    icon: <UsersIcon className="w-4 h-4" />,
    description: 'Complete client database',
    roles: ['all']
  },
  { 
    id: 'contacts', 
    label: 'Marketing Contacts', 
    icon: <EnvelopeIcon className="w-4 h-4" />,
    description: 'Email and SMS subscribers',
    roles: ['admin', 'super_admin', 'location_manager']
  },
  { 
    id: 'segments', 
    label: 'Segments', 
    icon: <TagIcon className="w-4 h-4" />,
    description: 'Customer groups and tags',
    roles: ['all']
  },
  { 
    id: 'campaigns', 
    label: 'Campaigns', 
    icon: <ChatBubbleLeftIcon className="w-4 h-4" />,
    description: 'Marketing campaigns',
    roles: ['admin', 'super_admin', 'location_manager']
  },
  { 
    id: 'loyalty', 
    label: 'Loyalty', 
    icon: <StarIcon className="w-4 h-4" />,
    description: 'Rewards and retention',
    roles: ['all']
  }
]

function UnifiedCustomersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview')
  const [customerSummary, setCustomerSummary] = useState({
    totalClients: 0,
    newThisMonth: 0,
    activeClients: 0,
    atRiskClients: 0,
    marketingContacts: 0,
    averageRetention: 0,
    totalSegments: 0,
    activeCampaigns: 0
  })

  // Update URL when tab changes
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.set('tab', activeTab)
    router.push(`/customers?${newParams.toString()}`, { scroll: false })
  }, [activeTab, router, searchParams])

  // Load user and customer data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        const userData = await getProfile()
        if (!userData) {
          router.push('/login')
          return
        }
        setUser(userData)

        // Load customer summary
        try {
          const [clientsResponse, contactsResponse] = await Promise.all([
            fetchAPI('/api/v1/clients/summary'),
            userData.role !== 'client' ? fetchAPI('/api/v1/marketing/contacts/summary') : null
          ])

          setCustomerSummary({
            totalClients: clientsResponse.total_clients || 0,
            newThisMonth: clientsResponse.new_clients || 0,
            activeClients: clientsResponse.active_clients || 0,
            atRiskClients: clientsResponse.at_risk_clients || 0,
            marketingContacts: contactsResponse?.total_contacts || 0,
            averageRetention: clientsResponse.retention_rate || 0,
            totalSegments: contactsResponse?.total_segments || 0,
            activeCampaigns: contactsResponse?.active_campaigns || 0
          })
        } catch (err) {
          console.error('Failed to load customer summary:', err)
        }
      } catch (err) {
        console.error('Failed to load customer data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  // Filter tabs based on user role
  const availableTabs = customerTabs.filter(tab => 
    tab.roles.includes('all') || tab.roles.includes(user?.role || '')
  )

  if (loading) {
    return <PageLoading message="Loading customer center..." />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => window.location.reload()} />
  }

  if (!user) {
    return null
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <CustomerOverview summary={customerSummary} userRole={user.role} />
      case 'clients':
        return (
          <Suspense fallback={<PageLoading message="Loading clients..." />}>
            <ClientsSection userRole={user.role} />
          </Suspense>
        )
      case 'contacts':
        return (
          <Suspense fallback={<PageLoading message="Loading contacts..." />}>
            <ContactsSection userRole={user.role} />
          </Suspense>
        )
      case 'segments':
        return (
          <Suspense fallback={<PageLoading message="Loading segments..." />}>
            <SegmentsSection userRole={user.role} />
          </Suspense>
        )
      case 'campaigns':
        return (
          <Suspense fallback={<PageLoading message="Loading campaigns..." />}>
            <CampaignsSection userRole={user.role} />
          </Suspense>
        )
      case 'loyalty':
        return (
          <Suspense fallback={<PageLoading message="Loading loyalty program..." />}>
            <LoyaltySection userRole={user.role} />
          </Suspense>
        )
      default:
        return <div>Invalid tab selected</div>
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push('/dashboard')}
                variant="ghost"
                size="sm"
              >
                ← Dashboard
              </Button>
              <div className="border-l border-gray-300 dark:border-gray-600 h-6" />
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <UsersIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Customer Management
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Unified client and marketing management
                  </p>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="secondary">
                <PhoneIcon className="w-4 h-4 mr-2" />
                Import Contacts
              </Button>
              <Button variant="primary">
                <UserPlusIcon className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </div>
          </div>
        </div>

        {/* Tabbed Customer Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue={activeTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-auto gap-2">
            {availableTabs.map(tab => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="flex items-center space-x-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-6">
            {renderTabContent()}
          </div>
        </Tabs>
      </div>
    </div>
  )
}

// Customer Overview Component
function CustomerOverview({ summary, userRole }: { summary: any; userRole?: string }) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="elevated">
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <UsersIcon className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-green-600">
                +{summary.newThisMonth} new
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary.totalClients.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total Clients
            </p>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <ChartBarIcon className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary.activeClients}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Active Clients
            </p>
          </CardContent>
        </Card>

        {userRole !== 'client' && (
          <>
            <Card variant="elevated">
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <EnvelopeIcon className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.marketingContacts.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Marketing Contacts
                </p>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <StarIcon className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.averageRetention}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Retention Rate
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Customer Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div>
                  <p className="font-medium">VIP Clients</p>
                  <p className="text-sm text-gray-600">High value, frequent visits</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">127</p>
                  <p className="text-sm text-green-600">23% of total</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div>
                  <p className="font-medium">Regular</p>
                  <p className="text-sm text-gray-600">Monthly visitors</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">312</p>
                  <p className="text-sm text-blue-600">58% of total</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div>
                  <p className="font-medium">At Risk</p>
                  <p className="text-sm text-gray-600">Haven't visited in 60+ days</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{summary.atRiskClients}</p>
                  <p className="text-sm text-yellow-600">Need attention</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {userRole !== 'client' && (
          <Card>
            <CardHeader>
              <CardTitle>Marketing Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Email Open Rate</span>
                  <span className="font-bold">73.4%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '73.4%' }} />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">SMS Response Rate</span>
                  <span className="font-bold">35.2%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '35.2%' }} />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Campaign Conversion</span>
                  <span className="font-bold">4.7%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '47%' }} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="justify-start">
              <UserPlusIcon className="w-4 h-4 mr-2" />
              Add New Client
            </Button>
            <Button variant="outline" className="justify-start">
              <EnvelopeIcon className="w-4 h-4 mr-2" />
              Send Campaign
            </Button>
            <Button variant="outline" className="justify-start">
              <TagIcon className="w-4 h-4 mr-2" />
              Create Segment
            </Button>
            <Button variant="outline" className="justify-start">
              <StarIcon className="w-4 h-4 mr-2" />
              Loyalty Rewards
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function UnifiedCustomersPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading customer center..." />}>
      <UnifiedCustomersContent />
    </Suspense>
  )
}