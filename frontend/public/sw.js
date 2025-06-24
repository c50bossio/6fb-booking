/**
 * Offline-first Service Worker for 6FB Booking Platform
 * Provides caching, background sync, and offline functionality
 */

const CACHE_VERSION = 'v1.2.0'
const STATIC_CACHE = `6fb-static-${CACHE_VERSION}`
const API_CACHE = `6fb-api-${CACHE_VERSION}`
const DYNAMIC_CACHE = `6fb-dynamic-${CACHE_VERSION}`
const OFFLINE_PAGE = '/offline'

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
}

// Route configurations with caching strategies
const ROUTE_CONFIG = [
  // Static assets - Cache First
  {
    pattern: /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cacheName: STATIC_CACHE,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 500
  },
  
  // API endpoints - Network First with fallback
  {
    pattern: /\/api\/v1\/(users|auth|health)/,
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    cacheName: API_CACHE,
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 100,
    networkTimeout: 5000
  },
  
  // Appointments and bookings - Stale While Revalidate
  {
    pattern: /\/api\/v1\/(appointments|bookings)/,
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    cacheName: API_CACHE,
    maxAge: 10 * 60 * 1000, // 10 minutes
    maxEntries: 200,
    backgroundSync: true
  },
  
  // Analytics and reports - Network First
  {
    pattern: /\/api\/v1\/(analytics|reports)/,
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    cacheName: API_CACHE,
    maxAge: 30 * 60 * 1000, // 30 minutes
    maxEntries: 50
  },
  
  // HTML pages - Stale While Revalidate
  {
    pattern: /\/(dashboard|booking|analytics|calendar)/,
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    cacheName: DYNAMIC_CACHE,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    maxEntries: 50
  }
]

// Background sync configurations
const SYNC_CONFIG = {
  appointment: {
    tag: 'appointment-sync',
    maxRetries: 3,
    retryDelay: 5000
  },
  booking: {
    tag: 'booking-sync',
    maxRetries: 5,
    retryDelay: 3000
  },
  analytics: {
    tag: 'analytics-sync',
    maxRetries: 2,
    retryDelay: 10000
  }
}

// Offline queue for mutations
let offlineQueue = []
let syncInProgress = false

// Installation event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker version:', CACHE_VERSION)
  
  event.waitUntil(
    Promise.all([
      // Precache essential static assets
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll([
          '/',
          '/dashboard',
          '/offline',
          '/_next/static/css/app.css',
          '/_next/static/js/app.js',
          '/manifest.json'
        ]).catch(err => {
          console.warn('[SW] Failed to precache some static assets:', err)
        })
      }),
      
      // Initialize offline queue from IndexedDB
      initializeOfflineQueue(),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  )
})

// Activation event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker version:', CACHE_VERSION)
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      cleanupOldCaches(),
      
      // Claim all clients
      self.clients.claim(),
      
      // Initialize background sync
      initializeBackgroundSync()
    ])
  )
})

// Fetch event handler
self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  
  // Skip non-GET requests for caching (handle separately for background sync)
  if (request.method !== 'GET') {
    event.respondWith(handleMutation(request))
    return
  }
  
  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) {
    return
  }
  
  // Find matching route configuration
  const routeConfig = findRouteConfig(request.url)
  
  if (routeConfig) {
    event.respondWith(handleRequest(request, routeConfig))
  } else {
    // Default strategy for unmatched routes
    event.respondWith(
      handleRequest(request, {
        strategy: CACHE_STRATEGIES.NETWORK_FIRST,
        cacheName: DYNAMIC_CACHE,
        maxAge: 60 * 60 * 1000 // 1 hour
      })
    )
  }
})

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag)
  
  if (event.tag.endsWith('-sync')) {
    event.waitUntil(handleBackgroundSync(event.tag))
  }
})

// Message event for communication with main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
      
    case 'GET_CACHE_STATS':
      event.ports[0].postMessage(getCacheStats())
      break
      
    case 'CLEAR_CACHE':
      clearSpecificCache(payload.cacheName)
        .then(() => event.ports[0].postMessage({ success: true }))
        .catch(err => event.ports[0].postMessage({ success: false, error: err.message }))
      break
      
    case 'PREFETCH_ROUTES':
      prefetchRoutes(payload.routes)
        .then(() => event.ports[0].postMessage({ success: true }))
        .catch(err => event.ports[0].postMessage({ success: false, error: err.message }))
      break
      
    case 'QUEUE_OFFLINE_ACTION':
      queueOfflineAction(payload)
      event.ports[0].postMessage({ success: true })
      break
  }
})

