'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { getQuickActionsForRole, type QuickAction } from '@/lib/navigation'

interface QuickActionsProps {
  userRole?: string | null
  className?: string
}

export function QuickActions({ userRole, className = '' }: QuickActionsProps) {
  const router = useRouter()
  const quickActions = getQuickActionsForRole(userRole)

  // Don't render if no quick actions are available
  if (!quickActions || quickActions.length === 0) {
    return null
  }

  // Limit to 4 quick actions for optimal grid layout
  const displayedActions = quickActions.slice(0, 4)

  const handleActionClick = (action: QuickAction) => {
    router.push(action.href)
  }

  return (
    <div className={`animate-ios-fade ${className}`}>
      <Card 
        variant="default" 
        padding="lg"
        className="backdrop-blur-2xl"
      >
        <CardContent className="p-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 tracking-tight">
            Quick Actions
          </h2>
          
          <div className={`grid gap-4 ${displayedActions.length === 2 ? 'grid-cols-2' : displayedActions.length === 3 ? 'grid-cols-3 max-w-2xl' : 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4'}`}>
            {displayedActions.map((action, index) => {
              const Icon = action.icon
              const isPrimary = action.color === 'primary'
              
              // Generate unique key combining href and index to prevent duplicates
              const uniqueKey = `${action.href}-${index}`
              
              return (
                <div
                  key={uniqueKey}
                  className="animate-ios-fade-scale"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <button
                    onClick={() => handleActionClick(action)}
                    className={`
                      group relative w-full p-6 rounded-2xl text-left transition-all duration-300
                      ${isPrimary 
                        ? 'bg-gradient-to-br from-primary-500/90 to-primary-600/90 hover:from-primary-600 hover:to-primary-700 shadow-lg hover:shadow-xl text-white' 
                        : 'bg-white/50 dark:bg-gray-800/50 hover:bg-white/70 dark:hover:bg-gray-700/70 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 hover:border-primary-300/50 dark:hover:border-primary-500/50'
                      }
                      transform-gpu hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98]
                    `}
                  >
                    {/* Gradient overlay for depth */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    
                    {/* Icon container */}
                    <div className={`
                      inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4
                      ${isPrimary 
                        ? 'bg-white/20 backdrop-blur-sm' 
                        : 'bg-gradient-to-br from-primary-500/10 to-primary-600/10 dark:from-primary-400/20 dark:to-primary-500/20'
                      }
                      group-hover:scale-110 transition-transform duration-300
                    `}>
                      <Icon className={`
                        w-6 h-6 
                        ${isPrimary 
                          ? 'text-white' 
                          : 'text-primary-600 dark:text-primary-400'
                        }
                      `} />
                    </div>
                    
                    {/* Text content */}
                    <div className="relative z-10">
                      <h3 className={`
                        font-semibold text-base mb-1
                        ${isPrimary 
                          ? 'text-white' 
                          : 'text-gray-900 dark:text-white'
                        }
                      `}>
                        {action.name}
                      </h3>
                      <p className={`
                        text-sm leading-relaxed
                        ${isPrimary 
                          ? 'text-white/80' 
                          : 'text-gray-600 dark:text-gray-400'
                        }
                      `}>
                        {action.description}
                      </p>
                    </div>
                    
                    {/* Hover indicator */}
                    <div className={`
                      absolute bottom-4 right-4 w-6 h-6 rounded-full
                      ${isPrimary 
                        ? 'bg-white/20' 
                        : 'bg-primary-500/10 dark:bg-primary-400/20'
                      }
                      flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300
                    `}>
                      <svg className={`w-4 h-4 ${isPrimary ? 'text-white' : 'text-primary-600 dark:text-primary-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    
                    {/* Shimmer effect for primary actions */}
                    {isPrimary && (
                      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      </div>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default QuickActions