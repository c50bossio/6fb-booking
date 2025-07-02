import { 
  HomeIcon,
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon,
  CogIcon,
  BanknotesIcon,
  BellIcon,
  ClockIcon,
  BuildingStorefrontIcon,
  UserIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PresentationChartLineIcon,
  CreditCardIcon,
  GiftIcon,
  PhoneIcon,
  CloudIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  ScissorsIcon,
  TagIcon,
  ClipboardDocumentListIcon,
  ArrowPathIcon,
  CubeIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  ChartPieIcon,
  CurrencyDollarIcon,
  // Solid versions for mobile
  HomeIcon as HomeIconSolid,
  CalendarIcon as CalendarIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  UserIcon as UserIconSolid,
  BanknotesIcon as BanknotesIconSolid,
  ClockIcon as ClockIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  BuildingStorefrontIcon as BuildingStorefrontIconSolid
} from '@heroicons/react/24/outline'
import type { ComponentType } from 'react'

// Types
export type UserRole = 'user' | 'barber' | 'admin' | 'super_admin'

export interface NavigationItem {
  name: string
  href: string
  icon: ComponentType<{ className?: string }>
  roles?: UserRole[]
  badge?: string | number
  description?: string
  children?: NavigationItem[]
  isNew?: boolean
  isExternal?: boolean
}

export interface MobileTabItem extends Omit<NavigationItem, 'children'> {
  iconSolid: ComponentType<{ className?: string }>
}

export interface QuickAction {
  name: string
  href: string
  icon: ComponentType<{ className?: string }>
  description: string
  roles?: UserRole[]
  color?: string
}

export interface BreadcrumbItem {
  label: string
  href: string
  isLast?: boolean
}

// Simplified navigation filter - always shows basic navigation
export function filterNavigationByRole(
  items: NavigationItem[],
  userRole?: string | null
): NavigationItem[] {
  // Always show basic navigation items - no complex filtering
  const basicItems = [
    items.find(item => item.name === 'Dashboard'),
    items.find(item => item.name === 'Calendar & Scheduling'),
    items.find(item => item.name === 'Settings')
  ].filter(Boolean) as NavigationItem[]
  
  // If we have a user role, show role-specific items too
  if (userRole) {
    const roleItems = items.filter(item => {
      if (!item.roles || item.roles.length === 0) return false
      return item.roles.includes(userRole as UserRole)
    })
    return [...basicItems, ...roleItems]
  }
  
  return basicItems
}