// Request handling functions
async function handleRequest(request, config) {
  const { strategy, cacheName, maxAge, networkTimeout } = config
  
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request, cacheName, maxAge)
      
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request, cacheName, maxAge, networkTimeout)
      
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request, cacheName, maxAge)
      
    case CACHE_STRATEGIES.NETWORK_ONLY:
      return networkOnly(request)
      
    case CACHE_STRATEGIES.CACHE_ONLY:
      return cacheOnly(request, cacheName)
      
    default:
      return networkFirst(request, cacheName, maxAge, networkTimeout)
  }
}

async function cacheFirst(request, cacheName, maxAge) {
  try {
    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse && !isExpired(cachedResponse, maxAge)) {
      return cachedResponse
    }
    
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone()
      await cache.put(request, responseClone)
    }
    
    return networkResponse
  } catch (error) {
    console.warn('[SW] Cache first failed:', error)
    return createOfflineResponse(request)
  }
}

async function networkFirst(request, cacheName, maxAge, timeout = 5000) {
  try {
    const networkPromise = fetch(request)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Network timeout')), timeout)
    })
    
    const networkResponse = await Promise.race([networkPromise, timeoutPromise])
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      const responseClone = networkResponse.clone()
      await cache.put(request, responseClone)
      return networkResponse
    }
    
    throw new Error(`Network response not ok: ${networkResponse.status}`)
  } catch (error) {
    console.warn('[SW] Network first fallback to cache:', error.message)
    
    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    return createOfflineResponse(request)
  }
}

async function staleWhileRevalidate(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)
  
  // Always fetch in background to update cache
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  }).catch(error => {
    console.warn('[SW] Background fetch failed:', error)
  })
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse
  }
  
  // Wait for network if no cache available
  try {
    return await fetchPromise
  } catch (error) {
    return createOfflineResponse(request)
  }
}

async function networkOnly(request) {
  try {
    return await fetch(request)
  } catch (error) {
    return createOfflineResponse(request)
  }
}

async function cacheOnly(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  return createOfflineResponse(request)
}

