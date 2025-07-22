'use client'

import { useState, useEffect, useCallback } from 'react'

interface NavigationEvent {
  href: string
  name: string
  timestamp: number
  count: number
}

const TRACKING_KEY = 'navigation_usage'
const MAX_TRACKING_ITEMS = 20
const USAGE_THRESHOLD = 3 // Minimum clicks to be considered "frequently used"

export function useNavigationTracking() {
  const [usageData, setUsageData] = useState<NavigationEvent[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load usage data from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TRACKING_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as NavigationEvent[]
        setUsageData(parsed)
      }
    } catch (error) {
      console.warn('Failed to load navigation tracking:', error)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Save usage data to localStorage
  const saveUsageData = useCallback((newData: NavigationEvent[]) => {
    try {
      // Keep only the most recent MAX_TRACKING_ITEMS
      const trimmedData = newData
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, MAX_TRACKING_ITEMS)
      
      localStorage.setItem(TRACKING_KEY, JSON.stringify(trimmedData))
      setUsageData(trimmedData)
    } catch (error) {
      console.warn('Failed to save navigation tracking:', error)
    }
  }, [])

  // Track navigation event
  const trackNavigation = useCallback((href: string, name: string) => {
    const now = Date.now()
    const existingIndex = usageData.findIndex(item => item.href === href)
    
    let newData: NavigationEvent[]
    
    if (existingIndex >= 0) {
      // Update existing item
      newData = [...usageData]
      newData[existingIndex] = {
        ...newData[existingIndex],
        timestamp: now,
        count: newData[existingIndex].count + 1
      }
    } else {
      // Add new item
      newData = [
        ...usageData,
        { href, name, timestamp: now, count: 1 }
      ]
    }
    
    saveUsageData(newData)
  }, [usageData, saveUsageData])

  // Get frequently used items
  const getFrequentlyUsed = useCallback(() => {
    return usageData
      .filter(item => item.count >= USAGE_THRESHOLD)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [usageData])

  // Get recently used items
  const getRecentlyUsed = useCallback(() => {
    return usageData
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
  }, [usageData])

  // Get usage count for an item
  const getUsageCount = useCallback((href: string) => {
    const item = usageData.find(data => data.href === href)
    return item?.count || 0
  }, [usageData])

  // Check if item is frequently used
  const isFrequentlyUsed = useCallback((href: string) => {
    return getUsageCount(href) >= USAGE_THRESHOLD
  }, [getUsageCount])

  return {
    usageData,
    isLoaded,
    trackNavigation,
    getFrequentlyUsed,
    getRecentlyUsed,
    getUsageCount,
    isFrequentlyUsed,
    usageThreshold: USAGE_THRESHOLD
  }
}