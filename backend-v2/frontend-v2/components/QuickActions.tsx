'use client'

import React from 'react'
import { AccessibleButton } from '@/lib/accessibility-helpers'
import Link from 'next/link'
import { 
  PlusIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ChartBarIcon,
  CogIcon
} from '@heroicons/react/24/outline'

export function QuickActions() {
  const quickActions = [
    {
      title: 'New Appointment',
      description: 'Book a new appointment',
      icon: PlusIcon,
      href: '/book',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'View Calendar',
      description: 'See your schedule',
      icon: CalendarDaysIcon,
      href: '/calendar',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: 'Clients',
      description: 'Manage clients',
      icon: UserGroupIcon,
      href: '/clients',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      title: 'Analytics',
      description: 'View business metrics',
      icon: ChartBarIcon,
      href: '/analytics',
      color: 'bg-yellow-500 hover:bg-yellow-600'
    },
    {
      title: 'Settings',
      description: 'Configure your business',
      icon: CogIcon,
      href: '/settings',
      color: 'bg-gray-500 hover:bg-gray-600'
    }
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {quickActions.map((action, index) => (
          <Link key={index} href={action.href}>
            <div className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer">
              <div className={`w-12 h-12 rounded-full ${action.color} flex items-center justify-center mb-3`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-sm font-medium text-gray-900 text-center mb-1">
                {action.title}
              </h4>
              <p className="text-xs text-gray-500 text-center">
                {action.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}