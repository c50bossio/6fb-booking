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
  RocketLaunchIcon,
  SparklesIcon,
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
    items.find(item => item.name === 'Appointments'),
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

// Main navigation items (for sidebar) - STREAMLINED STRUCTURE
export const navigationItems: NavigationItem[] = [
  // 1. Dashboard - Business overview
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    description: 'Business overview and quick stats'
  },
  
  // 2. Appointments - All scheduling functionality (unified terminology)
  {
    name: 'Appointments',
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
        name: 'My Appointments',
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
  
  // 3. Clients - All client management (consolidated)
  {
    name: 'Clients',
    href: '/clients',
    icon: UserGroupIcon,
    roles: ['barber', 'admin', 'super_admin'],
    description: 'Complete client management and segmentation',
    children: [
      {
        name: 'All Clients',
        href: '/clients',
        icon: UserGroupIcon,
        roles: ['barber', 'admin', 'super_admin'],
        description: 'View and manage all clients'
      },
      {
        name: 'Customer Management',
        href: '/customers',
        icon: UsersIcon,
        roles: ['admin', 'super_admin'],
        description: 'Advanced customer segmentation'
      },
      {
        name: 'Client Tiers',
        href: '/analytics/client-tiers',
        icon: UsersIcon,
        roles: ['barber', 'admin', 'super_admin'],
        description: 'Six Figure Barber client tier analytics'
      }
    ]
  },
  
  // 4. Payments - All financial functionality (consolidated Finance Hub)
  {
    name: 'Payments',
    href: '/payments/financial-center',
    icon: BanknotesIcon,
    roles: ['admin', 'barber', 'super_admin'],
    description: 'Complete financial management',
    children: [
      {
        name: 'Financial Center',
        href: '/payments/financial-center',
        icon: CurrencyDollarIcon,
        roles: ['admin', 'barber', 'super_admin'],
        description: 'Advanced financial management center'
      },
      {
        name: 'Payment Overview',
        href: '/payments',
        icon: CreditCardIcon,
        roles: ['admin', 'barber', 'super_admin'],
        description: 'View payment history and status'
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
        roles: ['admin', 'super_admin'],
        description: 'Manage gift certificates'
      },
      {
        name: 'Commissions',
        href: '/commissions',
        icon: CurrencyDollarIcon,
        roles: ['admin', 'super_admin'],
        description: 'Manage commission structures'
      },
      {
        name: 'Payouts',
        href: '/payouts',
        icon: BanknotesIcon,
        roles: ['admin', 'super_admin'],
        description: 'Manage barber payouts'
      },
      {
        name: 'Transactions',
        href: '/finance/transactions',
        icon: RectangleStackIcon,
        roles: ['admin', 'super_admin'],
        description: 'Transaction history and details'
      }
    ]
  },
  
  // 5. Services - Service management, products, and 6FB compliance (consolidated)
  {
    name: 'Services',
    href: '/services/service-center',
    icon: ScissorsIcon,
    roles: ['barber', 'admin', 'super_admin'],
    description: 'Complete service management and optimization',
    children: [
      {
        name: 'Service Management',
        href: '/services/service-center',
        icon: ScissorsIcon,
        roles: ['barber', 'admin', 'super_admin'],
        description: 'Manage services and pricing'
      },
      {
        name: 'Admin Services',
        href: '/admin/services',
        icon: ScissorsIcon,
        roles: ['admin', 'super_admin'],
        description: 'Administrative service configuration'
      },
      {
        name: 'Products',
        href: '/products',
        icon: ShoppingBagIcon,
        roles: ['admin', 'super_admin'],
        description: 'Manage products and inventory'
      },
      {
        name: '6FB Compliance',
        href: '/compliance',
        icon: AcademicCapIcon,
        roles: ['barber', 'admin', 'super_admin'],
        description: 'Six Figure Barber methodology alignment'
      },
      {
        name: 'Service Templates',
        href: '/automation/service-templates',
        icon: BeakerIcon,
        roles: ['admin', 'super_admin'],
        description: 'Six Figure Barber methodology templates'
      },
      {
        name: 'Pricing Optimization',
        href: '/services/service-center?tab=optimization',
        icon: RocketLaunchIcon,
        roles: ['admin', 'super_admin'],
        description: 'Revenue and pricing optimization'
      }
    ]
  },
  
  // 6. Analytics - All analytics consolidated
  {
    name: 'Analytics',
    href: '/analytics',
    icon: ChartBarIcon,
    roles: ['barber', 'admin', 'super_admin'],
    description: 'Business performance insights',
    children: [
      {
        name: 'Overview',
        href: '/analytics/overview',
        icon: PresentationChartLineIcon,
        roles: ['barber', 'admin', 'super_admin'],
        description: 'Analytics overview dashboard'
      },
      {
        name: 'Enhanced Analytics',
        href: '/analytics/enhanced',
        icon: RocketLaunchIcon,
        roles: ['barber', 'admin', 'super_admin'],
        description: 'Advanced analytics with AI insights'
      },
      {
        name: 'Six Figure Analytics',
        href: '/analytics/sixfigure',
        icon: AcademicCapIcon,
        roles: ['barber', 'admin', 'super_admin'],
        description: 'Track progress toward six-figure income'
      },
      {
        name: 'Revenue Analytics',
        href: '/analytics/revenue',
        icon: CurrencyDollarIcon,
        roles: ['admin', 'super_admin'],
        description: 'Revenue performance and trends'
      },
      {
        name: 'Financial Analytics',
        href: '/finance/analytics',
        icon: ChartBarIcon,
        roles: ['admin', 'super_admin'],
        description: 'Financial insights and reporting'
      },
      {
        name: 'Service Analytics',
        href: '/services/service-center?tab=analytics',
        icon: ChartBarIcon,
        roles: ['barber', 'admin', 'super_admin'],
        description: 'Service performance and profitability'
      }
    ]
  },
  
  // 7. Marketing - Marketing, communication, and reviews consolidated
  {
    name: 'Marketing',
    href: '/marketing',
    icon: EnvelopeIcon,
    roles: ['admin', 'super_admin'],
    description: 'Marketing campaigns and customer communication',
    children: [
      {
        name: 'Campaigns',
        href: '/marketing/campaigns',
        icon: ChatBubbleLeftRightIcon,
        roles: ['admin', 'super_admin'],
        description: 'Create and manage campaigns'
      },
      {
        name: 'Communication',
        href: '/notifications',
        icon: PhoneIcon,
        roles: ['admin', 'barber', 'super_admin'],
        description: 'Send notifications and messages'
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
        name: 'Reviews',
        href: '/reviews',
        icon: StarIcon,
        roles: ['admin', 'super_admin'],
        description: 'Manage customer reviews and responses'
      },
      {
        name: 'Marketing Analytics',
        href: '/marketing/analytics',
        icon: ChartPieIcon,
        roles: ['admin', 'super_admin'],
        description: 'Campaign performance tracking'
      },
      {
        name: 'Booking Links',
        href: '/marketing/booking-links',
        icon: LinkIcon,
        roles: ['admin', 'super_admin'],
        description: 'Trackable booking URLs and QR codes'
      },
      {
        name: 'Smart CTAs',
        href: '/automation/smart-cta',
        icon: SparklesIcon,
        roles: ['admin', 'super_admin'],
        description: 'AI-powered call-to-action generation'
      }
    ]
  },
  
  // 8. Settings - Administration, tools, enterprise, and automation consolidated
  {
    name: 'Settings',
    href: '/settings',
    icon: CogIcon,
    description: 'System configuration and administration',
    children: [
      {
        name: 'Profile',
        href: '/settings/profile',
        icon: UserIcon,
        description: 'Personal profile settings'
      },
      {
        name: 'Calendar Sync',
        href: '/settings/calendar',
        icon: CalendarIcon,
        description: 'Google Calendar integration'
      },
      {
        name: 'Notifications',
        href: '/settings/notifications',
        icon: BellIcon,
        description: 'Notification preferences'
      },
      {
        name: 'Security',
        href: '/settings/security',
        icon: ShieldCheckIcon,
        description: 'Security settings and trusted devices'
      },
      {
        name: 'Integrations',
        href: '/settings/integrations',
        icon: CloudIcon,
        description: 'Connect third-party services'
      },
      {
        name: 'Administration',
        href: '/admin',
        icon: ShieldCheckIcon,
        roles: ['admin', 'super_admin'],
        description: 'System administration'
      },
      {
        name: 'Enterprise',
        href: '/enterprise/dashboard',
        icon: BuildingStorefrontIcon,
        roles: ['super_admin'],
        description: 'Multi-location management'
      },
      {
        name: 'User Management',
        href: '/admin/users',
        icon: UsersIcon,
        roles: ['admin', 'super_admin'],
        description: 'Manage platform users and permissions'
      },
      {
        name: 'Automation',
        href: '/automation',
        icon: RocketLaunchIcon,
        roles: ['admin', 'super_admin'],
        description: 'Business automation and AI features'
      },
      {
        name: 'Data Import/Export',
        href: '/import',
        icon: DocumentArrowUpIcon,
        roles: ['admin', 'super_admin'],
        description: 'Import and export business data'
      },
      {
        name: 'Tracking Pixels',
        href: '/settings/tracking-pixels',
        icon: ChartBarIcon,
        roles: ['admin', 'super_admin'],
        description: 'Manage conversion tracking pixels'
      },
      {
        name: 'Privacy Settings',
        href: '/settings/privacy',
        icon: ShieldCheckIcon,
        roles: ['admin', 'super_admin'],
        description: 'Privacy and data protection settings'
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
    name: 'Service Center',
    href: '/services/service-center',
    icon: ScissorsIcon,
    description: 'Complete service management hub',
    roles: ['admin', 'super_admin', 'barber'],
    color: 'primary'
  },
  {
    name: 'Manage Services',
    href: '/admin/services',
    icon: ScissorsIcon,
    description: 'Add or edit services',
    roles: ['admin', 'super_admin']
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