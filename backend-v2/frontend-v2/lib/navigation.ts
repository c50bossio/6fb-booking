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
  CpuChipIcon,
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
  // Always show core navigation items for authenticated users
  const coreItems = [
    items.find(item => item.name === 'Dashboard'),
    items.find(item => item.name === 'Calendar & Scheduling'),
    items.find(item => item.name === 'Settings')
  ].filter(Boolean) as NavigationItem[]
  
  if (!userRole) {
    return coreItems
  }
  
  // Simplified role mapping with broader access for barbers
  const roleMapping: Record<string, string[]> = {
    // Platform-level roles get everything
    'super_admin': ['super_admin', 'admin', 'barber', 'user'],
    'platform_admin': ['super_admin', 'admin', 'barber', 'user'],
    
    // Business owner roles - broader access for barbers
    'enterprise_owner': ['super_admin', 'admin', 'barber', 'user'],
    'shop_owner': ['admin', 'barber', 'user'], 
    'individual_barber': ['barber', 'user'], // Give barbers user access too
    
    // Staff roles - ensure barbers get full access
    'shop_manager': ['admin', 'barber', 'user'],
    'barber': ['barber', 'user'], // Barbers get user permissions too
    'receptionist': ['barber', 'user'], // Can manage appointments and basic features
    
    // Client roles
    'client': ['user'],
    'user': ['user']
  }
  
  // Get equivalent roles for the user's role
  const equivalentRoles = roleMapping[userRole] || [userRole]
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Navigation filtering debug:', {
      userRole,
      equivalentRoles,
      totalItems: items.length
    })
  }
  
  // Filter items based on role permissions - be more permissive
  const roleItems = items.filter(item => {
    // Items without roles are available to everyone
    if (!item.roles || item.roles.length === 0) return true
    
    // Check if any of the item's required roles match the user's equivalent roles
    const hasAccess = item.roles.some(role => equivalentRoles.includes(role))
    
    if (process.env.NODE_ENV === 'development' && !hasAccess) {
      console.log('❌ Access denied for:', item.name, 'requires:', item.roles, 'user has:', equivalentRoles)
    }
    
    return hasAccess
  })
  
  // Filter out duplicates while preserving core items first
  const allItemNames = new Set(coreItems.map(item => item.name))
  const additionalItems = roleItems.filter(item => !allItemNames.has(item.name))
  
  const finalItems = [...coreItems, ...additionalItems]
  
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Final navigation items:', finalItems.map(item => item.name))
  }
  
  return finalItems
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
        name: 'Recurring',
        href: '/recurring',
        icon: ArrowPathIcon,
        roles: ['admin', 'barber', 'super_admin'],
        description: 'Manage recurring appointments'
      }
    ]
  },
  
  // Client Management - Essential for barbers
  {
    name: 'Clients',
    href: '/clients',
    icon: UserGroupIcon,
    roles: ['barber', 'admin', 'super_admin'],
    description: 'Comprehensive client management, segmentation, and communication',
    children: [
      {
        name: 'All Clients',
        href: '/clients',
        icon: UserGroupIcon,
        roles: ['barber', 'admin', 'super_admin'],
        description: 'View and manage all clients'
      },
      {
        name: 'Add New Client',
        href: '/clients/new',
        icon: UserPlusIcon,
        roles: ['barber', 'admin', 'super_admin'],
        description: 'Register a new client'
      },
      {
        name: 'Client History',
        href: '/clients/history',
        icon: ClockIcon,
        roles: ['barber', 'admin', 'super_admin'],
        description: 'View client appointment history'
      }
    ]
  },

  // My Schedule - Barber-focused view
  {
    name: 'My Schedule',
    href: '/my-schedule',
    icon: CalendarIcon,
    roles: ['barber', 'admin', 'super_admin'],
    description: 'Unified view of your availability and scheduled appointments'
  },
  
  // AI Agents - Intelligent automation and revenue optimization
  {
    name: 'AI Agents',
    href: '/agents',
    icon: CpuChipIcon,
    roles: ['admin', 'barber', 'super_admin'],
    description: 'AI-powered automation and intelligent business optimization',
    isNew: true,
    children: [
      {
        name: 'Agent Dashboard',
        href: '/ai-agent',
        icon: ChartBarIcon,
        roles: ['admin', 'barber', 'super_admin'],
        description: 'Real-time AI performance monitoring and control'
      },
      {
        name: 'Agent Management',
        href: '/agents',
        icon: CpuChipIcon,
        roles: ['admin', 'barber', 'super_admin'],
        description: 'Create and manage AI agent instances'
      },
      {
        name: 'Agent Analytics',
        href: '/agents/analytics',
        icon: ChartPieIcon,
        roles: ['admin', 'barber', 'super_admin'],
        description: 'Agent performance insights and optimization'
      }
    ]
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
  
  // Communications - Multi-channel client communication
  {
    name: 'Communications',
    href: '/sms',
    icon: ChatBubbleLeftRightIcon,
    roles: ['admin', 'barber', 'super_admin'],
    description: 'Multi-channel client communication and messaging',
    isNew: true,
    children: [
      {
        name: 'SMS Conversations',
        href: '/sms',
        icon: DevicePhoneMobileIcon,
        roles: ['admin', 'barber', 'super_admin'],
        description: 'Real-time text message conversations with clients'
      },
      {
        name: 'Email Campaigns',
        href: '/marketing/campaigns',
        icon: EnvelopeIcon,
        roles: ['admin', 'super_admin'],
        description: 'Email marketing campaigns and automation'
      },
      {
        name: 'Quick Messages',
        href: '/marketing/quick-send',
        icon: BellIcon,
        roles: ['admin', 'barber', 'super_admin'],
        description: 'Send instant notifications to clients'
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
  
  // My Earnings - Barber-focused finance view
  {
    name: 'My Earnings',
    href: '/finance/earnings',
    icon: BanknotesIcon,
    roles: ['barber'],
    description: 'Track your personal earnings and performance',
    isNew: true
  },

  // Finance Hub - Comprehensive financial management
  {
    name: 'Finance',
    href: '/finance',
    icon: BanknotesIcon,
    roles: ['admin', 'super_admin'],
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
      },
      {
        name: 'Payouts',
        href: '/payouts',
        icon: BanknotesIcon,
        roles: ['barber', 'admin', 'super_admin'],
        description: 'Dedicated payout scheduling and tracking'
      },
      {
        name: 'Billing & Plans',
        href: '/billing/plans',
        icon: CreditCardIcon,
        roles: ['admin', 'super_admin'],
        description: 'Subscription management and billing plans'
      }
    ]
  },
  
  // Six Figure Barber Dashboard - Premium methodology tracking
  {
    name: 'Six Figure Barber',
    href: '/dashboard/six-figure-barber',
    icon: ArrowTrendingUpIcon,
    roles: ['barber', 'admin', 'super_admin'],
    description: 'Premium Six Figure Barber methodology dashboard and analytics',
    isNew: true
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
      },
      {
        name: 'API Keys',
        href: '/admin/api-keys',
        icon: ShieldCheckIcon,
        roles: ['admin', 'super_admin'],
        description: 'Developer API access management'
      },
      {
        name: 'Advanced Webhooks',
        href: '/admin/webhook-management',
        icon: CloudIcon,
        roles: ['admin', 'super_admin'],
        description: 'Webhook monitoring and management'
      }
    ]
  },
  
  // Settings (available to all) - moved to bottom
  {
    name: 'Settings',
    href: '/settings',
    icon: CogIcon,
    description: 'Manage account settings and preferences'
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
    name: 'Six Figure Barber',
    href: '/dashboard/six-figure-barber',
    icon: ArrowTrendingUpIcon,
    description: 'Track methodology performance',
    roles: ['barber', 'admin', 'super_admin'],
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