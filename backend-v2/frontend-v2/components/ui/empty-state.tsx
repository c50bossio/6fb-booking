import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
  children?: React.ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  children
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center py-12 px-4',
      className
    )}>
      {Icon && (
        <div className="mb-4 rounded-full bg-gray-100 dark:bg-gray-800 p-3">
          <Icon className="h-8 w-8 text-gray-400 dark:text-gray-600" />
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
          {description}
        </p>
      )}
      
      {children}
      
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
            >
              {action.label}
            </Button>
          )}
          
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Pre-configured empty states for common scenarios

import { 
  UserGroupIcon, 
  CalendarIcon, 
  ChartBarIcon, 
  DocumentTextIcon,
  ShoppingBagIcon,
  InboxIcon,
  MagnifyingGlassIcon,
  FolderIcon,
  CreditCardIcon,
  BellIcon
} from '@heroicons/react/24/outline'

export function EmptyClients({ onAddClient }: { onAddClient: () => void }) {
  return (
    <EmptyState
      icon={UserGroupIcon}
      title="No clients yet"
      description="Start building your client base by adding your first client."
      action={{
        label: "Add Your First Client",
        onClick: onAddClient
      }}
    />
  )
}

export function EmptyAppointments({ onBookAppointment }: { onBookAppointment: () => void }) {
  return (
    <EmptyState
      icon={CalendarIcon}
      title="No appointments scheduled"
      description="Your calendar is empty. Start booking appointments to grow your business."
      action={{
        label: "Book Appointment",
        onClick: onBookAppointment
      }}
    />
  )
}

export function EmptyAnalytics() {
  return (
    <EmptyState
      icon={ChartBarIcon}
      title="No data to display"
      description="Analytics will appear here once you start booking appointments and processing payments."
    />
  )
}

export function EmptyProducts({ onAddProduct }: { onAddProduct: () => void }) {
  return (
    <EmptyState
      icon={ShoppingBagIcon}
      title="No products added"
      description="Add products to sell in your barbershop and increase revenue."
      action={{
        label: "Add Your First Product",
        onClick: onAddProduct
      }}
    />
  )
}

export function EmptyServices({ onAddService }: { onAddService: () => void }) {
  return (
    <EmptyState
      icon={DocumentTextIcon}
      title="No services created"
      description="Define the services you offer to start accepting bookings."
      action={{
        label: "Create Your First Service",
        onClick: onAddService
      }}
    />
  )
}

export function EmptyInbox() {
  return (
    <EmptyState
      icon={InboxIcon}
      title="All caught up!"
      description="You have no new notifications or messages."
    />
  )
}

export function EmptySearchResults({ searchTerm, onClear }: { searchTerm: string; onClear: () => void }) {
  return (
    <EmptyState
      icon={MagnifyingGlassIcon}
      title="No results found"
      description={`We couldn't find anything matching "${searchTerm}". Try adjusting your search.`}
      action={{
        label: "Clear Search",
        onClick: onClear,
        variant: "outline"
      }}
    />
  )
}

export function EmptyFolder() {
  return (
    <EmptyState
      icon={FolderIcon}
      title="This folder is empty"
      description="Upload files or move items here to get started."
    />
  )
}

export function EmptyTransactions() {
  return (
    <EmptyState
      icon={CreditCardIcon}
      title="No transactions yet"
      description="Transaction history will appear here once you start processing payments."
    />
  )
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon={BellIcon}
      title="No notifications"
      description="You're all caught up! Check back later for updates."
    />
  )
}