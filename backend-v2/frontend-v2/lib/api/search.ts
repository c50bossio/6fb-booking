/**
 * Search API client for BookedBarber V2
 * 
 * Provides global search functionality across appointments, clients, services, etc.
 */

interface SearchResult {
  id: number
  type: string
  title: string
  subtitle?: string
  url: string
  metadata: Record<string, any>
  score: number
}

interface SearchResponse {
  query: string
  results: SearchResult[]
  total: number
  categories: Record<string, number>
  took_ms: number
}

const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://api.bookedbarber.com' 
  : 'http://localhost:8000'

/**
 * Perform global search across user's data
 */
export async function globalSearch(
  query: string,
  options: {
    limit?: number
    category?: string
    signal?: AbortSignal
  } = {}
): Promise<SearchResponse> {
  const { limit = 20, category, signal } = options
  
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
    ...(category && { category })
  })
  
  const response = await fetch(`${API_BASE}/api/v2/search/?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    signal
  })
  
  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Get search suggestions/autocomplete
 */
export async function getSearchSuggestions(
  query: string,
  options: {
    limit?: number
    signal?: AbortSignal
  } = {}
): Promise<string[]> {
  const { limit = 5, signal } = options
  
  if (query.length < 1) return []
  
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString()
  })
  
  const response = await fetch(`${API_BASE}/api/v2/search/suggestions?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    signal
  })
  
  if (!response.ok) {
    // Return empty array on error to not break UX
    return []
  }
  
  return response.json()
}

/**
 * Get recent searches/items for quick access
 */
export async function getRecentItems(
  options: {
    limit?: number
    signal?: AbortSignal
  } = {}
): Promise<SearchResult[]> {
  const { limit = 10, signal } = options
  
  const params = new URLSearchParams({
    limit: limit.toString()
  })
  
  const response = await fetch(`${API_BASE}/api/v2/search/recent?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    signal
  })
  
  if (!response.ok) {
    // Return empty array on error
    return []
  }
  
  return response.json()
}

/**
 * Semantic search using Voyage.ai embeddings
 */
export async function semanticSearch(
  query: string,
  options: {
    type?: 'all' | 'barbers' | 'services'
    limit?: number
    minSimilarity?: number
    signal?: AbortSignal
  } = {}
): Promise<SearchResponse> {
  const { type = 'all', limit = 10, minSimilarity = 0.5, signal } = options
  
  const params = new URLSearchParams({
    q: query,
    type,
    limit: limit.toString(),
    min_similarity: minSimilarity.toString()
  })
  
  const response = await fetch(`${API_BASE}/api/v2/search/semantic?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    signal
  })
  
  if (!response.ok) {
    if (response.status === 503) {
      // Semantic search unavailable - fallback to regular search
      return globalSearch(query, { limit, signal })
    }
    throw new Error(`Semantic search failed: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Get personalized recommendations
 */
export async function getRecommendations(
  options: {
    limit?: number
    signal?: AbortSignal
  } = {}
): Promise<SearchResponse> {
  const { limit = 5, signal } = options
  
  const params = new URLSearchParams({
    limit: limit.toString()
  })
  
  const response = await fetch(`${API_BASE}/api/v2/search/recommendations?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    signal
  })
  
  if (!response.ok) {
    // Return empty response on error to not break UX
    return {
      query: 'recommendations',
      results: [],
      total: 0,
      categories: {},
      took_ms: 0
    }
  }
  
  return response.json()
}

/**
 * Search hook for React components
 */
export function createSearchHook() {
  return {
    search: globalSearch,
    semanticSearch,
    suggestions: getSearchSuggestions,
    recent: getRecentItems,
    recommendations: getRecommendations
  }
}

export type { SearchResult, SearchResponse }