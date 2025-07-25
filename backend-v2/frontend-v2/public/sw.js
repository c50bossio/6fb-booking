/**
 * BookedBarber PWA Service Worker
 * Advanced offline-first caching strategy with calendar optimization
 * Enhanced mobile experience with haptic feedback and native features
 * Version: 4.0.0 - Fresha-inspired Mobile PWA
 */

const CACHE_VERSION = 'bb-v4.0.0';
const CACHE_NAMES = {
  STATIC: `${CACHE_VERSION}-static`,
  DYNAMIC: `${CACHE_VERSION}-dynamic`,
  CALENDAR: `${CACHE_VERSION}-calendar`,
  API: `${CACHE_VERSION}-api`,
  IMAGES: `${CACHE_VERSION}-images`,
};

// Critical app shell files
const APP_SHELL = [
  '/',
  '/calendar',
  '/dashboard',
  '/offline',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg',
];

// Calendar-specific routes for offline access
const CALENDAR_ROUTES = [
  '/calendar',
  '/api/v1/appointments',
  '/api/v1/availability',
  '/api/v1/services',
];

// API endpoints to cache for offline functionality
const CACHE_API_PATTERNS = [
  /\/api\/v1\/appointments/,
  /\/api\/v1\/availability/,
  /\/api\/v1\/services/,
  /\/api\/v1\/barbers/,
  /\/api\/v1\/clients/,
];

// Background sync tags
const SYNC_TAGS = {
  SYNC_APPOINTMENTS: 'sync-appointments',
  SYNC_AVAILABILITY: 'sync-availability',
  SYNC_ANALYTICS: 'sync-analytics',
};

// IndexedDB for offline data queue
let dbPromise;

class PWAServiceWorker {
  constructor() {
    this.initializeDB();
    this.setupEventListeners();
  }

