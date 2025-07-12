'use client'

import { Card } from "@/components/ui/Card"
import { Button } from '@/components/ui/Button'
import { 
  DocumentArrowUpIcon, 
  DocumentArrowDownIcon, 
  CloudIcon,
  TagIcon,
  CubeIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function BusinessToolsPage() {
  const tools = [
    {
      title: 'Data Import',
      description: 'Import client information, services, and historical data from CSV files or other systems.',
      icon: DocumentArrowUpIcon,
      href: '/import',
      color: 'blue'
    },
    {
      title: 'Data Export',
      description: 'Export your business data for backup, analysis, or migration to other systems.',
      icon: DocumentArrowDownIcon,
      href: '/export',
      color: 'green'
    },
    {
      title: 'Webhooks',
      description: 'Configure real-time API webhooks to integrate with external services and automation tools.',
      icon: CloudIcon,
      href: '/admin/webhooks',
      color: 'purple'
    },
    {
      title: 'Product Catalog',
      description: 'Manage your retail products, inventory, and pricing for in-shop sales.',
      icon: TagIcon,
      href: '/products',
      color: 'orange'
    }
  ]

  const colorClasses = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    purple: 'text-purple-500',
    orange: 'text-orange-500'
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <CubeIcon className="h-8 w-8 text-gray-700 mr-3" />
          <h1 className="text-3xl font-bold">Business Tools</h1>
        </div>
        <p className="text-gray-600">Advanced tools to manage and optimize your business operations</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <Card key={tool.href} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start mb-4">
                <Icon className={`h-8 w-8 ${colorClasses[tool.color as keyof typeof colorClasses]} mr-3 flex-shrink-0`} />
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2">{tool.title}</h2>
                  <p className="text-gray-600 mb-4">{tool.description}</p>
                </div>
              </div>
              <Link href={tool.href}>
                <Button className="w-full">
                  Open {tool.title}
                </Button>
              </Link>
            </Card>
          )
        })}
      </div>

      <Card className="mt-8 p-6 bg-gray-50">
        <h3 className="text-lg font-semibold mb-2">Need More Tools?</h3>
        <p className="text-gray-600 mb-4">
          We're constantly adding new features to help you grow your business. If you need a specific tool or integration, let us know!
        </p>
        <Link href="/support">
          <Button variant="outline">Request a Feature</Button>
        </Link>
      </Card>
    </div>
  )
}