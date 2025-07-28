/**
 * Offline Data Manager for BookedBarber PWA
 * Comprehensive IndexedDB wrapper with conflict resolution
 * Version: 3.2.0
 */

export interface OfflineAction {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
  type: 'appointment' | 'availability' | 'analytics' | 'general';
  retryCount?: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
}

export interface CalendarData {
  id: string;
  url: string;
  data: any;
  timestamp: number;
  date: string;
  barberId?: string;
  hash?: string; // For conflict detection
}

export interface OfflineAppointment {
  id?: number;
  tempId: string; // Temporary ID for offline appointments
  serverId?: string; // Server-assigned ID after sync
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  barberId: string;
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
  isOfflineCreated: boolean;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
  conflictData?: any; // Store conflicting server data
  lastModified: number;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
  errors: Array<{ action: OfflineAction; error: string }>;
}

class OfflineDataManager {
  private dbName = 'BookedBarberOffline';
  private dbVersion = 3;
  private db: IDBDatabase | null = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.upgradeDatabase(db, event.oldVersion);
      };
    });
  }

  private upgradeDatabase(db: IDBDatabase, oldVersion: number): void {

    // Action Queue Store
    if (!db.objectStoreNames.contains('actionQueue')) {
      const actionStore = db.createObjectStore('actionQueue', {
        keyPath: 'id',
        autoIncrement: true
      });
      actionStore.createIndex('timestamp', 'timestamp');
      actionStore.createIndex('type', 'type');
      actionStore.createIndex('status', 'status');
    }

    // Calendar Cache Store
    if (!db.objectStoreNames.contains('calendarCache')) {
      const calendarStore = db.createObjectStore('calendarCache', {
        keyPath: 'id'
      });
      calendarStore.createIndex('date', 'date');
      calendarStore.createIndex('barberId', 'barberId');
      calendarStore.createIndex('timestamp', 'timestamp');
    }

    // Offline Appointments Store
    if (!db.objectStoreNames.contains('offlineAppointments')) {
      const appointmentStore = db.createObjectStore('offlineAppointments', {
        keyPath: 'id',
        autoIncrement: true
      });
      appointmentStore.createIndex('tempId', 'tempId', { unique: true });
      appointmentStore.createIndex('serverId', 'serverId');
      appointmentStore.createIndex('date', 'date');
      appointmentStore.createIndex('syncStatus', 'syncStatus');
      appointmentStore.createIndex('barberId', 'barberId');
    }

    // Analytics Cache Store
    if (!db.objectStoreNames.contains('analyticsCache')) {
      const analyticsStore = db.createObjectStore('analyticsCache', {
        keyPath: 'key'
      });
      analyticsStore.createIndex('timestamp', 'timestamp');
      analyticsStore.createIndex('type', 'type');
    }

    // User Preferences Store
    if (!db.objectStoreNames.contains('userPreferences')) {
      db.createObjectStore('userPreferences', {
        keyPath: 'key'
      });
    }

    // Sync Metadata Store
    if (!db.objectStoreNames.contains('syncMetadata')) {
      const syncStore = db.createObjectStore('syncMetadata', {
        keyPath: 'key'
      });
      syncStore.createIndex('timestamp', 'timestamp');
    }
  }

  /**
   * Store appointment offline (alias for addOfflineAppointment for PWA compatibility)
   */
  async storeAppointmentOffline(appointmentData: any): Promise<any> {
    return this.addOfflineAppointment(appointmentData);
  }

  // Action Queue Management
  async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'status'>): Promise<number> {
    await this.ensureInitialized();
    
    const fullAction: OfflineAction = {
      ...action,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actionQueue'], 'readwrite');
      const store = transaction.objectStore('actionQueue');
      const request = store.add(fullAction);

      request.onsuccess = () => {
        resolve(request.result as number);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getQueuedActions(): Promise<OfflineAction[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actionQueue'], 'readonly');
      const store = transaction.objectStore('actionQueue');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateActionStatus(id: number, status: OfflineAction['status'], retryCount?: number): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actionQueue'], 'readwrite');
      const store = transaction.objectStore('actionQueue');
      const request = store.get(id);

      request.onsuccess = () => {
        const action = request.result;
        if (action) {
          action.status = status;
          if (retryCount !== undefined) {
            action.retryCount = retryCount;
          }
          
          const updateRequest = store.put(action);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error('Action not found'));
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async removeAction(id: number): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actionQueue'], 'readwrite');
      const store = transaction.objectStore('actionQueue');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Calendar Data Management
  async cacheCalendarData(data: Omit<CalendarData, 'id' | 'timestamp' | 'hash'>): Promise<void> {
    await this.ensureInitialized();

    const calendarData: CalendarData = {
      id: `${data.url}-${Date.now()}`,
      ...data,
      timestamp: Date.now(),
      hash: this.generateHash(JSON.stringify(data.data))
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['calendarCache'], 'readwrite');
      const store = transaction.objectStore('calendarCache');
      const request = store.put(calendarData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCalendarData(url: string, maxAge: number = 86400000): Promise<CalendarData[]> {
    await this.ensureInitialized();

    const cutoffTime = Date.now() - maxAge;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['calendarCache'], 'readonly');
      const store = transaction.objectStore('calendarCache');
      const index = store.index('timestamp');
      const range = IDBKeyRange.lowerBound(cutoffTime);
      const request = index.getAll(range);

      request.onsuccess = () => {
        const results = request.result.filter((item: CalendarData) => 
          item.url === url
        );
        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Offline Appointments Management
  async createOfflineAppointment(appointment: Omit<OfflineAppointment, 'id' | 'tempId' | 'isOfflineCreated' | 'syncStatus' | 'lastModified'>): Promise<string> {
    await this.ensureInitialized();

    const tempId = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const offlineAppointment: OfflineAppointment = {
      ...appointment,
      tempId,
      isOfflineCreated: true,
      syncStatus: 'pending',
      lastModified: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineAppointments'], 'readwrite');
      const store = transaction.objectStore('offlineAppointments');
      const request = store.add(offlineAppointment);

      request.onsuccess = () => {
        resolve(tempId);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getOfflineAppointments(filters?: {
    barberId?: string;
    date?: string;
    syncStatus?: OfflineAppointment['syncStatus'];
  }): Promise<OfflineAppointment[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineAppointments'], 'readonly');
      const store = transaction.objectStore('offlineAppointments');
      const request = store.getAll();

      request.onsuccess = () => {
        let results = request.result;

        if (filters) {
          if (filters.barberId) {
            results = results.filter(apt => apt.barberId === filters.barberId);
          }
          if (filters.date) {
            results = results.filter(apt => apt.date === filters.date);
          }
          if (filters.syncStatus) {
            results = results.filter(apt => apt.syncStatus === filters.syncStatus);
          }
        }

        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async updateOfflineAppointment(tempId: string, updates: Partial<OfflineAppointment>): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineAppointments'], 'readwrite');
      const store = transaction.objectStore('offlineAppointments');
      const index = store.index('tempId');
      const request = index.get(tempId);

      request.onsuccess = () => {
        const appointment = request.result;
        if (appointment) {
          Object.assign(appointment, updates, { lastModified: Date.now() });
          
          const updateRequest = store.put(appointment);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error('Appointment not found'));
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Sync Operations
  async syncWithServer(): Promise<SyncResult> {
    await this.ensureInitialized();

    
    const result: SyncResult = {
      success: false,
      synced: 0,
      failed: 0,
      conflicts: 0,
      errors: []
    };

    try {
      // Get all pending actions
      const actions = await this.getQueuedActions();
      const pendingActions = actions.filter(action => 
        action.status === 'pending' || action.status === 'failed'
      );


      for (const action of pendingActions) {
        try {
          await this.updateActionStatus(action.id!, 'syncing');
          
          const response = await this.syncAction(action);
          
          if (response.ok) {
            await this.removeAction(action.id!);
            result.synced++;
          } else if (response.status === 409) {
            // Conflict detected
            result.conflicts++;
            await this.handleSyncConflict(action, response);
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
        } catch (error) {
          result.failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push({ action, error: errorMessage });
          
          const retryCount = (action.retryCount || 0) + 1;
          if (retryCount < 5) {
            await this.updateActionStatus(action.id!, 'failed', retryCount);
          } else {
            console.error('❌ Max retries reached for action:', action.url);
            await this.removeAction(action.id!);
          }
        }
      }

      // Sync offline appointments
      await this.syncOfflineAppointments(result);

      result.success = result.failed === 0 && result.conflicts === 0;
      
      // Update sync metadata
      await this.updateSyncMetadata({
        lastSyncTime: Date.now(),
        lastSyncResult: result
      });

      return result;

    } catch (error) {
      console.error('❌ Sync failed:', error);
      result.success = false;
      return result;
    }
  }

  private async syncAction(action: OfflineAction): Promise<Response> {
    const request = new Request(action.url, {
      method: action.method,
      headers: action.headers,
      body: action.body || undefined
    });

    return fetch(request);
  }

  private async syncOfflineAppointments(result: SyncResult): Promise<void> {
    const offlineAppointments = await this.getOfflineAppointments({
      syncStatus: 'pending'
    });

    for (const appointment of offlineAppointments) {
      try {
        await this.updateOfflineAppointment(appointment.tempId, { syncStatus: 'syncing' });
        
        // Create appointment on server
        const response = await fetch('/api/v2/appointments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_name: appointment.clientName,
            client_email: appointment.clientEmail,
            client_phone: appointment.clientPhone,
            barber_id: appointment.barberId,
            service_id: appointment.serviceId,
            date: appointment.date,
            start_time: appointment.startTime,
            end_time: appointment.endTime,
            notes: appointment.notes,
            temp_id: appointment.tempId
          })
        });

        if (response.ok) {
          const serverAppointment = await response.json();
          await this.updateOfflineAppointment(appointment.tempId, {
            serverId: serverAppointment.id,
            syncStatus: 'synced'
          });
          result.synced++;
        } else if (response.status === 409) {
          // Conflict - time slot taken
          const conflictData = await response.json();
          await this.updateOfflineAppointment(appointment.tempId, {
            syncStatus: 'conflict',
            conflictData
          });
          result.conflicts++;
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
        
      } catch (error) {
        await this.updateOfflineAppointment(appointment.tempId, { syncStatus: 'failed' });
        result.failed++;
        result.errors.push({
          action: {
            id: 0,
            url: '/api/v2/appointments',
            method: 'POST',
            headers: {},
            timestamp: appointment.lastModified,
            type: 'appointment',
            status: 'failed'
          },
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  private async handleSyncConflict(action: OfflineAction, response: Response): Promise<void> {
    console.warn('⚠️ Sync conflict detected for action:', action.url);
    
    const conflictData = await response.json();
    
    // Store conflict for user resolution
    await this.storeConflict({
      actionId: action.id!,
      conflictData,
      timestamp: Date.now()
    });
    
    await this.updateActionStatus(action.id!, 'failed');
  }

  private async storeConflict(conflict: any): Promise<void> {
    // Implementation for storing conflicts for user resolution
  }

  // Utility Methods
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private generateHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private async updateSyncMetadata(metadata: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncMetadata'], 'readwrite');
      const store = transaction.objectStore('syncMetadata');
      
      Object.entries(metadata).forEach(([key, value]) => {
        store.put({ key, value, timestamp: Date.now() });
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Analytics and Status
  async getOfflineStats(): Promise<{
    queuedActions: number;
    offlineAppointments: number;
    cacheSize: number;
    lastSync?: number;
  }> {
    await this.ensureInitialized();

    const [actions, appointments] = await Promise.all([
      this.getQueuedActions(),
      this.getOfflineAppointments()
    ]);

    return {
      queuedActions: actions.filter(a => a.status === 'pending').length,
      offlineAppointments: appointments.filter(a => a.syncStatus === 'pending').length,
      cacheSize: await this.getCacheSize(),
      lastSync: await this.getLastSyncTime()
    };
  }

  private async getCacheSize(): Promise<number> {
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['calendarCache'], 'readonly');
      const store = transaction.objectStore('calendarCache');
      const request = store.count();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
  }

  private async getLastSyncTime(): Promise<number | undefined> {
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['syncMetadata'], 'readonly');
      const store = transaction.objectStore('syncMetadata');
      const request = store.get('lastSyncTime');
      
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => resolve(undefined);
    });
  }

  // Cleanup Methods
  async clearOldData(maxAge: number = 604800000): Promise<void> { // 7 days default
    await this.ensureInitialized();

    const cutoffTime = Date.now() - maxAge;

    // Clear old calendar cache
    const transaction = this.db!.transaction(['calendarCache'], 'readwrite');
    const store = transaction.objectStore('calendarCache');
    const index = store.index('timestamp');
    const range = IDBKeyRange.upperBound(cutoffTime);
    
    const request = index.openCursor(range);
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }

  async clearAllData(): Promise<void> {
    await this.ensureInitialized();

    const stores = ['actionQueue', 'calendarCache', 'offlineAppointments', 'analyticsCache'];
    
    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

  }
}

// Singleton instance
export const offlineDataManager = new OfflineDataManager();

// Export types for external use
export type { OfflineAction, CalendarData, OfflineAppointment, SyncResult };