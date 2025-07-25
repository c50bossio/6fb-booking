/**
 * useSearch hook for search functionality
 * 
 * Provides search state management, debouncing, and API integration
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { globalSearch, getSearchSuggestions, getRecentItems } from '@/lib/api/search'
import type { SearchResult, SearchResponse } from '@/lib/api/search'

interface UseSearchOptions {
  debounceMs?: number
  minQueryLength?: number
  maxSuggestions?: number
  searchLimit?: number
  category?: string
}

interface UseSearchReturn {
  // State
  query: string
  results: SearchResult[]
  suggestions: string[]
  recentItems: SearchResult[]
  isLoading: boolean
  isLoadingSuggestions: boolean
  error: string | null
  
  // Actions
  setQuery: (query: string) => void
  search: (query: string) => Promise<void>
  clearSearch: () => void
  selectResult: (result: SearchResult) => void
  
  // Metadata
  totalResults: number
  categories: Record<string, number>
  searchTime: number
}

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {
    debounceMs = 300,
    minQueryLength = 1,
    maxSuggestions = 8,
    searchLimit = 20,
    category
  } = options
  
  // State
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [recentItems, setRecentItems] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchMetadata, setSearchMetadata] = useState({
    totalResults: 0,
    categories: {} as Record<string, number>,
    searchTime: 0
  })
  
  // Refs for cleanup
  const searchAbortController = useRef<AbortController | null>(null)
  const suggestionsAbortController = useRef<AbortController | null>(null)
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)
  
  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < minQueryLength) {
      setResults([])
      setSearchMetadata({ totalResults: 0, categories: {}, searchTime: 0 })
      return
    }
    
    // Cancel previous search
    if (searchAbortController.current) {
      searchAbortController.current.abort()
    }
    
    // Create new abort controller
    searchAbortController.current = new AbortController()
    
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await globalSearch(searchQuery, {
        limit: searchLimit,
        category,
        signal: searchAbortController.current.signal
      })
      
      setResults(response.results)
      setSearchMetadata({
        totalResults: response.total,
        categories: response.categories,
        searchTime: response.took_ms
      })
      
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Search failed')
        setResults([])
        setSearchMetadata({ totalResults: 0, categories: {}, searchTime: 0 })
      }
    } finally {
      setIsLoading(false)
    }
  }, [minQueryLength, searchLimit, category])
  
  // Suggestions function
  const loadSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 1) {
      setSuggestions([])
      return
    }
    
    // Cancel previous suggestions request
    if (suggestionsAbortController.current) {
      suggestionsAbortController.current.abort()
    }
    
    suggestionsAbortController.current = new AbortController()
    
    try {
      setIsLoadingSuggestions(true)
      
      const suggestionResults = await getSearchSuggestions(searchQuery, {
        limit: maxSuggestions,
        signal: suggestionsAbortController.current.signal
      })
      
      setSuggestions(suggestionResults)
      
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setSuggestions([])
      }
    } finally {
      setIsLoadingSuggestions(false)
    }
  }, [maxSuggestions])
  
  // Load recent items on mount
  useEffect(() => {
    async function loadRecent() {
      try {
        const recent = await getRecentItems({ limit: 10 })
        setRecentItems(recent)
      } catch (err) {
        // Silently fail for recent items
        setRecentItems([])
      }
    }
    
    loadRecent()
  }, [])
  
  // Debounced search effect
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }
    
    debounceTimeout.current = setTimeout(() => {
      performSearch(query)
      loadSuggestions(query)
    }, debounceMs)
    
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
      }
    }
  }, [query, performSearch, loadSuggestions, debounceMs])
  
  // Search function (can be called directly)
  const search = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery)
    await performSearch(searchQuery)
  }, [performSearch])
  
  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setSuggestions([])
    setError(null)
    setSearchMetadata({ totalResults: 0, categories: {}, searchTime: 0 })
    
    // Cancel any pending requests
    if (searchAbortController.current) {
      searchAbortController.current.abort()
    }
    if (suggestionsAbortController.current) {
      suggestionsAbortController.current.abort()
    }
  }, [])
  
  // Select result (for analytics/routing)
  const selectResult = useCallback((result: SearchResult) => {
    // Could add analytics tracking here
    console.log('Search result selected:', result)
    
    // Navigate to the result URL
    if (result.url && typeof window !== 'undefined') {
      window.location.href = result.url
    }
  }, [])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchAbortController.current) {
        searchAbortController.current.abort()
      }
      if (suggestionsAbortController.current) {
        suggestionsAbortController.current.abort()
      }
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
      }
    }
  }, [])
  
  return {
    // State
    query,
    results,
    suggestions,
    recentItems,
    isLoading,
    isLoadingSuggestions,
    error,
    
    // Actions
    setQuery,
    search,
    clearSearch,
    selectResult,
    
    // Metadata
    totalResults: searchMetadata.totalResults,
    categories: searchMetadata.categories,
    searchTime: searchMetadata.searchTime
  }
}