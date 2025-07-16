import React from 'react'
import { Button } from './Button'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon | React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode | {
    label: string
    onClick: () => void
    variant?: 'primary' | 'outline' | 'secondary' | 'ghost' | 'destructive'
  }
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon, 
  title, 
  description, 
  action,
  className = '' 
}) => {
  const renderIcon = () => {
    if (!icon) return null
    
    // If it's a Lucide icon component
    if (typeof icon === 'function') {
      const IconComponent = icon as LucideIcon
      return (
        <div className="mx-auto w-12 h-12 mb-4 text-gray-400 dark:text-gray-600">
          <IconComponent className="w-full h-full" />
        </div>
      )
    }
    
    // If it's a React element (like SVG)
    if (React.isValidElement(icon)) {
      return (
        <div className="mx-auto w-12 h-12 mb-4 text-gray-400 dark:text-gray-600 flex items-center justify-center">
          {React.cloneElement(icon as React.ReactElement, {
            className: 'w-8 h-8'
          })}
        </div>
      )
    }
    
    return null
  }

  const renderAction = () => {
    if (!action) return null
    
    // If it's already a React element, render it directly
    if (React.isValidElement(action)) {
      return action
    }
    
    // If it's an action object, render as Button
    if (typeof action === 'object' && 'label' in action) {
      return (
        <Button
          onClick={action.onClick}
          variant={action.variant || 'primary'}
        >
          {action.label}
        </Button>
      )
    }
    
    return null
  }
  
  return (
    <div className={`text-center py-12 px-6 ${className}`}>
      {renderIcon()}
      
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      
      {renderAction()}
    </div>
  )
}