// Main navigation items (for sidebar)
export const navigationItems: NavigationItem[] = [
  // Primary focal point - Business snapshot
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    description: 'Business overview and quick stats'
  },
  
  // Secondary focal point - Calendar & Scheduling section
  {
    name: 'Calendar & Scheduling',
    href: '/calendar',
    icon: CalendarIcon,
    description: 'Manage appointments and schedule',
    children: [
      {
        name: 'Calendar View',
        href: '/calendar',
        icon: CalendarIcon,
        description: 'Main booking calendar'
      },
      {
        name: 'My Bookings',
        href: '/bookings',
        icon: ClockIcon,
        description: 'View and manage your appointments'
      },
      {
        name: 'Availability',
        href: '/barber-availability',
        icon: ClockIcon,
        roles: ['barber', 'admin', 'super_admin'],
        description: 'Manage working hours'
      },
      {
        name: 'Recurring',
        href: '/recurring',
        icon: ArrowPathIcon,
        roles: ['admin', 'barber', 'super_admin'],
        description: 'Manage recurring appointments'
      }
    ]
  },
  
  // Business Management
  {
    name: 'Clients',
    href: '/clients',
    icon: UserGroupIcon,
    roles: ['barber', 'admin', 'super_admin'],
    description: 'Manage client information'
  },
  
  // Communication
  {
    name: 'Communication',
    href: '/notifications',
    icon: PhoneIcon,
    roles: ['admin', 'barber', 'super_admin'],
    description: 'Send notifications and messages'
  },
  
  // Marketing Suite
  {
    name: 'Marketing Suite',
    href: '/marketing',
    icon: EnvelopeIcon,
    roles: ['admin', 'super_admin'],
    description: 'Email and SMS marketing campaigns',
    isNew: true,
    children: [
      {
        name: 'Campaigns',
        href: '/marketing/campaigns',
        icon: ChatBubbleLeftRightIcon,
        roles: ['admin', 'super_admin'],
        description: 'Create and manage campaigns'
      },
      {
        name: 'Templates',
        href: '/marketing/templates',
        icon: DocumentArrowDownIcon,
        roles: ['admin', 'super_admin'],
        description: 'Email and SMS templates'
      },
      {
        name: 'Contacts',
        href: '/marketing/contacts',
        icon: UserCircleIcon,
        roles: ['admin', 'super_admin'],
        description: 'Manage contact lists'
      },
      {
        name: 'Analytics',
        href: '/marketing/analytics',
        icon: ChartPieIcon,
        roles: ['admin', 'super_admin'],
        description: 'Campaign performance'
      },
      {
        name: 'Usage & Billing',
        href: '/marketing/billing',
        icon: CurrencyDollarIcon,
        roles: ['admin', 'super_admin'],
        description: 'Credits and usage tracking'
      }
    ]
  },
  
  // Payments & Earnings section
  {
    name: 'Payments & Earnings',
    href: '/payments',
    icon: CreditCardIcon,
    roles: ['admin', 'barber', 'super_admin'],
    description: 'Payment and earnings management',
    children: [
      {
        name: 'Payment Overview',
        href: '/payments',
        icon: CreditCardIcon,
        roles: ['admin', 'barber', 'super_admin']
      },
      {
        name: 'Earnings',
        href: '/barber/earnings',
        icon: BanknotesIcon,
        roles: ['barber'],
        description: 'Track your income and payouts'
      },
      {
        name: 'Gift Certificates',
        href: '/payments/gift-certificates',
        icon: GiftIcon,
        roles: ['admin', 'super_admin']
      }
    ]
  },
  
  // Analytics & Insights
  {
    name: 'Analytics',
    href: '/analytics',
    icon: ChartBarIcon,
    roles: ['barber', 'admin', 'super_admin'],
    description: 'Business performance insights'
  },
  
  // Enterprise section (super_admin only)
  {
    name: 'Enterprise',
    href: '/enterprise/dashboard',
    icon: BuildingStorefrontIcon,
    roles: ['super_admin'],
    description: 'Multi-location management',
    isNew: true
  },
  
  // Admin section
  {
    name: 'Administration',
    href: '/admin',
    icon: ShieldCheckIcon,
    roles: ['admin', 'super_admin'],
    description: 'System administration',
    children: [
      {
        name: 'Overview',
        href: '/admin',
        icon: PresentationChartLineIcon,
        roles: ['admin', 'super_admin']
      },
      {
        name: 'Services',
        href: '/admin/services',
        icon: ScissorsIcon,
        roles: ['admin', 'super_admin']
      },
      {
        name: 'Booking Rules',
        href: '/admin/booking-rules',
        icon: ClipboardDocumentListIcon,
        roles: ['admin', 'super_admin']
      },
      {
        name: 'Webhooks',
        href: '/admin/webhooks',
        icon: CloudIcon,
        roles: ['admin', 'super_admin']
      }
    ]
  },
  
  // Data Management
  {
    name: 'Data Management',
    href: '/data',
    icon: CubeIcon,
    roles: ['admin', 'super_admin'],
    description: 'Import and export data',
    children: [
      {
        name: 'Import',
        href: '/import',
        icon: DocumentArrowUpIcon,
        roles: ['admin', 'super_admin']
      },
      {
        name: 'Export',
        href: '/export',
        icon: DocumentArrowDownIcon,
        roles: ['admin', 'super_admin']
      }
    ]
  },
  
  // Settings (available to all)
  {
    name: 'Settings',
    href: '/settings',
    icon: CogIcon,
    description: 'Personal preferences',
    children: [
      {
        name: 'Profile',
        href: '/settings/profile',
        icon: UserIcon
      },
      {
        name: 'Calendar Sync',
        href: '/settings/calendar',
        icon: CalendarIcon
      },
      {
        name: 'Notifications',
        href: '/settings/notifications',
        icon: BellIcon
      },
      {
        name: 'Integrations',
        href: '/settings/integrations',
        icon: CloudIcon,
        description: 'Connect third-party services'
      }
    ]
  },
  
]

