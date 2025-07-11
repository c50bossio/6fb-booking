'use client'

import { useState } from 'react'
import { 
  Zap, 
  Plus, 
  Upload, 
  Download, 
  Settings, 
  Calendar,
  DollarSign,
  Package,
  TrendingUp,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { type Service } from '@/lib/api'

interface ServiceQuickActionsProps {
  services: Service[]
  onActionComplete: () => void
}

export default function ServiceQuickActions({
  services,
  onActionComplete
}: ServiceQuickActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const quickActions = [
    {
      id: 'add-service',
      label: 'Add New Service',
      icon: Plus,
      color: 'bg-blue-500',
      action: () => router.push('/services/new')
    },
    {
      id: 'import-templates',
      label: 'Import Templates',
      icon: Upload,
      color: 'bg-purple-500',
      action: () => router.push('/services/templates')
    },
    {
      id: 'bulk-pricing',
      label: 'Adjust Pricing',
      icon: DollarSign,
      color: 'bg-green-500',
      action: () => router.push('/services/bulk-pricing')
    },
    {
      id: 'create-package',
      label: 'Create Package',
      icon: Package,
      color: 'bg-orange-500',
      action: () => router.push('/services/new?type=package')
    },
    {
      id: 'optimize-schedule',
      label: 'Optimize Schedule',
      icon: Calendar,
      color: 'bg-indigo-500',
      action: async () => {
        setLoading('optimize-schedule')
        // Implement schedule optimization
        await new Promise(resolve => setTimeout(resolve, 1000))
        setLoading(null)
        onActionComplete()
      }
    },
    {
      id: 'analyze-performance',
      label: 'Performance Report',
      icon: TrendingUp,
      color: 'bg-pink-500',
      action: () => router.push('/services/analytics')
    },
    {
      id: 'export-data',
      label: 'Export Services',
      icon: Download,
      color: 'bg-gray-500',
      action: async () => {
        setLoading('export-data')
        // Implement export functionality
        await new Promise(resolve => setTimeout(resolve, 1000))
        setLoading(null)
      }
    },
    {
      id: 'sync-services',
      label: 'Sync Services',
      icon: RefreshCw,
      color: 'bg-teal-500',
      action: async () => {
        setLoading('sync-services')
        await onActionComplete()
        setLoading(null)
      }
    }
  ]

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Quick Actions</h3>
          <Zap className="w-5 h-5 text-yellow-500" />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            const isLoading = loading === action.id
            
            return (
              <Button
                key={action.id}
                variant="outline"
                onClick={action.action}
                disabled={isLoading}
                className="flex flex-col items-center gap-2 h-auto py-4 hover:shadow-md transition-all"
              >
                <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-center">
                  {isLoading ? 'Processing...' : action.label}
                </span>
              </Button>
            )
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-6 pt-6 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{services.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Services</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{services.filter(s => s.is_active).length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{services.filter(s => s.is_package).length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Packages</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              ${(services.reduce((sum, s) => sum + s.base_price, 0) / services.length).toFixed(0)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Avg Price</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}