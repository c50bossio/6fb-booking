'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { 
  MapPin, 
  Star, 
  Clock, 
  Scissors,
  User
} from 'lucide-react'

// Extended Barber interface for profile display
export interface BarberProfile {
  id: number
  first_name: string
  last_name: string
  email: string
  bio?: string
  profileImageUrl?: string
  specialties: string[]
  experienceLevel?: 'junior' | 'mid' | 'senior' | 'expert'
  hourlyRate?: number
  location?: string
  rating?: number
  totalReviews?: number
  isActive?: boolean
  socialMedia?: {
    instagram?: string
    facebook?: string
    twitter?: string
  }
  nextAvailableSlot?: string
  responseTime?: string
}

interface BarberCardProps {
  barber: BarberProfile
  className?: string
  showBookButton?: boolean
  showAvailability?: boolean
  variant?: 'default' | 'compact' | 'featured'
  onClick?: () => void
}

const experienceLevels = {
  junior: { label: 'Junior', color: 'bg-blue-100 text-blue-800' },
  mid: { label: 'Mid-level', color: 'bg-green-100 text-green-800' },
  senior: { label: 'Senior', color: 'bg-purple-100 text-purple-800' },
  expert: { label: 'Expert', color: 'bg-yellow-100 text-yellow-800' }
}

export const BarberCard: React.FC<BarberCardProps> = ({
  barber,
  className,
  showBookButton = true,
  showAvailability = true,
  variant = 'default',
  onClick
}) => {
  const fullName = `${barber.first_name} ${barber.last_name}`
  const experienceLevel = barber.experienceLevel ? experienceLevels[barber.experienceLevel] : null

  const cardContent = (
    <>
      <CardContent className={cn(
        variant === 'compact' ? 'p-4' : 'p-6'
      )}>
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <Avatar className={cn(
              'border-2 border-gray-200',
              variant === 'featured' ? 'h-20 w-20' : variant === 'compact' ? 'h-12 w-12' : 'h-16 w-16'
            )}>
              <AvatarImage 
                src={barber.profileImageUrl} 
                alt={`${fullName} profile`}
              />
              <AvatarFallback className="bg-gray-100">
                <User className={cn(
                  'text-gray-600',
                  variant === 'featured' ? 'h-10 w-10' : variant === 'compact' ? 'h-6 w-6' : 'h-8 w-8'
                )} />
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className={cn(
                'font-semibold text-gray-900 truncate',
                variant === 'featured' ? 'text-xl' : variant === 'compact' ? 'text-base' : 'text-lg'
              )}>
                {fullName}
              </h3>
              {!barber.isActive && (
                <Badge variant="secondary" className="text-xs">
                  Away
                </Badge>
              )}
            </div>

            {/* Rating */}
            {barber.rating && variant !== 'compact' && (
              <div className="flex items-center gap-1 mb-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium text-gray-700">
                  {barber.rating.toFixed(1)}
                </span>
                {barber.totalReviews && (
                  <span className="text-sm text-gray-500">
                    ({barber.totalReviews} reviews)
                  </span>
                )}
              </div>
            )}

            {/* Bio */}
            {barber.bio && variant !== 'compact' && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {barber.bio}
              </p>
            )}

            {/* Specialties */}
            {barber.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {barber.specialties.slice(0, variant === 'compact' ? 2 : 4).map((specialty) => (
                  <Badge 
                    key={specialty} 
                    variant="outline" 
                    className="text-xs"
                  >
                    {specialty}
                  </Badge>
                ))}
                {barber.specialties.length > (variant === 'compact' ? 2 : 4) && (
                  <Badge variant="outline" className="text-xs text-gray-500">
                    +{barber.specialties.length - (variant === 'compact' ? 2 : 4)} more
                  </Badge>
                )}
              </div>
            )}

            {/* Experience and Rate */}
            <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
              {experienceLevel && (
                <div className="flex items-center gap-1">
                  <Scissors className="h-4 w-4" />
                  <Badge className={cn('text-xs', experienceLevel.color)}>
                    {experienceLevel.label}
                  </Badge>
                </div>
              )}
              {barber.hourlyRate && variant !== 'compact' && (
                <span>From ${barber.hourlyRate}/hr</span>
              )}
            </div>

            {/* Location */}
            {barber.location && variant !== 'compact' && (
              <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                <MapPin className="h-4 w-4" />
                <span>{barber.location}</span>
              </div>
            )}

            {/* Availability */}
            {showAvailability && barber.nextAvailableSlot && (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <Clock className="h-4 w-4" />
                <span>Next: {barber.nextAvailableSlot}</span>
              </div>
            )}

            {/* Response Time */}
            {barber.responseTime && variant === 'featured' && (
              <div className="text-xs text-gray-500 mt-2">
                Usually responds in {barber.responseTime}
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Footer with actions */}
      {showBookButton && (
        <CardFooter className={cn(
          'border-t bg-gray-50/50',
          variant === 'compact' ? 'p-3' : 'p-4'
        )}>
          <div className="flex items-center justify-between w-full gap-2">
            <Button 
              variant="outline" 
              size="sm"
              asChild
            >
              <Link href={`/barbers/${barber.id}`}>
                View Profile
              </Link>
            </Button>
            
            <Button 
              size="sm"
              disabled={!barber.isActive}
              asChild={barber.isActive}
            >
              {barber.isActive ? (
                <Link href={`/book?barber=${barber.id}`}>
                  Book Now
                </Link>
              ) : (
                <span>Unavailable</span>
              )}
            </Button>
          </div>
        </CardFooter>
      )}
    </>
  )

  if (onClick) {
    return (
      <Card 
        className={cn(
          'hover:shadow-md transition-shadow cursor-pointer',
          variant === 'featured' && 'border-2 border-blue-200 shadow-lg',
          className
        )}
        interactive
        onClick={onClick}
        ariaLabel={`View ${fullName}'s profile`}
      >
        {cardContent}
      </Card>
    )
  }

  return (
    <Card className={cn(
      'hover:shadow-md transition-shadow',
      variant === 'featured' && 'border-2 border-blue-200 shadow-lg',
      className
    )}>
      {cardContent}
    </Card>
  )
}

export default BarberCard