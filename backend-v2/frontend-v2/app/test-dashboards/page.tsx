'use client'

import { ClientPortal } from '@/components/dashboards/ClientPortal'
import { IndividualBarberDashboard } from '@/components/dashboards/IndividualBarberDashboard'
import { ShopOwnerDashboard } from '@/components/dashboards/ShopOwnerDashboard'
import { EnterpriseDashboard } from '@/components/dashboards/EnterpriseDashboard'

// Mock users for testing
const mockUsers = {
  client: {
    id: 1,
    email: 'test.client@example.com',
    name: 'Test Client',
    first_name: 'Test',
    unified_role: 'client' as const,
  },
  barber: {
    id: 2,
    email: 'test.barber@example.com', 
    name: 'Test Barber',
    first_name: 'Test',
    unified_role: 'individual_barber' as const,
  },
  shopOwner: {
    id: 3,
    email: 'test.owner@example.com',
    name: 'Test Owner', 
    first_name: 'Test',
    unified_role: 'shop_owner' as const,
    organization_id: 1,
  },
  enterprise: {
    id: 4,
    email: 'test.enterprise@example.com',
    name: 'Test Enterprise',
    first_name: 'Test', 
    unified_role: 'enterprise_owner' as const,
    organization_id: 100,
  }
}

export default function TestDashboards() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Dashboard Component Test</h1>
        <p className="text-gray-600">Testing all dashboard components for browser compatibility</p>
      </div>
      
      <div className="p-6 space-y-8">
        {/* Client Portal Test */}
        <section>
          <h2 className="text-xl font-bold mb-4 bg-blue-100 p-2 rounded">CLIENT PORTAL TEST</h2>
          <div className="border rounded-lg overflow-hidden">
            <ClientPortal user={mockUsers.client} />
          </div>
        </section>

        {/* Individual Barber Test */}
        <section>
          <h2 className="text-xl font-bold mb-4 bg-green-100 p-2 rounded">INDIVIDUAL BARBER TEST</h2>
          <div className="border rounded-lg overflow-hidden">
            <IndividualBarberDashboard user={mockUsers.barber} />
          </div>
        </section>

        {/* Shop Owner Test */}
        <section>
          <h2 className="text-xl font-bold mb-4 bg-purple-100 p-2 rounded">SHOP OWNER TEST</h2>
          <div className="border rounded-lg overflow-hidden">
            <ShopOwnerDashboard user={mockUsers.shopOwner} />
          </div>
        </section>

        {/* Enterprise Test */}
        <section>
          <h2 className="text-xl font-bold mb-4 bg-orange-100 p-2 rounded">ENTERPRISE TEST</h2>
          <div className="border rounded-lg overflow-hidden">
            <EnterpriseDashboard user={mockUsers.enterprise} />
          </div>
        </section>
      </div>
    </div>
  )
}