// Mutation handling with offline queue
async function handleMutation(request) {
  if (!navigator.onLine) {
    // Queue for background sync
    await queueOfflineAction({
      type: 'mutation',
      request: await serializeRequest(request),
      timestamp: Date.now(),
      retries: 0
    })
    
    return new Response(
      JSON.stringify({
        success: true,
        queued: true,
        message: 'Request queued for when connection is restored'
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
  
  try {
    const response = await fetch(request)
    
    // If successful, try to sync any queued actions
    if (response.ok && offlineQueue.length > 0) {
      requestBackgroundSync('general-sync')
    }
    
    return response
  } catch (error) {
    // Queue for retry
    await queueOfflineAction({
      type: 'mutation',
      request: await serializeRequest(request),
      timestamp: Date.now(),
      retries: 0,
      error: error.message
    })
    
    return new Response(
      JSON.stringify({
        success: false,
        queued: true,
        error: 'Network error - request queued for retry'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Background sync handling
async function handleBackgroundSync(tag) {
  console.log('[SW] Handling background sync:', tag)
  
  if (syncInProgress) {
    console.log('[SW] Sync already in progress, skipping')
    return
  }
  
  syncInProgress = true
  
  try {
    const queue = await loadOfflineQueue()
    
    for (const action of queue) {
      try {
        await processOfflineAction(action)
        await removeFromOfflineQueue(action.id)
      } catch (error) {
        console.warn('[SW] Failed to process offline action:', error)
        
        // Increment retry count
        action.retries = (action.retries || 0) + 1
        
        // Remove if max retries reached
        if (action.retries >= 3) {
          await removeFromOfflineQueue(action.id)
          console.warn('[SW] Max retries reached, removing action:', action.id)
        } else {
          await updateOfflineQueue(action)
        }
      }
    }
  } finally {
    syncInProgress = false
  }
}

// Utility functions
function findRouteConfig(url) {
  return ROUTE_CONFIG.find(config => config.pattern.test(url))
}

function isExpired(response, maxAge) {
  if (!maxAge) return false
  
  const dateHeader = response.headers.get('date')
  if (!dateHeader) return false
  
  const responseDate = new Date(dateHeader)
  const now = new Date()
  
  return (now.getTime() - responseDate.getTime()) > maxAge
}

function createOfflineResponse(request) {
  const url = new URL(request.url)
  
  // Return offline page for navigation requests
  if (request.mode === 'navigate') {
    return caches.match(OFFLINE_PAGE).then(response => {
      return response || new Response(
        createOfflineHTML(),
        { headers: { 'Content-Type': 'text/html' } }
      )
    })
  }
  
  // Return JSON error for API requests
  if (url.pathname.startsWith('/api/')) {
    return new Response(
      JSON.stringify({
        error: 'Network unavailable',
        message: 'Please check your internet connection',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
  
  // Return generic offline response
  return new Response(
    'Offline - Content not available',
    {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    }
  )
}

function createOfflineHTML() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>6FB Booking - Offline</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          text-align: center;
          padding: 2rem;
          background: #f8fafc;
          color: #334155;
        }
        .container {
          max-width: 400px;
          margin: 0 auto;
          padding: 2rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .icon { font-size: 3rem; margin-bottom: 1rem; }
        h1 { color: #20D9D2; margin-bottom: 1rem; }
        button {
          background: #20D9D2;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 1rem;
        }
        button:hover { background: #1BC5B8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📱</div>
        <h1>You're Offline</h1>
        <p>Your internet connection is not available. Some features may be limited until you're back online.</p>
        <p>Don't worry - your data is safe and will sync when reconnected.</p>
        <button onclick="location.reload()">Try Again</button>
      </div>
    </body>
    </html>
  `
}

// Cache management functions
async function cleanupOldCaches() {
  const cacheNames = await caches.keys()
  const currentCaches = [STATIC_CACHE, API_CACHE, DYNAMIC_CACHE]
  
  const deletePromises = cacheNames
    .filter(cacheName => !currentCaches.includes(cacheName))
    .map(cacheName => {
      console.log('[SW] Deleting old cache:', cacheName)
      return caches.delete(cacheName)
    })
  
  return Promise.all(deletePromises)
}

async function clearSpecificCache(cacheName) {
  return caches.delete(cacheName)
}

async function getCacheStats() {
  const cacheNames = await caches.keys()
  const stats = {}
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName)
    const keys = await cache.keys()
    stats[cacheName] = {
      entries: keys.length,
      urls: keys.map(request => request.url)
    }
  }
  
  return stats
}

async function prefetchRoutes(routes) {
  const cache = await caches.open(DYNAMIC_CACHE)
  
  const prefetchPromises = routes.map(async (route) => {
    try {
      const response = await fetch(route)
      if (response.ok) {
        await cache.put(route, response)
      }
    } catch (error) {
      console.warn('[SW] Prefetch failed for:', route, error)
    }
  })
  
  return Promise.allSettled(prefetchPromises)
}

// Offline queue management (using IndexedDB)
async function initializeOfflineQueue() {
  try {
    const queue = await loadOfflineQueue()
    offlineQueue = queue || []
    console.log('[SW] Initialized offline queue with', offlineQueue.length, 'items')
  } catch (error) {
    console.warn('[SW] Failed to initialize offline queue:', error)
    offlineQueue = []
  }
}

async function queueOfflineAction(action) {
  action.id = action.id || generateId()
  offlineQueue.push(action)
  await saveOfflineQueue()
  
  // Request background sync
  await requestBackgroundSync('general-sync')
}

async function loadOfflineQueue() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('6fb-sw-db', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['queue'], 'readonly')
      const store = transaction.objectStore('queue')
      const getRequest = store.get('offlineQueue')
      
      getRequest.onsuccess = () => {
        resolve(getRequest.result?.data || [])
      }
      getRequest.onerror = () => reject(getRequest.error)
    }
    
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue')
      }
    }
  })
}

async function saveOfflineQueue() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('6fb-sw-db', 1)
    
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['queue'], 'readwrite')
      const store = transaction.objectStore('queue')
      const putRequest = store.put({ data: offlineQueue }, 'offlineQueue')
      
      putRequest.onsuccess = () => resolve()
      putRequest.onerror = () => reject(putRequest.error)
    }
    request.onerror = () => reject(request.error)
  })
}

async function removeFromOfflineQueue(actionId) {
  offlineQueue = offlineQueue.filter(action => action.id !== actionId)
  await saveOfflineQueue()
}

async function updateOfflineQueue(updatedAction) {
  const index = offlineQueue.findIndex(action => action.id === updatedAction.id)
  if (index !== -1) {
    offlineQueue[index] = updatedAction
    await saveOfflineQueue()
  }
}

async function processOfflineAction(action) {
  if (action.type === 'mutation') {
    const request = await deserializeRequest(action.request)
    const response = await fetch(request)
    
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`)
    }
    
    return response
  }
}

async function serializeRequest(request) {
  const headers = {}
  for (const [key, value] of request.headers.entries()) {
    headers[key] = value
  }
  
  return {
    url: request.url,
    method: request.method,
    headers,
    body: request.body ? await request.text() : null
  }
}

async function deserializeRequest(serialized) {
  return new Request(serialized.url, {
    method: serialized.method,
    headers: serialized.headers,
    body: serialized.body
  })
}

async function requestBackgroundSync(tag) {
  try {
    await self.registration.sync.register(tag)
    console.log('[SW] Background sync registered:', tag)
  } catch (error) {
    console.warn('[SW] Background sync registration failed:', error)
  }
}

async function initializeBackgroundSync() {
  // Register periodic background sync if supported
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    console.log('[SW] Background sync is supported')
    
    // Schedule initial sync
    await requestBackgroundSync('general-sync')
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

console.log('[SW] Service Worker script loaded successfully')