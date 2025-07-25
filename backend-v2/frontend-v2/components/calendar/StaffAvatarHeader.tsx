'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { FreshaColors, FreshaTypography, FreshaSpacing, FreshaBorderRadius } from '@/lib/fresha-design-system'

interface StaffAvatarHeaderProps {
  barber: {
    id: number
    name?: string
    first_name?: string
    last_name?: string
    email: string
    avatar?: string
    specialties?: string[]
    role?: string
  }
  availability: 'available' | 'busy' | 'break' | 'off'
  appointmentCount: number
  todayRevenue: number
  isSelected?: boolean
  onClick?: () => void
  showRevenue?: boolean
  showAppointmentCount?: boolean
}

const StaffAvatarHeader: React.FC<StaffAvatarHeaderProps> = ({
  barber,
  availability,
  appointmentCount,
  todayRevenue,
  isSelected = false,
  onClick,
  showRevenue = true,
  showAppointmentCount = true
}) => {
  // Get display name
  const getDisplayName = () => {
    if (barber.name) return barber.name
    if (barber.first_name && barber.last_name) {
      return `${barber.first_name} ${barber.last_name}`
    }
    if (barber.first_name) return barber.first_name
    return barber.email.split('@')[0]
  }

  // Get initials for avatar fallback
  const getInitials = () => {
    const name = getDisplayName()
    const words = name.split(' ')
    if (words.length >= 2) {
      return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Get availability color and status
  const getAvailabilityStyle = () => {
    switch (availability) {
      case 'available':
        return {
          color: FreshaColors.status.confirmed.main,
          backgroundColor: FreshaColors.status.confirmed.light,
          text: 'Available'
        }
      case 'busy':
        return {
          color: FreshaColors.status.pending.main,
          backgroundColor: FreshaColors.status.pending.light,
          text: 'Busy'
        }
      case 'break':
        return {
          color: FreshaColors.gray[600],
          backgroundColor: FreshaColors.gray[100],
          text: 'On Break'
        }
      case 'off':
        return {
          color: FreshaColors.status.cancelled.main,
          backgroundColor: FreshaColors.status.cancelled.light,
          text: 'Off Duty'
        }
      default:
        return {
          color: FreshaColors.gray[500],
          backgroundColor: FreshaColors.gray[100],
          text: 'Unknown'
        }
    }
  }

  const availabilityStyle = getAvailabilityStyle()

  return (
    <div 
      className={`
        relative flex flex-col items-center p-4 border-b border-r transition-all duration-200
        ${isSelected 
          ? 'bg-blue-50 border-blue-200 shadow-sm' 
          : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
        }
        ${onClick ? 'cursor-pointer' : ''}
      `}
      onClick={onClick}
      style={{
        minWidth: '200px',
        borderColor: isSelected ? FreshaColors.primary[200] : FreshaColors.border.light,
        backgroundColor: isSelected ? FreshaColors.primary[50] : FreshaColors.background.secondary
      }}
    >
      {/* Barber Avatar */}
      <div className="relative mb-3">
        <div 
          className="flex items-center justify-center text-white font-semibold shadow-sm border-2 border-white"
          style={{
            width: '48px',
            height: '48px',
            borderRadius: FreshaBorderRadius.full,
            backgroundColor: barber.avatar ? 'transparent' : FreshaColors.primary[500],
            fontSize: FreshaTypography.fontSize.sm,
            fontWeight: FreshaTypography.fontWeight.semibold
          }}
        >
          {barber.avatar ? (
            <img 
              src={barber.avatar} 
              alt={getDisplayName()}
              className="w-full h-full object-cover"
              style={{ borderRadius: FreshaBorderRadius.full }}
            />
          ) : (
            getInitials()
          )}
        </div>
        
        {/* Availability Indicator */}
        <div 
          className="absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white shadow-sm"
          style={{
            backgroundColor: availabilityStyle.color,
            borderRadius: FreshaBorderRadius.full
          }}
          title={availabilityStyle.text}
        />
      </div>

      {/* Barber Name */}
      <h3 
        className="font-semibold text-center mb-1 truncate max-w-full"
        style={{
          fontSize: FreshaTypography.fontSize.sm,
          fontWeight: FreshaTypography.fontWeight.semibold,
          color: FreshaColors.gray[900],
          lineHeight: FreshaTypography.lineHeight.tight
        }}
      >
        {getDisplayName()}
      </h3>

      {/* Role/Specialties */}
      {barber.role && (
        <p 
          className="text-center text-xs mb-2 truncate max-w-full"
          style={{
            color: FreshaColors.gray[600],
            fontSize: FreshaTypography.fontSize.xs
          }}
        >
          {barber.role}
        </p>
      )}

      {/* Statistics Row */}
      <div className="flex items-center justify-center space-x-3 w-full">
        {/* Appointment Count */}
        {showAppointmentCount && (
          <div className="flex flex-col items-center">
            <span 
              className="font-semibold"
              style={{
                fontSize: FreshaTypography.fontSize.sm,
                color: FreshaColors.gray[900]
              }}
            >
              {appointmentCount}
            </span>
            <span 
              className="text-xs"
              style={{
                color: FreshaColors.gray[500],
                fontSize: '10px'
              }}
            >
              {appointmentCount === 1 ? 'Appt' : 'Appts'}
            </span>
          </div>
        )}

        {/* Revenue */}
        {showRevenue && (
          <div className="flex flex-col items-center">
            <span 
              className="font-semibold"
              style={{
                fontSize: FreshaTypography.fontSize.sm,
                color: FreshaColors.services.styling.dark
              }}
            >
              ${todayRevenue.toFixed(0)}
            </span>
            <span 
              className="text-xs"
              style={{
                color: FreshaColors.gray[500],
                fontSize: '10px'
              }}
            >
              Today
            </span>
          </div>
        )}
      </div>

      {/* Availability Status Badge */}
      <div className="mt-2">
        <Badge 
          variant="secondary"
          className="text-xs px-2 py-1"
          style={{
            backgroundColor: availabilityStyle.backgroundColor,
            color: availabilityStyle.color,
            border: `1px solid ${availabilityStyle.color}20`,
            fontSize: '10px',
            fontWeight: FreshaTypography.fontWeight.medium
          }}
        >
          {availabilityStyle.text}
        </Badge>
      </div>

      {/* Specialties (if available) */}
      {barber.specialties && barber.specialties.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 justify-center max-w-full">
          {barber.specialties.slice(0, 2).map((specialty, index) => (
            <Badge 
              key={index}
              variant="outline"
              className="text-xs px-1 py-0"
              style={{
                fontSize: '9px',
                color: FreshaColors.gray[600],
                borderColor: FreshaColors.gray[300],
                backgroundColor: 'transparent'
              }}
            >
              {specialty}
            </Badge>
          ))}
          {barber.specialties.length > 2 && (
            <Badge 
              variant="outline"
              className="text-xs px-1 py-0"
              style={{
                fontSize: '9px',
                color: FreshaColors.gray[500],
                borderColor: FreshaColors.gray[300],
                backgroundColor: 'transparent'
              }}
            >
              +{barber.specialties.length - 2}
            </Badge>
          )}
        </div>
      )}

      {/* Selection Indicator */}
      {isSelected && (
        <div 
          className="absolute top-0 left-0 w-full h-1"
          style={{
            backgroundColor: FreshaColors.primary[500]
          }}
        />
      )}
    </div>
  )
}

export default StaffAvatarHeader