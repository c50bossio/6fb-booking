'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline'
import { navigationItems } from '@/lib/navigation'

interface BreadcrumbItem {
  label: string
  href: string
  isLast?: boolean
}

export function Breadcrumb() {
  const pathname = usePathname()
  
  // Don't show breadcrumbs on homepage or login pages
  if (pathname === '/' || pathname === '/dashboard' || pathname.includes('/login')) {
    return null
  }

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Dashboard', href: '/dashboard' }
    ]

    // Find matching navigation items for better labels
    const findNavItem = (href: string) => {
      // Check main navigation items
      for (const item of navigationItems) {
        if (item.href === href) return item
        // Check children
        if (item.children) {
          for (const child of item.children) {
            if (child.href === href) return child
          }
        }
      }
      return null
    }

    let currentPath = ''
    paths.forEach((path, index) => {
      currentPath += `/${path}`
      
      // Try to find a matching navigation item for better label
      const navItem = findNavItem(currentPath)
      
      let label = navItem?.name || path
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

      // Special case handling for nested paths
      if (path === 'settings' && paths[index + 1]) {
        label = 'Settings'
      } else if (path === 'barber' && paths[index + 1] === 'earnings') {
        label = 'Barber'
      } else if (path === 'earnings' && paths[index - 1] === 'barber') {
        label = 'Earnings'
      } else if (path === 'finance' && paths[index + 1] === 'analytics') {
        label = 'Finance'
      } else if (path === 'analytics' && paths[index - 1] === 'finance') {
        label = 'Financial Analytics'
      }

      breadcrumbs.push({
        label,
        href: currentPath,
        isLast: index === paths.length - 1
      })
    })

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center">
            {index === 0 ? (
              <Link
                href={crumb.href}
                className="text-gray-500 hover:text-gray-700 flex items-center"
              >
                <HomeIcon className="h-4 w-4 mr-1" />
                {crumb.label}
              </Link>
            ) : (
              <>
                <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-2" />
                {crumb.isLast ? (
                  <span className="text-gray-900 font-medium">{crumb.label}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {crumb.label}
                  </Link>
                )}
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}