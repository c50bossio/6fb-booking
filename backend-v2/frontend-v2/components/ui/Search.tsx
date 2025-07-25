/**
 * Search component with autocomplete and results dropdown
 * 
 * Provides a complete search experience with suggestions, recent items, and results
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  MagnifyingGlassIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useSearch } from '@/hooks/useSearch'
import type { SearchResult } from '@/lib/api/search'

interface SearchProps {
  placeholder?: string
  className?: string
  onResultSelect?: (result: SearchResult) => void
  category?: string
  showRecentItems?: boolean
  maxResults?: number
}

export function Search({
  placeholder = "Search bookings, clients...",
  className = "",
  onResultSelect,
  category,
  showRecentItems = true,
  maxResults = 10
}: SearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const {
    query,
    setQuery,
    results,
    suggestions,
    recentItems,
    isLoading,
    error,
    selectResult,
    clearSearch,
    totalResults,
    searchTime
  } = useSearch({
    debounceMs: 300,
    minQueryLength: 1,
    maxSuggestions: 5,
    searchLimit: maxResults,
    category
  })
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setSelectedIndex(-1)
    setIsOpen(value.length > 0 || showRecentItems)
  }
  
  // Handle input focus
  const handleInputFocus = () => {
    setIsOpen(query.length > 0 || showRecentItems)
  }
  
  // Handle result selection
  const handleResultSelect = (result: SearchResult) => {
    selectResult(result)
    onResultSelect?.(result)
    setIsOpen(false)
    setQuery('')
  }
  
  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion)
    inputRef.current?.focus()
  }
  
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const allItems = [
      ...suggestions.map(s => ({ type: 'suggestion', value: s })),
      ...results,
      ...(showRecentItems && query.length === 0 ? recentItems : [])
    ]
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, allItems.length - 1))
        break
        
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, -1))
        break
        
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < allItems.length) {
          const item = allItems[selectedIndex]
          if ('type' in item && item.type === 'suggestion') {
            handleSuggestionSelect(item.value)
          } else {
            handleResultSelect(item as SearchResult)
          }
        }
        break
        
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }
  
  // Handle clear button
  const handleClear = () => {
    clearSearch()
    setIsOpen(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Get result icon
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <CalendarIcon className="w-4 h-4" />
      case 'client':
        return <UserIcon className="w-4 h-4" />
      default:
        return <MagnifyingGlassIcon className="w-4 h-4" />
    }
  }
  
  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`
            block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
            placeholder-gray-500 dark:placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            text-sm transition-colors duration-200
          `}
        />
        
        {/* Clear Button */}
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
          </button>
        )}
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
          </div>
        )}
      </div>
      
      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
          {/* Error State */}
          {error && (
            <div className="p-3 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          
          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Suggestions
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className={`
                    w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700
                    ${selectedIndex === index ? 'bg-gray-50 dark:bg-gray-700' : ''}
                  `}
                >
                  <div className="flex items-center space-x-2">
                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
                    <span>{suggestion}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {/* Search Results */}
          {results.length > 0 && (
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center justify-between">
                <span>Results ({totalResults})</span>
                {searchTime > 0 && (
                  <span>{searchTime}ms</span>
                )}
              </div>
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultSelect(result)}
                  className={`
                    w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700
                    ${selectedIndex === suggestions.length + index ? 'bg-gray-50 dark:bg-gray-700' : ''}
                  `}
                >
                  <div className="flex items-center space-x-2">
                    <div className="text-gray-400">
                      {getResultIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {result.title}
                      </div>
                      {result.subtitle && (
                        <div className="text-gray-500 dark:text-gray-400 truncate">
                          {result.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {/* Recent Items */}
          {showRecentItems && query.length === 0 && recentItems.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Recent
              </div>
              {recentItems.map((item, index) => (
                <button
                  key={`recent-${item.type}-${item.id}`}
                  onClick={() => handleResultSelect(item)}
                  className={`
                    w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700
                    ${selectedIndex === suggestions.length + results.length + index ? 'bg-gray-50 dark:bg-gray-700' : ''}
                  `}
                >
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="w-4 h-4 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div className="text-gray-500 dark:text-gray-400 truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {/* No Results */}
          {query.length > 0 && !isLoading && results.length === 0 && suggestions.length === 0 && !error && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No results found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}