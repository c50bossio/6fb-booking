'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from './AuthProvider'
import { Permission, Role } from '@/lib/api/auth'
import {
  BarChart3,
  Users,
  GraduationCap,
  Menu,
  X,
  Building,
  Shield,
  Bell,
  LogOut
} from 'lucide-react'

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
    description: 'Main analytics dashboard'
  },
  {
    name: 'Clients',
    href: '/clients',
    icon: Users,
    description: 'Client management',
    permission: Permission.VIEW_OWN_CLIENTS
  },
  {
    name: 'Appointments',
    href: '/dashboard/appointments',
    icon: Building,
    description: 'Appointment scheduling',
    permission: Permission.VIEW_OWN_APPOINTMENTS
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    description: 'Performance analytics',
    permission: Permission.VIEW_OWN_ANALYTICS
  },
  {
    name: 'Payments',
    href: '/payments',
    icon: BarChart3,
    description: 'Payment management',
    permission: Permission.VIEW_OWN_PAYMENTS
  },
  {
    name: 'Training Hub',
    href: '/training',
    icon: GraduationCap,
    description: 'Training and certification'
  },
  {
    name: 'Admin Portal',
    href: '/admin',
    icon: Shield,
    description: 'System administration',
    roles: [Role.SUPER_ADMIN, Role.ADMIN]
  },
  {
    name: 'Mentor Dashboard',
    href: '/mentor',
    icon: GraduationCap,
    description: 'Mentorship oversight',
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MENTOR]
  },
  {
    name: 'Barbers',
    href: '/barbers',
    icon: Users,
    description: 'Barber management',
    permission: Permission.VIEW_USERS
  }
]

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { user, logout, hasRole, hasPermission, getRoleDisplayName } = useAuth()

  if (!user) return null

  const hasAccess = (item: typeof navigationItems[0]) => {
    // Check role-based access
    if (item.roles && !hasRole(item.roles)) {
      return false
    }

    // Check permission-based access
    if (item.permission && !hasPermission(item.permission)) {
      return false
    }

    return true
  }

  const filteredItems = navigationItems.filter(hasAccess)

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">6FB Platform</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {filteredItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>

            <div className="flex items-center space-x-2">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-gray-900">
                  {user.first_name} {user.last_name}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {getRoleDisplayName(user.role)}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
              >
                {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-b">
            {filteredItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <div>
                    <div>{item.name}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
}