// Mobile navigation tabs (bottom navigation)
export const mobileNavigationTabs: MobileTabItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    iconSolid: HomeIconSolid,
    description: 'Business overview'
  },
  {
    name: 'Calendar',
    href: '/calendar',
    icon: CalendarIcon,
    iconSolid: CalendarIconSolid,
    description: 'Schedule management'
  },
  {
    name: 'Clients',
    href: '/clients',
    icon: UserGroupIcon,
    iconSolid: UserGroupIconSolid,
    roles: ['barber', 'admin', 'super_admin']
  },
  {
    name: 'Bookings',
    href: '/bookings',
    icon: ClockIcon,
    iconSolid: ClockIconSolid,
    roles: ['user']
  },
  {
    name: 'Earnings',
    href: '/barber/earnings',
    icon: BanknotesIcon,
    iconSolid: BanknotesIconSolid,
    roles: ['barber']
  },
  {
    name: 'Admin',
    href: '/admin',
    icon: BuildingStorefrontIcon,
    iconSolid: BuildingStorefrontIconSolid,
    roles: ['admin', 'super_admin']
  }
]

// Quick actions for different user roles
export const quickActions: QuickAction[] = [
  // User quick actions
  {
    name: 'Book Now',
    href: '/book',
    icon: CalendarIcon,
    description: 'Schedule your next appointment',
    roles: ['user'],
    color: 'primary'
  },
  {
    name: 'View Bookings',
    href: '/bookings',
    icon: ClockIcon,
    description: 'Check your upcoming appointments',
    roles: ['user']
  },
  
  // Barber quick actions
  {
    name: 'Today\'s Schedule',
    href: '/calendar',
    icon: CalendarIcon,
    description: 'View today\'s appointments',
    roles: ['barber'],
    color: 'primary'
  },
  {
    name: 'Add Client',
    href: '/clients/new',
    icon: UserPlusIcon,
    description: 'Register a new client',
    roles: ['barber', 'admin', 'super_admin']
  },
  {
    name: 'Check Earnings',
    href: '/barber/earnings',
    icon: BanknotesIcon,
    description: 'View your earnings report',
    roles: ['barber']
  },
  
  // Super Admin quick actions
  {
    name: 'Enterprise Dashboard',
    href: '/enterprise/dashboard',
    icon: BuildingStorefrontIcon,
    description: 'Monitor all locations',
    roles: ['super_admin'],
    color: 'primary'
  },
  
  // Admin quick actions
  {
    name: 'Manage Services',
    href: '/admin/services',
    icon: ScissorsIcon,
    description: 'Add or edit services',
    roles: ['admin', 'super_admin'],
    color: 'primary'
  },
  {
    name: 'Send Notification',
    href: '/notifications',
    icon: BellIcon,
    description: 'Send SMS or email to clients',
    roles: ['admin', 'barber', 'super_admin']
  },
  {
    name: 'Export Data',
    href: '/export',
    icon: DocumentArrowDownIcon,
    description: 'Download business data',
    roles: ['admin', 'super_admin']
  }
]

