'use client'

import { EnterpriseDashboard } from '@/components/dashboards/EnterpriseDashboard'

// Mock enterprise owner user for preview
const mockEnterpriseUser = {
  id: 4,
  email: 'maria.enterprise@example.com',
  name: 'Maria Rodriguez',
  first_name: 'Maria',
  unified_role: 'enterprise_owner' as const,
  organization_id: 100,
  primary_organization_id: 100
}

export default function EnterpriseDashboardPreview() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Preview Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Enterprise Dashboard Preview
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Role: ENTERPRISE_OWNER • Dashboard Type: enterprise
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Preview Mode
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Mock Data
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Preview */}
      <EnterpriseDashboard user={mockEnterpriseUser} />

      {/* Preview Footer */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              🏢 This is a preview of the ENTERPRISE dashboard with mock data. 
              Enterprise owners will see multi-location analytics, cross-location metrics, and expansion opportunities.
            </p>
            <div className="mt-2 space-x-4">
              <a href="/dashboard-preview/shop-owner" className="text-blue-600 hover:text-blue-700">
                ← Shop Owner Preview
              </a>
              <a href="/dashboard-preview" className="text-blue-600 hover:text-blue-700">
                Preview Index
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}