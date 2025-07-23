'use client'

import { useState, useEffect, useCallback } from 'react'

export interface FavoriteItem {
  href: string
  name: string
  addedAt: number
}

const FAVORITES_KEY = 'navigation_favorites'
const MAX_FAVORITES = 8

export function useNavigationFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as FavoriteItem[]
        setFavorites(parsed.sort((a, b) => b.addedAt - a.addedAt))
      }
    } catch (error) {
      console.warn('Failed to load navigation favorites:', error)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Save favorites to localStorage
  const saveFavorites = useCallback((newFavorites: FavoriteItem[]) => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites))
      setFavorites(newFavorites)
    } catch (error) {
      console.warn('Failed to save navigation favorites:', error)
    }
  }, [])

  // Add item to favorites
  const addFavorite = useCallback((href: string, name: string) => {
    if (favorites.length >= MAX_FAVORITES) {
      // Remove oldest favorite if at max capacity
      const newFavorites = favorites.slice(0, MAX_FAVORITES - 1)
      newFavorites.unshift({ href, name, addedAt: Date.now() })
      saveFavorites(newFavorites)
    } else {
      const newFavorites = [{ href, name, addedAt: Date.now() }, ...favorites]
      saveFavorites(newFavorites)
    }
  }, [favorites, saveFavorites])

  // Remove item from favorites
  const removeFavorite = useCallback((href: string) => {
    const newFavorites = favorites.filter(fav => fav.href !== href)
    saveFavorites(newFavorites)
  }, [favorites, saveFavorites])

  // Check if item is favorited
  const isFavorite = useCallback((href: string) => {
    return favorites.some(fav => fav.href === href)
  }, [favorites])

  // Toggle favorite status
  const toggleFavorite = useCallback((href: string, name: string) => {
    if (isFavorite(href)) {
      removeFavorite(href)
    } else {
      addFavorite(href, name)
    }
  }, [isFavorite, addFavorite, removeFavorite])

  return {
    favorites,
    isLoaded,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    maxFavorites: MAX_FAVORITES
  }
}