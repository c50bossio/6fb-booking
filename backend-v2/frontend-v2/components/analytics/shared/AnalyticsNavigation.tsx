import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  ChartBarIcon,
  CurrencyDollarIcon,
  UsersIcon,
  TrophyIcon,
  EnvelopeOpenIcon,
  StarIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'

export interface AnalyticsSection {
  id: string
  label: string
  href: string
  icon: React.ReactNode
  description?: string
  roleRequired?: string[]
}

const defaultSections: AnalyticsSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    href: '/analytics',
    icon: <ChartBarIcon className="w-5 h-5" />,
    description: 'Comprehensive business metrics'
  },
  {
    id: 'enhanced',
    label: 'Enhanced Analytics',
    href: '/analytics/enhanced',
    icon: <TrophyIcon className="w-5 h-5" />,
    description: 'Advanced analytics with AI insights and performance metrics'
  },
  {
    id: 'sixfigure',
    label: 'Six Figure Analytics',
    href: '/analytics/sixfigure',
    icon: <StarIcon className="w-5 h-5" />,
    description: 'Track progress toward six-figure income with 6FB methodology'
  },
  {
    id: 'revenue',
    label: 'Revenue',
    href: '/analytics/revenue',
    icon: <CurrencyDollarIcon className="w-5 h-5" />,
    description: 'Financial performance and trends'
  },
  {
    id: 'clients',
    label: 'Clients',
    href: '/analytics/clients',
    icon: <UsersIcon className="w-5 h-5" />,
    description: 'Customer insights and behavior'
  },
  {
    id: 'performance',
    label: 'Performance',
    href: '/analytics/performance',
    icon: <CalendarDaysIcon className="w-5 h-5" />,
    description: 'Operational efficiency metrics'
  },
  {
    id: 'marketing',
    label: 'Marketing',
    href: '/analytics/marketing',
    icon: <EnvelopeOpenIcon className="w-5 h-5" />,
    description: 'Campaign performance and ROI',
    roleRequired: ['admin', 'super_admin']
  },
  {
    id: 'reviews',
    label: 'Reviews',
    href: '/analytics/reviews',
    icon: <StarIcon className="w-5 h-5" />,
    description: 'Customer satisfaction analysis',
    roleRequired: ['admin', 'super_admin']
  },
  {
    id: 'locations',
    label: 'Locations',
    href: '/analytics/locations',
    icon: <BuildingStorefrontIcon className="w-5 h-5" />,
    description: 'Multi-location comparison',
    roleRequired: ['super_admin', 'enterprise_owner']
  }
]

interface AnalyticsNavigationProps {
  userRole?: string
  variant?: 'tabs' | 'cards' | 'sidebar'
  sections?: AnalyticsSection[]
}

export function AnalyticsNavigation({ 
  userRole, 
  variant = 'tabs',
  sections = defaultSections 
}: AnalyticsNavigationProps) {
  const pathname = usePathname()
  
  // Filter sections based on user role
  const availableSections = sections.filter(section => {
    if (!section.roleRequired) return true
    return section.roleRequired.includes(userRole || '')
  })

  if (variant === 'tabs') {
    return (
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Analytics sections">
          {availableSections.map((section) => {
            const isActive = pathname === section.href
            return (
              <Link
                key={section.id}
                href={section.href}
                className={`
                  flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm
                  transition-colors duration-200
                  ${isActive
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                {section.icon}
                {section.label}
              </Link>
            )
          })}
        </nav>
      </div>
    )
  }

  if (variant === 'cards') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableSections.map((section) => {
          const isActive = pathname === section.href
          return (
            <Link
              key={section.id}
              href={section.href}
              className={`
                block p-6 rounded-lg border-2 transition-all duration-200
                ${isActive
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md'
                }
              `}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${
                  isActive 
                    ? 'bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  {section.icon}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {section.label}
                  </h3>
                  {section.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {section.description}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    )
  }

  // Sidebar variant
  return (
    <nav className="space-y-1">
      {availableSections.map((section) => {
        const isActive = pathname === section.href
        return (
          <Link
            key={section.id}
            href={section.href}
            className={`
              flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200
              ${isActive
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }
            `}
          >
            {section.icon}
            <div className="flex-1">
              <div className="font-medium">{section.label}</div>
              {section.description && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {section.description}
                </div>
              )}
            </div>
          </Link>
        )
      })}
    </nav>
  )
}