  // Initialize IndexedDB for offline data
  async initializeDB() {
    if (!('indexedDB' in self)) return;
    
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('BookedBarberOffline', 2);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Offline action queue
        if (!db.objectStoreNames.contains('actionQueue')) {
          const store = db.createObjectStore('actionQueue', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('type', 'type');
        }
        
        // Cached calendar data
        if (!db.objectStoreNames.contains('calendarCache')) {
          const calendarStore = db.createObjectStore('calendarCache', { 
            keyPath: 'id' 
          });
          calendarStore.createIndex('date', 'date');
          calendarStore.createIndex('barberId', 'barberId');
        }
        
        // Offline appointments
        if (!db.objectStoreNames.contains('offlineAppointments')) {
          const appointmentStore = db.createObjectStore('offlineAppointments', { 
            keyPath: 'id',
            autoIncrement: true
          });
          appointmentStore.createIndex('date', 'date');
          appointmentStore.createIndex('status', 'status');
        }
        
        // Analytics cache
        if (!db.objectStoreNames.contains('analyticsCache')) {
          db.createObjectStore('analyticsCache', { 
            keyPath: 'key' 
          });
        }
      };
    });
  }

  setupEventListeners() {
    self.addEventListener('install', this.handleInstall.bind(this));
    self.addEventListener('activate', this.handleActivate.bind(this));
    self.addEventListener('fetch', this.handleFetch.bind(this));
    self.addEventListener('sync', this.handleBackgroundSync.bind(this));
    self.addEventListener('message', this.handleMessage.bind(this));
    self.addEventListener('push', this.handlePushNotification.bind(this));
    self.addEventListener('notificationclick', this.handleNotificationClick.bind(this));
  }

  // Install event - cache app shell
  async handleInstall(event) {
    console.log('📦 PWA Service Worker Installing...');
    
    event.waitUntil(
      (async () => {
        try {
          const cache = await caches.open(CACHE_NAMES.STATIC);
          await cache.addAll(APP_SHELL);
          
          // Cache critical calendar assets
          const calendarCache = await caches.open(CACHE_NAMES.CALENDAR);
          await calendarCache.addAll(CALENDAR_ROUTES.filter(route => !route.includes('/api/')));
          
          console.log('✅ App shell cached successfully');
          
          // Skip waiting to activate immediately in development
          if (self.location.hostname === 'localhost') {
            self.skipWaiting();
          }
        } catch (error) {
          console.error('❌ Failed to cache app shell:', error);
        }
      })()
    );
  }

  // Activate event - clean up old caches
  async handleActivate(event) {
    console.log('🚀 PWA Service Worker Activating...');
    
    event.waitUntil(
      (async () => {
        try {
          // Clean up old caches
          const cacheNames = await caches.keys();
          const deletePromises = cacheNames
            .filter(name => !Object.values(CACHE_NAMES).includes(name))
            .map(name => {
              console.log('🗑️ Deleting old cache:', name);
              return caches.delete(name);
            });
          
          await Promise.all(deletePromises);
          
          // Take control of all open tabs
          await self.clients.claim();
          
          console.log('✅ Service Worker activated and controlling all tabs');
        } catch (error) {
          console.error('❌ Failed to activate service worker:', error);
        }
      })()
    );
  }

  // Fetch event - implement caching strategies
  async handleFetch(event) {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip cache for non-GET requests (except for offline fallback)
    if (request.method !== 'GET') {
      if (navigator.onLine) {
        return fetch(request);
      } else {
        return this.handleOfflineAction(request);
      }
    }
    
    event.respondWith(this.getCachedResponse(request));
  }

  // Get cached response with appropriate strategy
  async getCachedResponse(request) {
    const url = new URL(request.url);
    
    try {
      // 1. App Shell - Cache First
      if (APP_SHELL.some(route => url.pathname === route || url.pathname.startsWith(route))) {
        return await this.cacheFirst(request, CACHE_NAMES.STATIC);
      }
      
      // 2. Calendar Data - Network First with fallback
      if (CALENDAR_ROUTES.some(route => url.pathname.startsWith(route))) {
        return await this.networkFirstWithOffline(request, CACHE_NAMES.CALENDAR);
      }
      
      // 3. API Calls - Network First with IndexedDB fallback
      if (CACHE_API_PATTERNS.some(pattern => pattern.test(url.pathname))) {
        return await this.apiNetworkFirst(request);
      }
      
      // 4. Images - Cache First with network fallback
      if (request.destination === 'image') {
        return await this.cacheFirst(request, CACHE_NAMES.IMAGES);
      }
      
      // 5. Everything else - Network First
      return await this.networkFirst(request, CACHE_NAMES.DYNAMIC);
      
    } catch (error) {
      console.error('❌ Fetch error:', error);
      return this.getOfflineFallback(request);
    }
  }

  // Cache First strategy
  async cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;
    
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      return this.getOfflineFallback(request);
    }
  }

  // Network First strategy
  async networkFirst(request, cacheName) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      return cached || this.getOfflineFallback(request);
    }
  }

  // Network First with offline calendar support
  async networkFirstWithOffline(request, cacheName) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone());
        
        // Store calendar data in IndexedDB for offline access
        if (request.url.includes('/api/v1/appointments')) {
          this.cacheCalendarData(request, response.clone());
        }
      }
      return response;
    } catch (error) {
      // Try cache first
      const cached = await caches.match(request);
      if (cached) return cached;
      
      // Fall back to IndexedDB for calendar data
      return this.getOfflineCalendarData(request);
    }
  }

  // API Network First with IndexedDB
  async apiNetworkFirst(request) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        // Cache successful API responses
        const cache = await caches.open(CACHE_NAMES.API);
        cache.put(request, response.clone());
        
        // Store in IndexedDB for offline access
        this.storeAPIDataOffline(request, response.clone());
      }
      return response;
    } catch (error) {
      // Try cache
      const cached = await caches.match(request);
      if (cached) return cached;
      
      // Fall back to IndexedDB
      return this.getOfflineAPIData(request);
    }
  }

  // Store calendar data for offline access
  async cacheCalendarData(request, response) {
    try {
      const data = await response.json();
      const db = await dbPromise;
      const tx = db.transaction(['calendarCache'], 'readwrite');
      const store = tx.objectStore('calendarCache');
      
      if (Array.isArray(data)) {
        // Store multiple appointments
        data.forEach(appointment => {
          store.put({
            id: `${request.url}-${appointment.id}`,
            url: request.url,
            data: appointment,
            timestamp: Date.now(),
            date: appointment.date || appointment.start_time,
            barberId: appointment.barber_id
          });
        });
      } else {
        // Store single appointment
        store.put({
          id: `${request.url}-${data.id || Date.now()}`,
          url: request.url,
          data: data,
          timestamp: Date.now(),
          date: data.date || data.start_time,
          barberId: data.barber_id
        });
      }
      
      await tx.complete;
    } catch (error) {
      console.warn('Failed to cache calendar data:', error);
    }
  }

  // Get offline calendar data
  async getOfflineCalendarData(request) {
    try {
      const db = await dbPromise;
      const tx = db.transaction(['calendarCache'], 'readonly');
      const store = tx.objectStore('calendarCache');
      const index = store.index('timestamp');
      
      // Get recent calendar data (last 7 days)
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const range = IDBKeyRange.lowerBound(oneWeekAgo);
      const entries = await index.getAll(range);
      
      const data = entries
        .filter(entry => entry.url === request.url)
        .map(entry => entry.data);
      
      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'X-Offline-Data': 'true',
          'X-Cache-Date': new Date().toISOString()
        }
      });
    } catch (error) {
      return this.getOfflineFallback(request);
    }
  }

  // Handle offline actions (POST, PUT, DELETE)
  async handleOfflineAction(request) {
    try {
      const db = await dbPromise;
      const tx = db.transaction(['actionQueue'], 'readwrite');
      const store = tx.objectStore('actionQueue');
      
      const action = {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: request.method !== 'GET' ? await request.text() : null,
        timestamp: Date.now(),
        type: this.getActionType(request.url)
      };
      
      await store.add(action);
      await tx.complete;
      
      // Register for background sync
      if (self.registration.sync) {
        await self.registration.sync.register(SYNC_TAGS.SYNC_APPOINTMENTS);
      }
      
      // Return optimistic response
      return new Response(
        JSON.stringify({ 
          success: true, 
          offline: true,
          message: 'Action queued for sync when online'
        }), 
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      console.error('Failed to queue offline action:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to queue action' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Background sync handler
  async handleBackgroundSync(event) {
    console.log('🔄 Background sync triggered:', event.tag);
    
    if (event.tag === SYNC_TAGS.SYNC_APPOINTMENTS) {
      event.waitUntil(this.syncOfflineActions());
    }
  }

  // Sync offline actions when back online
  async syncOfflineActions() {
    try {
      const db = await dbPromise;
      const tx = db.transaction(['actionQueue'], 'readwrite');
      const store = tx.objectStore('actionQueue');
      const actions = await store.getAll();
      
      console.log(`📤 Syncing ${actions.length} offline actions`);
      
      for (const action of actions) {
        try {
          const request = new Request(action.url, {
            method: action.method,
            headers: action.headers,
            body: action.body
          });
          
          const response = await fetch(request);
          
          if (response.ok) {
            // Remove successfully synced action
            await store.delete(action.id);
            console.log('✅ Synced action:', action.url, action.method);
            
            // Notify client about successful sync
            this.notifyClients({
              type: 'SYNC_SUCCESS',
              action: action
            });
          } else {
            console.warn('⚠️ Failed to sync action:', response.status, action.url);
          }
        } catch (error) {
          console.error('❌ Sync error for action:', action.url, error);
        }
      }
      
      await tx.complete;
    } catch (error) {
      console.error('❌ Background sync failed:', error);
    }
  }

  // Push notification handler
  async handlePushNotification(event) {
    if (!event.data) return;
    
    try {
      const data = event.data.json();
      
      const options = {
        body: data.body || 'New notification from BookedBarber',
        icon: '/icon?size=192',
        badge: '/icon?size=96',
        image: data.image,
        tag: data.tag || 'general',
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || [],
        data: data.data || {}
      };
      
      event.waitUntil(
        self.registration.showNotification(
          data.title || 'BookedBarber',
          options
        )
      );
    } catch (error) {
      console.error('❌ Push notification error:', error);
    }
  }

  // Notification click handler
  async handleNotificationClick(event) {
    event.notification.close();
    
    const data = event.notification.data || {};
    const url = data.url || '/';
    
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        // Check if there's already a window open
        for (const client of clients) {
          if (client.url.includes(url.split('?')[0]) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
    );
  }

  // Message handler for client communication
  async handleMessage(event) {
    const { data } = event;
    
    switch (data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
        
      case 'GET_OFFLINE_STATUS':
        const offlineData = await this.getOfflineStatus();
        event.ports[0].postMessage(offlineData);
        break;
        
      case 'CLEAR_CACHE':
        await this.clearAllCaches();
        event.ports[0].postMessage({ success: true });
        break;
        
      case 'FORCE_SYNC':
        if (self.registration.sync) {
          await self.registration.sync.register(SYNC_TAGS.SYNC_APPOINTMENTS);
        }
        break;
    }
  }

  // Get offline fallback response
  getOfflineFallback(request) {
    const url = new URL(request.url);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline') || new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>Offline - BookedBarber</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui; padding: 2rem; text-align: center; }
              .offline-icon { font-size: 4rem; margin-bottom: 1rem; }
            </style>
          </head>
          <body>
            <div class="offline-icon">📱</div>
            <h1>You're Offline</h1>
            <p>Please check your connection and try again.</p>
            <button onclick="window.location.reload()">Retry</button>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    
    // Return JSON error for API requests
    if (url.pathname.startsWith('/api/')) {
      return new Response(
        JSON.stringify({ 
          error: 'Offline', 
          message: 'You are currently offline. Some features may not be available.' 
        }),
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Return generic offline response
    return new Response('Offline', { status: 503 });
  }

  // Utility methods
  getActionType(url) {
    if (url.includes('/appointments')) return 'appointment';
    if (url.includes('/availability')) return 'availability';
    if (url.includes('/analytics')) return 'analytics';
    return 'general';
  }

  async getOfflineStatus() {
    try {
      const db = await dbPromise;
      const tx = db.transaction(['actionQueue'], 'readonly');
      const store = tx.objectStore('actionQueue');
      const queuedActions = await store.count();
      
      const cacheNames = await caches.keys();
      const cacheSize = cacheNames.length;
      
      return {
        queuedActions,
        cacheSize,
        isOnline: navigator.onLine,
        lastSync: localStorage.getItem('lastSyncTime')
      };
    } catch (error) {
      return { error: 'Failed to get offline status' };
    }
  }

  async clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }

  notifyClients(message) {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage(message);
      });
    });
  }

  async storeAPIDataOffline(request, response) {
    // Implementation for storing API data in IndexedDB
    // This would be specific to each API endpoint
  }

  async getOfflineAPIData(request) {
    // Implementation for retrieving API data from IndexedDB
    // This would be specific to each API endpoint
    return this.getOfflineFallback(request);
  }
}

// Initialize the PWA service worker
const pwaServiceWorker = new PWAServiceWorker();

console.log('🚀 BookedBarber PWA Service Worker v3.2.0 loaded');