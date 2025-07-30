/**
 * BookedBarber PWA Service Worker
 * Advanced offline-first caching strategy with calendar optimization
 * Enhanced mobile experience with haptic feedback and native features
 * Version: 6.0.0 - Production-Ready PWA
 * 
 * Features:
 * - Calendar-first offline functionality
 * - Client data caching for poor connectivity
 * - Background appointment sync
 * - Revenue analytics offline support
 * - Six Figure Barber methodology integration
 * - Production-ready error handling
 * - Improved network resilience
 */

const CACHE_VERSION = 'bb-v6.1.0';
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

// Calendar-specific routes for offline access - Enhanced for barber workflows
// NOTE: API routes removed to prevent CSP violations - only UI routes cached
const CALENDAR_ROUTES = [
  '/calendar',
  '/dashboard',
  '/clients',
  '/my-schedule',
  '/analytics',
];

// API endpoints to cache for offline functionality - DISABLED to prevent CSP violations
// NOTE: All API caching disabled to avoid CSP issues in Docker environment
const CACHE_API_PATTERNS = [
  // API caching disabled - service worker now skips all /api/ requests
];

// Background sync tags - Enhanced for barber workflow
const SYNC_TAGS = {
  SYNC_APPOINTMENTS: 'sync-appointments',
  SYNC_AVAILABILITY: 'sync-availability',
  SYNC_ANALYTICS: 'sync-analytics',
  SYNC_CLIENT_DATA: 'sync-client-data',
  SYNC_PAYMENTS: 'sync-payments',
  SYNC_NOTIFICATIONS: 'sync-notifications',
  SYNC_REVENUE_DATA: 'sync-revenue-data',
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
          const analyticsStore = db.createObjectStore('analyticsCache', { 
            keyPath: 'key' 
          });
          analyticsStore.createIndex('timestamp', 'timestamp');
          analyticsStore.createIndex('type', 'type');
        }
        
        // Client data cache for offline access
        if (!db.objectStoreNames.contains('clientCache')) {
          const clientStore = db.createObjectStore('clientCache', { 
            keyPath: 'id' 
          });
          clientStore.createIndex('name', 'name');
          clientStore.createIndex('phone', 'phone');
          clientStore.createIndex('lastVisit', 'lastVisit');
        }
        
        // Revenue data cache for Six Figure Barber analytics
        if (!db.objectStoreNames.contains('revenueCache')) {
          const revenueStore = db.createObjectStore('revenueCache', { 
            keyPath: 'id',
            autoIncrement: true
          });
          revenueStore.createIndex('date', 'date');
          revenueStore.createIndex('amount', 'amount');
          revenueStore.createIndex('barberId', 'barberId');
        }
        
        // Service data cache
        if (!db.objectStoreNames.contains('serviceCache')) {
          const serviceStore = db.createObjectStore('serviceCache', { 
            keyPath: 'id' 
          });
          serviceStore.createIndex('name', 'name');
          serviceStore.createIndex('price', 'price');
          serviceStore.createIndex('duration', 'duration');
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
    
    // Skip external analytics and tracking domains to avoid CSP violations
    const externalDomains = [
      'www.googletagmanager.com',
      'www.google-analytics.com', 
      'connect.facebook.net',
      'js.stripe.com'
    ];
    if (externalDomains.some(domain => url.hostname.includes(domain))) {
      // Let external requests go directly without service worker interference
      return;
    }
    
    // Skip service worker for ALL API endpoints to avoid CSP/CORS issues
    if (url.pathname.startsWith('/api/') || url.pathname.includes('/auth/') || url.pathname.includes('/login')) {
      // Don't intercept API requests - let them go directly to server
      return;
    }
    
    // Skip cache for non-GET requests (except for offline fallback)
    if (request.method !== 'GET') {
      event.respondWith(
        fetch(request).catch(error => {
          console.warn('🔄 Network request failed, attempting offline fallback:', error);
          return this.handleOfflineAction(request);
        })
      );
      return;
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
      
      // 3. API Calls - DISABLED to prevent CSP violations
      // API caching completely disabled - all API requests go directly to network
      // if (CACHE_API_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      //   return await this.apiNetworkFirst(request);
      // }
      
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
        if (request.url.includes('/api/v2/appointments')) {
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
    
    switch (event.tag) {
      case SYNC_TAGS.SYNC_APPOINTMENTS:
        event.waitUntil(this.syncOfflineActions());
        break;
      case SYNC_TAGS.SYNC_CLIENT_DATA:
        event.waitUntil(this.syncClientData());
        break;
      case SYNC_TAGS.SYNC_REVENUE_DATA:
        event.waitUntil(this.syncRevenueData());
        break;
      case SYNC_TAGS.SYNC_ANALYTICS:
        event.waitUntil(this.syncAnalyticsData());
        break;
      case SYNC_TAGS.SYNC_PAYMENTS:
        event.waitUntil(this.syncPaymentData());
        break;
      default:
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
    try {
      const url = new URL(request.url);
      const data = await response.json();
      const db = await dbPromise;
      
      // Store different types of data in appropriate stores
      if (url.pathname.includes('/clients')) {
        await this.storeClientData(db, data);
      } else if (url.pathname.includes('/analytics') || url.pathname.includes('/revenue')) {
        await this.storeAnalyticsData(db, data);
      } else if (url.pathname.includes('/services')) {
        await this.storeServiceData(db, data);
      }
    } catch (error) {
      console.warn('Failed to store API data offline:', error);
    }
  }

  async getOfflineAPIData(request) {
    try {
      const url = new URL(request.url);
      const db = await dbPromise;
      
      if (url.pathname.includes('/clients')) {
        return await this.getOfflineClientData(db, request);
      } else if (url.pathname.includes('/analytics') || url.pathname.includes('/revenue')) {
        return await this.getOfflineAnalyticsData(db, request);
      } else if (url.pathname.includes('/services')) {
        return await this.getOfflineServiceData(db, request);
      }
    } catch (error) {
      console.warn('Failed to get offline API data:', error);
    }
    
    return this.getOfflineFallback(request);
  }

  // Enhanced sync methods for different data types
  async syncClientData() {
    try {
      const db = await dbPromise;
      const tx = db.transaction(['clientCache'], 'readonly');
      const store = tx.objectStore('clientCache');
      const clients = await store.getAll();
      
      console.log(`📤 Syncing ${clients.length} cached clients`);
      
      // Sync client data with server
      for (const client of clients) {
        try {
          const response = await fetch(`/api/v2/clients/${client.id}`);
          if (response.ok) {
            const updatedClient = await response.json();
            // Update local cache with server data
            const updateTx = db.transaction(['clientCache'], 'readwrite');
            const updateStore = updateTx.objectStore('clientCache');
            await updateStore.put(updatedClient);
          }
        } catch (error) {
          console.warn('Failed to sync client:', client.id, error);
        }
      }
    } catch (error) {
      console.error('❌ Client data sync failed:', error);
    }
  }

  async syncRevenueData() {
    try {
      const db = await dbPromise;
      const tx = db.transaction(['revenueCache'], 'readonly');
      const store = tx.objectStore('revenueCache');
      const revenueData = await store.getAll();
      
      console.log(`📤 Syncing ${revenueData.length} revenue records`);
      
      // Send offline revenue data to server
      for (const record of revenueData) {
        try {
          if (record.needsSync) {
            const response = await fetch('/api/v2/revenue', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(record)
            });
            
            if (response.ok) {
              // Remove synced record
              const deleteTx = db.transaction(['revenueCache'], 'readwrite');
              const deleteStore = deleteTx.objectStore('revenueCache');
              await deleteStore.delete(record.id);
            }
          }
        } catch (error) {
          console.warn('Failed to sync revenue record:', record.id, error);
        }
      }
    } catch (error) {
      console.error('❌ Revenue data sync failed:', error);
    }
  }

  async syncAnalyticsData() {
    try {
      const db = await dbPromise;
      const tx = db.transaction(['analyticsCache'], 'readonly');
      const store = tx.objectStore('analyticsCache');
      const analyticsData = await store.getAll();
      
      console.log(`📤 Syncing ${analyticsData.length} analytics records`);
      
      // Batch send analytics data
      const batchData = analyticsData.filter(data => data.needsSync);
      if (batchData.length > 0) {
        try {
          const response = await fetch('/api/v2/analytics/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events: batchData })
          });
          
          if (response.ok) {
            // Mark as synced
            const updateTx = db.transaction(['analyticsCache'], 'readwrite');
            const updateStore = updateTx.objectStore('analyticsCache');
            for (const data of batchData) {
              data.needsSync = false;
              await updateStore.put(data);
            }
          }
        } catch (error) {
          console.warn('Failed to sync analytics batch:', error);
        }
      }
    } catch (error) {
      console.error('❌ Analytics data sync failed:', error);
    }
  }

  async syncPaymentData() {
    try {
      // Sync payment-related data and notifications
      const response = await fetch('/api/v2/payments/sync');
      if (response.ok) {
        const syncData = await response.json();
        
        // Update local payment cache
        if (syncData.payments) {
          const db = await dbPromise;
          const tx = db.transaction(['revenueCache'], 'readwrite');
          const store = tx.objectStore('revenueCache');
          
          for (const payment of syncData.payments) {
            await store.put({
              id: payment.id,
              amount: payment.amount,
              date: payment.date,
              barberId: payment.barber_id,
              type: 'payment',
              timestamp: Date.now()
            });
          }
        }
        
        // Notify client about payment updates
        this.notifyClients({
          type: 'PAYMENT_SYNC_COMPLETE',
          data: syncData
        });
      }
    } catch (error) {
      console.error('❌ Payment data sync failed:', error);
    }
  }

  // Helper methods for storing different data types
  async storeClientData(db, data) {
    const tx = db.transaction(['clientCache'], 'readwrite');
    const store = tx.objectStore('clientCache');
    
    if (Array.isArray(data)) {
      for (const client of data) {
        await store.put({
          ...client,
          lastUpdated: Date.now()
        });
      }
    } else {
      await store.put({
        ...data,
        lastUpdated: Date.now()
      });
    }
  }

  async storeAnalyticsData(db, data) {
    const tx = db.transaction(['analyticsCache'], 'readwrite');
    const store = tx.objectStore('analyticsCache');
    
    await store.put({
      key: `analytics_${Date.now()}`,
      data: data,
      timestamp: Date.now(),
      type: 'analytics'
    });
  }

  async storeServiceData(db, data) {
    const tx = db.transaction(['serviceCache'], 'readwrite');
    const store = tx.objectStore('serviceCache');
    
    if (Array.isArray(data)) {
      for (const service of data) {
        await store.put(service);
      }
    } else {
      await store.put(data);
    }
  }

  async getOfflineClientData(db, request) {
    const tx = db.transaction(['clientCache'], 'readonly');
    const store = tx.objectStore('clientCache');
    const clients = await store.getAll();
    
    return new Response(JSON.stringify(clients), {
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Data': 'true',
        'X-Cache-Date': new Date().toISOString()
      }
    });
  }

  async getOfflineAnalyticsData(db, request) {
    const tx = db.transaction(['analyticsCache'], 'readonly');
    const store = tx.objectStore('analyticsCache');
    const analytics = await store.getAll();
    
    return new Response(JSON.stringify(analytics), {
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Data': 'true',
        'X-Cache-Date': new Date().toISOString()
      }
    });
  }

  async getOfflineServiceData(db, request) {
    const tx = db.transaction(['serviceCache'], 'readonly');
    const store = tx.objectStore('serviceCache');
    const services = await store.getAll();
    
    return new Response(JSON.stringify(services), {
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Data': 'true',
        'X-Cache-Date': new Date().toISOString()
      }
    });
  }
}

// Initialize the PWA service worker
const pwaServiceWorker = new PWAServiceWorker();

console.log('🚀 BookedBarber PWA Service Worker v3.2.0 loaded');