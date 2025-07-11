import React, { memo, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, DollarSign, Users, Edit, Trash2, Copy } from 'lucide-react'
import { useMemoWithCache } from '@/hooks/usePerformanceOptimization'

interface Service {
  id: number
  name: string
  description?: string
  price: number
  duration: number
  category: string
  is_active: boolean
  max_clients?: number
  is_package?: boolean
}

interface OptimizedServiceCardProps {
  service: Service
  onEdit?: (service: Service) => void
  onDelete?: (id: number) => void
  onDuplicate?: (service: Service) => void
  className?: string
}

// Memoized price formatter
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

// Memoized duration formatter
const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
  return `${mins}m`
}

// Memoized sub-components
const ServiceActions = memo(({ 
  onEdit, 
  onDelete, 
  onDuplicate,
  service 
}: {
  onEdit?: () => void
  onDelete?: () => void
  onDuplicate?: () => void
  service: Service
}) => {
  if (!onEdit && !onDelete && !onDuplicate) return null
  
  return (
    <div className="flex gap-1">
      {onDuplicate && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDuplicate}
          className="h-8 w-8"
        >
          <Copy className="h-4 w-4" />
        </Button>
      )}
      {onEdit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="h-8 w-8"
        >
          <Edit className="h-4 w-4" />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-8 w-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
})

ServiceActions.displayName = 'ServiceActions'

const ServiceMetadata = memo(({ 
  duration, 
  price, 
  maxClients 
}: {
  duration: number
  price: number
  maxClients?: number
}) => {
  const formattedPrice = useMemo(() => formatPrice(price), [price])
  const formattedDuration = useMemo(() => formatDuration(duration), [duration])
  
  return (
    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-1">
        <Clock className="h-4 w-4" />
        <span>{formattedDuration}</span>
      </div>
      <div className="flex items-center gap-1">
        <DollarSign className="h-4 w-4" />
        <span className="font-medium text-foreground">{formattedPrice}</span>
      </div>
      {maxClients && maxClients > 1 && (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          <span>Up to {maxClients}</span>
        </div>
      )}
    </div>
  )
})

ServiceMetadata.displayName = 'ServiceMetadata'

const ServiceBadges = memo(({ 
  category, 
  isPackage, 
  isActive 
}: {
  category: string
  isPackage?: boolean
  isActive: boolean
}) => {
  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="text-xs">
        {category}
      </Badge>
      {isPackage && (
        <Badge variant="outline" className="text-xs">
          Package
        </Badge>
      )}
      {!isActive && (
        <Badge variant="destructive" className="text-xs">
          Inactive
        </Badge>
      )}
    </div>
  )
})

ServiceBadges.displayName = 'ServiceBadges'

// Main component with memoization
export const OptimizedServiceCard = memo(function OptimizedServiceCard({
  service,
  onEdit,
  onDelete,
  onDuplicate,
  className = '',
}: OptimizedServiceCardProps) {
  // Memoize callbacks
  const handleEdit = useCallback(() => {
    onEdit?.(service)
  }, [onEdit, service])
  
  const handleDelete = useCallback(() => {
    onDelete?.(service.id)
  }, [onDelete, service.id])
  
  const handleDuplicate = useCallback(() => {
    onDuplicate?.(service)
  }, [onDuplicate, service])
  
  // Memoize card classes
  const cardClasses = useMemoWithCache(
    () => `transition-all duration-200 hover:shadow-md ${!service.is_active ? 'opacity-60' : ''} ${className}`,
    [service.is_active, className],
    `card-class-${service.id}`
  )
  
  return (
    <Card className={cardClasses}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{service.name}</CardTitle>
            {service.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {service.description}
              </CardDescription>
            )}
          </div>
          <ServiceActions
            onEdit={onEdit ? handleEdit : undefined}
            onDelete={onDelete ? handleDelete : undefined}
            onDuplicate={onDuplicate ? handleDuplicate : undefined}
            service={service}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ServiceMetadata
          duration={service.duration}
          price={service.price}
          maxClients={service.max_clients}
        />
        <ServiceBadges
          category={service.category}
          isPackage={service.is_package}
          isActive={service.is_active}
        />
      </CardContent>
    </Card>
  )
})

// Export a list component that uses virtualization for large lists
export const OptimizedServiceList = memo(function OptimizedServiceList({
  services,
  onEdit,
  onDelete,
  onDuplicate,
  className = '',
}: {
  services: Service[]
  onEdit?: (service: Service) => void
  onDelete?: (id: number) => void
  onDuplicate?: (service: Service) => void
  className?: string
}) {
  // Group services by category for better performance
  const groupedServices = useMemoWithCache(
    () => {
      const groups: Record<string, Service[]> = {}
      services.forEach(service => {
        if (!groups[service.category]) {
          groups[service.category] = []
        }
        groups[service.category].push(service)
      })
      return groups
    },
    [services],
    'grouped-services'
  )
  
  return (
    <div className={`space-y-6 ${className}`}>
      {Object.entries(groupedServices).map(([category, categoryServices]) => (
        <div key={category}>
          <h3 className="text-lg font-semibold mb-3 capitalize">{category}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryServices.map(service => (
              <OptimizedServiceCard
                key={service.id}
                service={service}
                onEdit={onEdit}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
})