'use client'

import { ShopOwnerDashboard } from '@/components/dashboards/ShopOwnerDashboard'

// Mock shop owner user for preview
const mockShopOwnerUser = {
  id: 3,
  email: 'sarah.owner@example.com',
  name: 'Sarah Davis',
  first_name: 'Sarah',
  unified_role: 'shop_owner' as const,
  organization_id: 1,
  primary_organization_id: 1
}

export default function ShopOwnerDashboardPreview() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Preview Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Shop Owner Dashboard Preview
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Role: SHOP_OWNER • Dashboard Type: shop-owner
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
      <ShopOwnerDashboard user={mockShopOwnerUser} />

      {/* Preview Footer */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              🏪 This is a preview of the SHOP OWNER dashboard with mock data. 
              Shop owners will see their single-location business management tools and staff oversight.
            </p>
            <div className="mt-2 space-x-4">
              <a href="/dashboard-preview/barber" className="text-blue-600 hover:text-blue-700">
                ← Individual Barber Preview
              </a>
              <a href="/dashboard-preview" className="text-blue-600 hover:text-blue-700">
                Preview Index
              </a>
              <a href="/dashboard-preview/enterprise" className="text-blue-600 hover:text-blue-700">
                Enterprise Preview →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}