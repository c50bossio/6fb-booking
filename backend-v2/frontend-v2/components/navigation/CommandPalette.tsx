'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  MagnifyingGlassIcon,
  CommandLineIcon,
  ChevronRightIcon,
  ClockIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { Portal } from '@/components/ui/Portal'
import { useThemeStyles } from '@/hooks/useTheme'
import { navigation, type NavigationItem, type QuickAction } from '@/lib/navigation'
import { type User } from '@/lib/api'
import { useNavigationFavorites } from '@/hooks/useNavigationFavorites'
import { useNavigationTracking } from '@/hooks/useNavigationTracking'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
}

interface SearchResult {
  type: 'navigation' | 'action' | 'favorite' | 'recent'
  item: NavigationItem | QuickAction
  href: string
  name: string
  description?: string
  score: number
}

// Simple fuzzy search function
function fuzzySearch(query: string, text: string): number {
  const queryLower = query.toLowerCase()
  const textLower = text.toLowerCase()
  
  // Exact match gets highest score
  if (textLower === queryLower) return 100
  
  // Starts with gets high score
  if (textLower.startsWith(queryLower)) return 90
  
  // Contains gets medium score
  if (textLower.includes(queryLower)) return 70
  
  // Fuzzy match - check if all characters exist in order
  let queryIndex = 0
  let score = 0
  
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++
      score += 10
    }
  }
  
  return queryIndex === queryLower.length ? score : 0
}

