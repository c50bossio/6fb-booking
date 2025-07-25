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
  BeakerIcon,
  AcademicCapIcon,
  UsersIcon,
  StarIcon,
  LinkIcon,
  RectangleStackIcon,
  DevicePhoneMobileIcon,
  ShoppingBagIcon,
  ArrowTrendingUpIcon,
  CogIcon as AutomationIcon,
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
export type UserRole = 'user' | 'barber' | 'admin' | 'super_admin' | 
  'enterprise_owner' | 'shop_owner' | 'individual_barber' | 
  'shop_manager' | 'receptionist' | 'client' | 'platform_admin'

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

// Enhanced navigation filter that handles unified roles
export function filterNavigationByRole(
  items: NavigationItem[],
  userRole?: string | null
): NavigationItem[] {
  // Always show basic navigation items
  const basicItems = [
    items.find(item => item.name === 'Dashboard'),
    items.find(item => item.name === 'Calendar & Scheduling'),
    items.find(item => item.name === 'Settings')
  ].filter(Boolean) as NavigationItem[]
  
  if (!userRole) {
    return basicItems
  }
  
  // Map unified roles to equivalent access levels
  const roleMapping: Record<string, string[]> = {
    // Platform-level roles
    'super_admin': ['super_admin', 'admin', 'barber'],
    'platform_admin': ['super_admin', 'admin', 'barber'],
    
    // Business owner roles - enterprise owners get everything
    'enterprise_owner': ['super_admin', 'admin', 'barber'],
    'shop_owner': ['admin', 'barber'],
    'individual_barber': ['barber'],
    
    // Staff roles
    'shop_manager': ['admin', 'barber'],
    'barber': ['barber'],
    'receptionist': ['barber'], // Can manage appointments
    
    // Client roles
    'client': ['user'],
    'user': ['user']
  }
  
  // Get equivalent roles for the user's role
  const equivalentRoles = roleMapping[userRole] || [userRole]
  
  // Filter items based on role permissions
  const roleItems = items.filter(item => {
    if (!item.roles || item.roles.length === 0) return false
    
    // Check if any of the item's required roles match the user's equivalent roles
    return item.roles.some(role => equivalentRoles.includes(role))
  })
  
  // Remove duplicates (basic items might also be in roleItems)
  const allItemNames = new Set(basicItems.map(item => item.name))
  const additionalItems = roleItems.filter(item => !allItemNames.has(item.name))
  
  return [...basicItems, ...additionalItems]
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
        href: '/barber/availability',
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
  
  // Client Management - Consolidated
  {
    name: 'Clients',
    href: '/clients',
    icon: UserGroupIcon,
    roles: ['barber', 'admin', 'super_admin'],
    description: 'Comprehensive client management, segmentation, and communication'
  },
  
  // Marketing & Communication Suite - Consolidated
  {
    name: 'Marketing',
    href: '/marketing',
    icon: EnvelopeIcon,
    roles: ['admin', 'super_admin'],
    description: 'Integrated marketing, communication, and automation',
    isNew: true,
    children: [
      {
        name: 'Campaigns',
        href: '/marketing/campaigns',
        icon: ChatBubbleLeftRightIcon,
        roles: ['admin', 'super_admin'],
        description: 'Email, SMS, and notification campaigns'
      },
      {
        name: 'Quick Messages',
        href: '/marketing/quick-send',
        icon: BellIcon,
        roles: ['admin', 'barber', 'super_admin'],
        description: 'Send instant notifications to clients'
      },
      {
        name: 'Templates',
        href: '/marketing/templates',
        icon: DocumentArrowDownIcon,
        roles: ['admin', 'super_admin'],
        description: 'Email, SMS, and notification templates'
      },
      {
        name: 'Contacts',
        href: '/marketing/contacts',
        icon: UserCircleIcon,
        roles: ['admin', 'super_admin'],
        description: 'Manage contact lists and segments'
      },
      {
        name: 'Booking Links',
        href: '/marketing/booking-links',
        icon: LinkIcon,
        roles: ['admin', 'super_admin'],
        description: 'Trackable booking URLs and QR codes'
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
  
  // Business Automation - Manual → Semi-Auto → AI Agent progression
  {
    name: 'Business Automation',
    href: '/automation',
    icon: AutomationIcon,
    roles: ['admin', 'barber', 'super_admin'],
    description: 'Manual, semi-auto, and AI-powered business automation',
    isNew: true,
    children: [
      {
        name: 'Upselling Automation',
        href: '/automation/upselling',
        icon: ArrowTrendingUpIcon,
        roles: ['admin', 'barber', 'super_admin'],
        description: 'Manual → Semi-Auto → AI Agent upselling controls'
      },
      {
        name: 'Booking Management',
        href: '/automation/booking',
        icon: CalendarIcon,
        roles: ['admin', 'barber', 'super_admin'],
        description: 'Automated scheduling and confirmations'
      },
      {
        name: 'Revenue Optimization',
        href: '/automation/revenue',
        icon: CurrencyDollarIcon,
        roles: ['admin', 'super_admin'],
        description: 'AI-powered pricing and revenue strategies'
      },
      {
        name: 'Workflow Builder',
        href: '/automation/workflows',
        icon: ArrowPathIcon,
        roles: ['admin', 'super_admin'],
        description: 'Create custom automation workflows'
      }
    ]
  },
  
  // Finance Hub - Comprehensive financial management
  {
    name: 'Finance',
    href: '/finance',
    icon: BanknotesIcon,
    roles: ['admin', 'barber', 'super_admin'],
    description: 'Comprehensive financial management',
    children: [
      {
        name: 'Overview',
        href: '/finance',
        icon: CreditCardIcon,
        roles: ['admin', 'barber', 'super_admin'],
        description: 'Financial dashboard and summary'
      },
      {
        name: 'Transactions',
        href: '/finance/transactions',
        icon: RectangleStackIcon,
        roles: ['admin', 'barber', 'super_admin'],
        description: 'All payment transactions'
      },
      {
        name: 'Earnings & Payouts',
        href: '/finance/earnings',
        icon: BanknotesIcon,
        roles: ['barber', 'admin', 'super_admin'],
        description: 'Income tracking and payout management'
      },
      {
        name: 'Commissions',
        href: '/finance/commissions',
        icon: CurrencyDollarIcon,
        roles: ['admin', 'super_admin'],
        description: 'Commission rates and calculations'
      },
      {
        name: 'Gift Certificates',
        href: '/finance/gift-certificates',
        icon: GiftIcon,
        roles: ['admin', 'super_admin'],
        description: 'Gift certificate management'
      }
    ]
  },
  
  // Analytics Hub - Unified analytics dashboard
  {
    name: 'Analytics',
    href: '/analytics',
    icon: ChartBarIcon,
    roles: ['barber', 'admin', 'super_admin'],
    description: 'Unified analytics dashboard with all business insights'
  },
  
  // Review Management
  {
    name: 'Reviews',
    href: '/reviews',
    icon: StarIcon,
    roles: ['admin', 'super_admin'],
    description: 'Manage customer reviews and responses',
    children: [
      {
        name: 'All Reviews',
        href: '/reviews',
        icon: StarIcon,
        roles: ['admin', 'super_admin'],
        description: 'View and manage all reviews'
      },
      {
        name: 'Response Templates',
        href: '/reviews/templates',
        icon: DocumentArrowDownIcon,
        roles: ['admin', 'super_admin'],
        description: 'Manage review response templates'
      }
    ]
  },
  
  // Product Management
  {
    name: 'Products',
    href: '/products',
    icon: ShoppingBagIcon,
    roles: ['admin', 'super_admin'],
    description: 'Manage products and inventory',
    children: [
      {
        name: 'All Products',
        href: '/products',
        icon: ShoppingBagIcon,
        roles: ['admin', 'super_admin'],
        description: 'View all products'
      },
      {
        name: 'Add Product',
        href: '/products/new',
        icon: UserPlusIcon,
        roles: ['admin', 'super_admin'],
        description: 'Create new product'
      }
    ]
  },
  
  // Services Management - Consolidated
  {
    name: 'Services',
    href: '/services',
    icon: ScissorsIcon,
    roles: ['admin', 'super_admin'],
    description: 'Service catalog and performance management',
    children: [
      {
        name: 'Service Catalog',
        href: '/services',
        icon: ScissorsIcon,
        roles: ['admin', 'super_admin'],
        description: 'Manage services and pricing'
      },
      {
        name: 'Service Analytics',
        href: '/services/analytics',
        icon: ChartBarIcon,
        roles: ['admin', 'super_admin', 'barber'],
        description: 'Service performance insights'
      },
      {
        name: 'Templates',
        href: '/services/templates',
        icon: DocumentArrowDownIcon,
        roles: ['admin', 'super_admin'],
        description: 'Service package templates'
      }
    ]
  },
  
  // Six Figure Barber Compliance
  {
    name: '6FB Compliance',
    href: '/compliance',
    icon: AcademicCapIcon,
    roles: ['barber', 'admin', 'super_admin'],
    description: 'Track Six Figure Barber methodology alignment',
    isNew: true
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
  
  // Admin section - Simplified
  {
    name: 'Administration',
    href: '/admin',
    icon: ShieldCheckIcon,
    roles: ['admin', 'super_admin'],
    description: 'System administration',
    children: [
      {
        name: 'Dashboard',
        href: '/admin',
        icon: PresentationChartLineIcon,
        roles: ['admin', 'super_admin'],
        description: 'Admin overview'
      },
      {
        name: 'User Management',
        href: '/admin/users',
        icon: UsersIcon,
        roles: ['admin', 'super_admin'],
        description: 'Manage users and permissions'
      },
      {
        name: 'Staff Invitations',
        href: '/admin/invitations',
        icon: UserPlusIcon,
        roles: ['admin', 'super_admin'],
        description: 'Invite team members'
      },
      {
        name: 'Booking Rules',
        href: '/admin/booking-rules',
        icon: ClipboardDocumentListIcon,
        roles: ['admin', 'super_admin'],
        description: 'Configure booking policies'
      }
    ]
  },
  
  // Business Tools
  {
    name: 'Business Tools',
    href: '/tools',
    icon: CubeIcon,
    roles: ['admin', 'super_admin'],
    description: 'Advanced business management tools',
    children: [
      {
        name: 'Data Import',
        href: '/import',
        icon: DocumentArrowUpIcon,
        roles: ['admin', 'super_admin'],
        description: 'Import client and service data'
      },
      {
        name: 'Data Export',
        href: '/export',
        icon: DocumentArrowDownIcon,
        roles: ['admin', 'super_admin'],
        description: 'Export business data'
      },
      {
        name: 'Webhooks',
        href: '/admin/webhooks',
        icon: CloudIcon,
        roles: ['admin', 'super_admin'],
        description: 'Configure API webhooks'
      }
    ]
  },
  
  // Settings (available to all) - moved to bottom
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
        name: 'Security',
        href: '/settings/security',
        icon: ShieldCheckIcon,
        description: 'Manage security settings and trusted devices'
      },
      {
        name: 'Integrations',
        href: '/settings/integrations',
        icon: CloudIcon,
        description: 'Connect third-party services'
      },
      {
        name: 'Tracking Pixels',
        href: '/settings/tracking-pixels',
        icon: ChartBarIcon,
        roles: ['admin', 'super_admin'],
        description: 'Manage conversion tracking pixels'
      },
      {
        name: 'Test Data',
        href: '/settings/test-data',
        icon: BeakerIcon,
        roles: ['admin', 'super_admin'],
        description: 'Manage test data for exploring platform features'
      },
      {
        name: 'Landing Page',
        href: '/settings/landing-page',
        icon: RectangleStackIcon,
        roles: ['admin', 'super_admin'],
        description: 'Configure landing page settings'
      },
      {
        name: 'Privacy Settings',
        href: '/settings/privacy',
        icon: ShieldCheckIcon,
        roles: ['admin', 'super_admin'],
        description: 'Privacy and data protection settings'
      },
      {
        name: 'PWA Settings',
        href: '/settings/pwa',
        icon: DevicePhoneMobileIcon,
        roles: ['admin', 'super_admin'],
        description: 'Progressive Web App configuration'
      }
    ]
  }
  
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
    href: '/finance/earnings',
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
    href: '/finance/earnings',
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
    href: '/services',
    icon: ScissorsIcon,
    description: 'Add or edit services',
    roles: ['admin', 'super_admin'],
    color: 'primary'
  },
  {
    name: 'Service Analytics',
    href: '/services/analytics',
    icon: ChartBarIcon,
    description: 'Service performance insights',
    roles: ['admin', 'super_admin', 'barber']
  },
  {
    name: 'Send Notification',
    href: '/marketing/quick-send',
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
  },
  {
    name: 'Tracking Pixels',
    href: '/settings/tracking-pixels',
    icon: ChartBarIcon,
    description: 'Set up conversion tracking',
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