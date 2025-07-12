// Navigation configuration for the application

export interface NavigationItem {
  name: string
  href: string
  icon?: string
  current?: boolean
  children?: NavigationItem[]
}

export const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: 'HomeIcon'
  },
  {
    name: 'Calendar',
    href: '/calendar',
    icon: 'CalendarIcon'
  },
  {
    name: 'Clients',
    href: '/clients',
    icon: 'UsersIcon'
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: 'ChartBarIcon'
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: 'CogIcon'
  }
]

export const getNavigationItem = (href: string): NavigationItem | undefined => {
  return navigationItems.find(item => item.href === href)
}

export const isActiveRoute = (pathname: string, href: string): boolean => {
  return pathname === href || pathname.startsWith(href + '/')
}