export function CommandPalette({ isOpen, onClose, user }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { colors } = useThemeStyles()
  
  const favorites = useNavigationFavorites()
  const tracking = useNavigationTracking()

  // Get filtered navigation items based on user role
  const allNavigationItems = useMemo(() => {
    return navigation.filterByRole(navigation.items, user?.role)
  }, [user?.role])

  // Get quick actions for user role
  const quickActions = useMemo(() => {
    return navigation.getQuickActions(user?.role)
  }, [user?.role])

  // Search results
  const searchResults = useMemo(() => {
    if (!query.trim()) {
      // Show recent and favorites when no query
      const recentItems = tracking.getRecentlyUsed().slice(0, 5)
      const favoriteItems = favorites.favorites.slice(0, 5)
      
      const results: SearchResult[] = []
      
      // Add favorites
      favoriteItems.forEach(fav => {
        const navItem = allNavigationItems.find(item => item.href === fav.href)
        if (navItem) {
          results.push({
            type: 'favorite',
            item: navItem,
            href: fav.href,
            name: fav.name,
            description: navItem.description,
            score: 100
          })
        }
      })
      
      // Add recent items
      recentItems.forEach(recent => {
        const navItem = allNavigationItems.find(item => item.href === recent.href)
        if (navItem && !results.some(r => r.href === recent.href)) {
          results.push({
            type: 'recent',
            item: navItem,
            href: recent.href,
            name: recent.name,
            description: navItem.description,
            score: 90
          })
        }
      })
      
      return results.slice(0, 8)
    }

    const results: SearchResult[] = []
    
    // Search navigation items (including children)
    const searchInNavigation = (items: NavigationItem[], level = 0) => {
      items.forEach(item => {
        const nameScore = fuzzySearch(query, item.name)
        const descScore = item.description ? fuzzySearch(query, item.description) : 0
        const maxScore = Math.max(nameScore, descScore)
        
        if (maxScore > 0) {
          results.push({
            type: 'navigation',
            item,
            href: item.href,
            name: item.name,
            description: item.description,
            score: maxScore + (level === 0 ? 10 : 0) // Boost top-level items
          })
        }
        
        // Search children
        if (item.children) {
          searchInNavigation(item.children, level + 1)
        }
      })
    }
    
    searchInNavigation(allNavigationItems)
    
    // Search quick actions
    quickActions.forEach(action => {
      const nameScore = fuzzySearch(query, action.name)
      const descScore = fuzzySearch(query, action.description)
      const maxScore = Math.max(nameScore, descScore)
      
      if (maxScore > 0) {
        results.push({
          type: 'action',
          item: action,
          href: action.href,
          name: action.name,
          description: action.description,
          score: maxScore + 5 // Boost actions slightly
        })
      }
    })
    
    // Sort by score and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }, [query, allNavigationItems, quickActions, favorites.favorites, tracking])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (searchResults[selectedIndex]) {
            handleSelect(searchResults[selectedIndex])
          }
          break
        case 'Escape':
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, searchResults, selectedIndex, onClose])

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Update selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchResults])

  // Handle result selection
  const handleSelect = (result: SearchResult) => {
    // Track navigation
    if (tracking.isLoaded && result.type === 'navigation') {
      tracking.trackNavigation(result.href, result.name)
    }
    
    // Navigate
    router.push(result.href)
    onClose()
  }

  // Render result type icon
  const renderResultIcon = (result: SearchResult) => {
    const iconClass = "w-5 h-5 mr-3 flex-shrink-0"
    
    switch (result.type) {
      case 'favorite':
        return <StarIcon className={`${iconClass} text-yellow-500`} />
      case 'recent':
        return <ClockIcon className={`${iconClass} text-gray-500`} />
      case 'action':
        return <CommandLineIcon className={`${iconClass} text-blue-500`} />
      default:
        if ('icon' in result.item) {
          const IconComponent = result.item.icon
          return <IconComponent className={`${iconClass} text-gray-600 dark:text-gray-400`} />
        }
        return null
    }
  }

  if (!isOpen) return null

  return (
    <Portal>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Command Palette */}
      <div className="fixed top-[20vh] left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl mx-auto px-4">
        <div className={`
          ${colors.background.card} rounded-xl shadow-2xl border ${colors.border.default}
          overflow-hidden backdrop-blur-xl bg-white/95 dark:bg-gray-900/95
        `}>
          {/* Search Input */}
          <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 mr-3" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search pages, actions, and features..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 outline-none text-lg"
              style={{ fontSize: '16px' }} // Prevent zoom on iOS
            />
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">↑↓</kbd>
              <span>navigate</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">↵</kbd>
              <span>select</span>
            </div>
          </div>
          
          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {searchResults.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                {query ? 'No results found' : 'Start typing to search...'}
              </div>
            ) : (
              <div className="py-2">
                {!query && (
                  <>
                    {/* Show section headers when no query */}
                    {searchResults.some(r => r.type === 'favorite') && (
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Favorites
                      </div>
                    )}
                    {searchResults.filter(r => r.type === 'favorite').map((result, index) => (
                      <div
                        key={`${result.type}-${result.href}`}
                        onClick={() => handleSelect(result)}
                        className={`
                          flex items-center px-4 py-3 cursor-pointer transition-colors duration-150
                          ${index === selectedIndex ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}
                        `}
                      >
                        {renderResultIcon(result)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {result.name}
                          </div>
                          {result.description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {result.description}
                            </div>
                          )}
                        </div>
                        <ChevronRightIcon className="w-4 h-4 text-gray-400 ml-2" />
                      </div>
                    ))}
                    
                    {searchResults.some(r => r.type === 'recent') && (
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-t border-gray-200 dark:border-gray-700 mt-2">
                        Recent
                      </div>
                    )}
                    {searchResults.filter(r => r.type === 'recent').map((result, baseIndex) => {
                      const index = baseIndex + searchResults.filter(r => r.type === 'favorite').length
                      return (
                        <div
                          key={`${result.type}-${result.href}`}
                          onClick={() => handleSelect(result)}
                          className={`
                            flex items-center px-4 py-3 cursor-pointer transition-colors duration-150
                            ${index === selectedIndex ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}
                          `}
                        >
                          {renderResultIcon(result)}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {result.name}
                            </div>
                            {result.description && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {result.description}
                              </div>
                            )}
                          </div>
                          <ChevronRightIcon className="w-4 h-4 text-gray-400 ml-2" />
                        </div>
                      )
                    })}
                  </>
                )}
                
                {/* Show all results when there's a query */}
                {query && searchResults.map((result, index) => (
                  <div
                    key={`${result.type}-${result.href}-${index}`}
                    onClick={() => handleSelect(result)}
                    className={`
                      flex items-center px-4 py-3 cursor-pointer transition-colors duration-150
                      ${index === selectedIndex ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}
                    `}
                  >
                    {renderResultIcon(result)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {result.name}
                      </div>
                      {result.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {result.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {result.type === 'favorite' && <StarIcon className="w-3 h-3 text-yellow-500" />}
                      {result.type === 'recent' && <ClockIcon className="w-3 h-3 text-gray-400" />}
                      <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Use ↑↓ to navigate, ↵ to select, ESC to close</span>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">⌘K</kbd>
                <span>to open</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}