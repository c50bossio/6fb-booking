'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

const dashboardPreviews = [
  {
    id: 'client',
    title: 'Client Portal',
    description: 'Simple appointment management for customers who book haircuts',
    role: 'CLIENT',
    features: [
      'Upcoming appointments with reschedule options',
      'Recent appointment history',
      'Profile and payment management',
      'Quick booking actions',
      'Loyalty program status'
    ],
    dataScope: 'Personal appointments and profile only',
    complexity: 'Simple',
    href: '/dashboard-preview/client',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    badgeColor: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'barber',
    title: 'Individual Barber Dashboard',
    description: 'Business management for solo barber entrepreneurs',
    role: 'INDIVIDUAL_BARBER',
    features: [
      'Revenue analytics with 6FB methodology',
      'Client lifetime value tracking',
      'Business goal management',
      'Personal appointment scheduling',
      'Service and pricing management'
    ],
    dataScope: 'Complete business data for solo practice',
    complexity: 'Advanced',
    href: '/dashboard-preview/barber',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    badgeColor: 'bg-green-100 text-green-800'
  },
  {
    id: 'shop-owner',
    title: 'Shop Owner Dashboard',
    description: 'Single-location barbershop management and oversight',
    role: 'SHOP_OWNER',
    features: [
      'Shop-wide revenue and performance metrics',
      'Staff performance monitoring',
      'Real-time booking management',
      'Top services analysis',
      'Customer satisfaction tracking'
    ],
    dataScope: 'All data within their shop location',
    complexity: 'Complex',
    href: '/dashboard-preview/shop-owner',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    badgeColor: 'bg-purple-100 text-purple-800'
  },
  {
    id: 'enterprise',
    title: 'Enterprise Dashboard',
    description: 'Multi-location business analytics and strategic planning',
    role: 'ENTERPRISE_OWNER',
    features: [
      'Cross-location performance comparison',
      'Enterprise-wide analytics',
      'Expansion opportunity tracking',
      'Brand consistency scoring',
      'Location management interface'
    ],
    dataScope: 'All locations and enterprise-wide data',
    complexity: 'Executive',
    href: '/dashboard-preview/enterprise',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    badgeColor: 'bg-orange-100 text-orange-800'
  }
]

export default function DashboardPreviewIndex() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Dashboard Preview Center
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
            Preview all role-based dashboards with mock data
          </p>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-yellow-800 dark:text-yellow-200 text-sm font-medium">
              All dashboards use mock data for preview purposes
            </span>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {dashboardPreviews.map((dashboard) => (
            <Card key={dashboard.id} className={`${dashboard.bgColor} ${dashboard.borderColor} hover:shadow-lg transition-shadow`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {dashboard.title}
                    </CardTitle>
                    <Badge variant="secondary" className={dashboard.badgeColor}>
                      {dashboard.role}
                    </Badge>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {dashboard.complexity}
                  </Badge>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mt-3">
                  {dashboard.description}
                </p>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Key Features:</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                      {dashboard.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">•</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Data Scope:</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {dashboard.dataScope}
                    </p>
                  </div>
                  
                  <Button 
                    onClick={() => window.open(dashboard.href, '_blank')}
                    className="w-full mt-4"
                    variant="primary"
                  >
                    Preview {dashboard.title}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Information Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Role Hierarchy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Role Hierarchy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Badge className="bg-orange-100 text-orange-800">ENTERPRISE_OWNER</Badge>
                  <span className="text-gray-600 dark:text-gray-300">→ Multiple locations</span>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <Badge className="bg-purple-100 text-purple-800">SHOP_OWNER</Badge>
                  <span className="text-gray-600 dark:text-gray-300">→ Single location</span>
                </div>
                <div className="flex items-center gap-3 ml-8">
                  <Badge className="bg-gray-100 text-gray-800">BARBER (Staff)</Badge>
                  <span className="text-gray-600 dark:text-gray-300">→ Employee</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-green-100 text-green-800">INDIVIDUAL_BARBER</Badge>
                  <span className="text-gray-600 dark:text-gray-300">→ Solo business</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-100 text-blue-800">CLIENT</Badge>
                  <span className="text-gray-600 dark:text-gray-300">→ Customer</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Development Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Development Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <p>
                  <strong>Conflict-Free:</strong> These components don't modify existing dashboard or calendar files.
                </p>
                <p>
                  <strong>Integration Ready:</strong> Components can be integrated via DashboardRouter when other work is complete.
                </p>
                <p>
                  <strong>Mock Data:</strong> All dashboards use realistic mock data for preview purposes.
                </p>
                <p>
                  <strong>Role-Based:</strong> Each dashboard automatically adjusts based on user's unified_role.
                </p>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Footer Links */}
        <div className="text-center mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="space-x-6">
            <a 
              href="/" 
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              ← Back to Main App
            </a>
            <a 
              href="/dashboard" 
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Current Dashboard
            </a>
            <a 
              href="https://github.com/your-repo" 
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              Documentation
            </a>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-4">
            BookedBarber V2 • Role-Based Dashboard System
          </p>
        </div>

      </div>
    </div>
  )
}