// User menu items (dropdown in header)
export const userMenuItems: NavigationItem[] = [
  {
    name: 'My Profile',
    href: '/settings/profile',
    icon: UserIcon
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Cog6ToothIcon
  },
  {
    name: 'Help & Support',
    href: '/support',
    icon: QuestionMarkCircleIcon,
    isExternal: true
  },
  {
    name: 'Sign Out',
    href: '/logout',
    icon: ArrowRightOnRectangleIcon
  }
]

// Public navigation (for non-authenticated users)
export const publicNavigationItems: NavigationItem[] = [
  {
    name: 'Home',
    href: '/',
    icon: HomeIcon
  },
  {
    name: 'Book Appointment',
    href: '/book',
    icon: CalendarIcon
  },
  {
    name: 'Sign In',
    href: '/login',
    icon: ArrowRightOnRectangleIcon
  },
  {
    name: 'Sign Up',
    href: '/register',
    icon: UserPlusIcon
  }
]

// Helper function to get navigation for mobile based on role
export function getMobileNavigationTabs(userRole?: string | null): MobileTabItem[] {
  if (!userRole) return mobileNavigationTabs.filter(tab => !tab.roles)
  
  // Filter tabs based on role, limiting to 5 most important
  const filteredTabs = mobileNavigationTabs.filter(tab => {
    if (!tab.roles || tab.roles.length === 0) return true
    return tab.roles.includes(userRole as UserRole)
  })
  
  // Ensure we don't show more than 5 tabs on mobile
  return filteredTabs.slice(0, 5)
}

// Helper function to get quick actions for a specific role
export function getQuickActionsForRole(userRole?: string | null): QuickAction[] {
  if (!userRole) return []
  
  return quickActions.filter(action => {
    if (!action.roles || action.roles.length === 0) return true
    return action.roles.includes(userRole as UserRole)
  })
}

// Helper function to generate breadcrumbs from pathname
export function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const paths = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', href: '/' }
  ]
  
  let currentPath = ''
  paths.forEach((path, index) => {
    currentPath += `/${path}`
    const label = path
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    
    breadcrumbs.push({
      label,
      href: currentPath,
      isLast: index === paths.length - 1
    })
  })
  
  return breadcrumbs
}

// Helper function to get user menu items based on role
export function getUserMenuItems(userRole?: string | null): NavigationItem[] {
  const baseItems = userMenuItems.filter(item => item.name !== 'Sign Out')
  const signOutItem = userMenuItems.find(item => item.name === 'Sign Out')
  
  // Add role-specific items
  const roleSpecificItems: NavigationItem[] = []
  
  if (userRole === 'barber' || userRole === 'admin' || userRole === 'super_admin') {
    // Find the payments item from main navigation
    const paymentsItem = navigationItems.find(item => item.href === '/payments')
    if (paymentsItem) {
      roleSpecificItems.push({
        name: 'Payments',
        href: paymentsItem.href,
        icon: paymentsItem.icon,
        roles: ['barber', 'admin', 'super_admin']
      })
    }
  }
  
  // Combine base items, role-specific items, and sign out
  const allItems = [...baseItems, ...roleSpecificItems]
  if (signOutItem) {
    allItems.push(signOutItem)
  }
  
  return allItems
}

// Navigation configuration for different layouts
export const navigationConfig = {
  sidebar: {
    items: navigationItems,
    collapsible: true,
    defaultCollapsed: false
  },
  mobile: {
    tabs: mobileNavigationTabs,
    maxTabs: 5
  },
  header: {
    showSearch: true,
    showNotifications: true,
    showUserMenu: true,
    userMenuItems
  }
}

// Export everything as a single config object for convenience
export const navigation = {
  items: navigationItems,
  mobileTabs: mobileNavigationTabs,
  quickActions,
  userMenuItems,
  publicItems: publicNavigationItems,
  config: navigationConfig,
  
  // Helper functions
  filterByRole: filterNavigationByRole,
  getMobileTabs: getMobileNavigationTabs,
  getQuickActions: getQuickActionsForRole,
  generateBreadcrumbs,
  getUserMenuItems
}

export default navigation