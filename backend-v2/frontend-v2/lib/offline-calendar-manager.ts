/**
 * Offline Calendar Manager
 * Advanced offline calendar functionality with intelligent sync
 * Fresha-inspired mobile experience for barber workflows
 */

export interface OfflineAppointment {
  id: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  serviceName: string;
  serviceId: string;
  duration: number;
  price: number;
  startTime: string;
  endTime: string;
  date: string;
  barberId: string;
  barberName: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  isOfflineCreated: boolean;
  offlineId?: string;
  syncStatus: 'pending' | 'synced' | 'failed';
  conflictData?: any;
  lastModified: number;
}

export interface CalendarConflict {
  id: string;
  type: 'time_overlap' | 'double_booking' | 'service_mismatch';
  localAppointment: OfflineAppointment;
  serverAppointment: any;
  resolution: 'use_local' | 'use_server' | 'merge' | 'manual';
  timestamp: number;
}

export interface OfflineSync {
  queuedAppointments: number;
  lastSyncTime: number;
  conflicts: number;
  networkStatus: 'online' | 'offline' | 'slow';
  autoSyncEnabled: boolean;
}

class OfflineCalendarManager {
  private db: IDBDatabase | null = null;
  private dbVersion = 3;
  private syncQueue: OfflineAppointment[] = [];
  private isOnline = true; // Default to online
  private autoSyncInterval: NodeJS.Timeout | null = null;
  private conflictResolver: ConflictResolver;
  private isBrowser = typeof window !== 'undefined';

  constructor() {
    this.conflictResolver = new ConflictResolver();
    
    // Only initialize browser-specific features if in browser environment
    if (this.isBrowser) {
      this.isOnline = navigator.onLine;
      this.initializeDatabase();
      this.setupNetworkListeners();
      this.startAutoSync();
    }
  }

  /**
   * Initialize IndexedDB for offline storage
   */
  private async initializeDatabase(): Promise<void> {
    if (!this.isBrowser || typeof indexedDB === 'undefined') {
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('BookedBarberCalendar', this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Appointments store
        if (!db.objectStoreNames.contains('appointments')) {
          const appointmentStore = db.createObjectStore('appointments', {
            keyPath: 'id'
          });
          appointmentStore.createIndex('date', 'date');
          appointmentStore.createIndex('barberId', 'barberId');
          appointmentStore.createIndex('syncStatus', 'syncStatus');
          appointmentStore.createIndex('isOfflineCreated', 'isOfflineCreated');
        }

        // Conflicts store
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictStore = db.createObjectStore('conflicts', {
            keyPath: 'id'
          });
          conflictStore.createIndex('timestamp', 'timestamp');
          conflictStore.createIndex('type', 'type');
        }

        // Calendar cache for availability
        if (!db.objectStoreNames.contains('availability')) {
          const availabilityStore = db.createObjectStore('availability', {
            keyPath: 'id'
          });
          availabilityStore.createIndex('barberId', 'barberId');
          availabilityStore.createIndex('date', 'date');
        }

        // Services cache
        if (!db.objectStoreNames.contains('services')) {
          const servicesStore = db.createObjectStore('services', {
            keyPath: 'id'
          });
          servicesStore.createIndex('barberId', 'barberId');
          servicesStore.createIndex('category', 'category');
        }

        // Barber profiles cache
        if (!db.objectStoreNames.contains('barbers')) {
          const barbersStore = db.createObjectStore('barbers', {
            keyPath: 'id'
          });
          barbersStore.createIndex('name', 'name');
          barbersStore.createIndex('isActive', 'isActive');
        }
      };
    });
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    if (!this.isBrowser || typeof window === 'undefined') {
      return;
    }
    
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingAppointments();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Start automatic synchronization when online
   */
  private startAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    this.autoSyncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncPendingAppointments();
      }
    }, 30000); // Sync every 30 seconds when online
  }

  /**
   * Create a new appointment (offline-first)
   */
  async createAppointment(appointmentData: Partial<OfflineAppointment>): Promise<OfflineAppointment> {
    const appointment: OfflineAppointment = {
      id: this.generateOfflineId(),
      clientName: appointmentData.clientName || '',
      clientPhone: appointmentData.clientPhone,
      clientEmail: appointmentData.clientEmail,
      serviceName: appointmentData.serviceName || '',
      serviceId: appointmentData.serviceId || '',
      duration: appointmentData.duration || 60,
      price: appointmentData.price || 0,
      startTime: appointmentData.startTime || '',
      endTime: appointmentData.endTime || '',
      date: appointmentData.date || '',
      barberId: appointmentData.barberId || '',
      barberName: appointmentData.barberName || '',
      status: 'scheduled',
      notes: appointmentData.notes,
      isOfflineCreated: !this.isOnline,
      offlineId: this.generateOfflineId(),
      syncStatus: this.isOnline ? 'pending' : 'pending',
      lastModified: Date.now()
    };

    // Store locally first
    await this.storeAppointmentLocal(appointment);

    // Try to sync immediately if online
    if (this.isOnline) {
      try {
        const syncedAppointment = await this.syncAppointmentToServer(appointment);
        return syncedAppointment;
      } catch (error) {
        console.warn('Failed to sync immediately, will retry later:', error);
        return appointment;
      }
    }

    return appointment;
  }

  /**
   * Update an existing appointment
   */
  async updateAppointment(appointmentId: string, updates: Partial<OfflineAppointment>): Promise<OfflineAppointment> {
    const existing = await this.getAppointmentLocal(appointmentId);
    if (!existing) {
      throw new Error('Appointment not found');
    }

    const updated: OfflineAppointment = {
      ...existing,
      ...updates,
      lastModified: Date.now(),
      syncStatus: 'pending'
    };

    await this.storeAppointmentLocal(updated);

    if (this.isOnline) {
      try {
        return await this.syncAppointmentToServer(updated);
      } catch (error) {
        console.warn('Failed to sync update, will retry later:', error);
        return updated;
      }
    }

    return updated;
  }

  /**
   * Delete an appointment
   */
  async deleteAppointment(appointmentId: string): Promise<void> {
    if (this.isOnline) {
      try {
        // Try to delete from server first
        await this.deleteAppointmentFromServer(appointmentId);
      } catch (error) {
        console.warn('Failed to delete from server, marking for deletion:', error);
        // Mark for deletion instead
        const appointment = await this.getAppointmentLocal(appointmentId);
        if (appointment) {
          appointment.status = 'cancelled';
          appointment.syncStatus = 'pending';
          appointment.lastModified = Date.now();
          await this.storeAppointmentLocal(appointment);
        }
        return;
      }
    }

    // Delete from local storage
    await this.deleteAppointmentLocal(appointmentId);
  }

  /**
   * Get appointments for a specific date range
   */
  async getAppointments(startDate: string, endDate: string, barberId?: string): Promise<OfflineAppointment[]> {
    if (!this.db) await this.initializeDatabase();

    const transaction = this.db!.transaction(['appointments'], 'readonly');
    const store = transaction.objectStore('appointments');
    const dateIndex = store.index('date');
    
    const range = IDBKeyRange.bound(startDate, endDate);
    const appointments: OfflineAppointment[] = [];

    return new Promise((resolve, reject) => {
      const request = dateIndex.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const appointment = cursor.value;
          if (!barberId || appointment.barberId === barberId) {
            appointments.push(appointment);
          }
          cursor.continue();
        } else {
          resolve(appointments.sort((a, b) => 
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          ));
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get sync status and offline statistics
   */
  async getSyncStatus(): Promise<OfflineSync> {
    if (!this.db) await this.initializeDatabase();

    const transaction = this.db!.transaction(['appointments', 'conflicts'], 'readonly');
    const appointmentStore = transaction.objectStore('appointments');
    const conflictStore = transaction.objectStore('conflicts');

    const pendingRequest = appointmentStore.index('syncStatus').count('pending');
    const conflictsRequest = conflictStore.count();

    const [queuedAppointments, conflicts] = await Promise.all([
      this.promisifyRequest(pendingRequest),
      this.promisifyRequest(conflictsRequest)
    ]);

    const lastSyncTime = parseInt(localStorage.getItem('lastCalendarSync') || '0');
    const autoSyncEnabled = localStorage.getItem('autoSyncEnabled') !== 'false';

    return {
      queuedAppointments,
      lastSyncTime,
      conflicts,
      networkStatus: this.isOnline ? 'online' : 'offline',
      autoSyncEnabled
    };
  }

  /**
   * Sync all pending appointments with the server
   */
  async syncPendingAppointments(): Promise<void> {
    if (!this.isOnline || !this.db) return;


    const transaction = this.db.transaction(['appointments'], 'readonly');
    const store = transaction.objectStore('appointments');
    const index = store.index('syncStatus');
    const pendingAppointments: OfflineAppointment[] = [];

    return new Promise((resolve) => {
      const request = index.openCursor('pending');
      
      request.onsuccess = async (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          pendingAppointments.push(cursor.value);
          cursor.continue();
        } else {
          // Sync all pending appointments
          for (const appointment of pendingAppointments) {
            try {
              await this.syncAppointmentToServer(appointment);
            } catch (error) {
              console.error('Sync failed for appointment:', appointment.id, error);
            }
          }
          
          localStorage.setItem('lastCalendarSync', Date.now().toString());
          resolve();
        }
      };
    });
  }

  /**
   * Handle conflicts when syncing
   */
  async resolveConflicts(): Promise<CalendarConflict[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction(['conflicts'], 'readonly');
    const store = transaction.objectStore('conflicts');
    const conflicts: CalendarConflict[] = [];

    return new Promise((resolve) => {
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          conflicts.push(cursor.value);
          cursor.continue();
        } else {
          resolve(conflicts);
        }
      };
    });
  }

  /**
   * Cache barber data for offline access
   */
  async cacheBarberData(barbers: any[]): Promise<void> {
    if (!this.db) await this.initializeDatabase();

    const transaction = this.db!.transaction(['barbers'], 'readwrite');
    const store = transaction.objectStore('barbers');

    for (const barber of barbers) {
      await this.promisifyRequest(store.put({
        ...barber,
        cachedAt: Date.now()
      }));
    }
  }

  /**
   * Cache services data for offline access
   */
  async cacheServicesData(services: any[]): Promise<void> {
    if (!this.db) await this.initializeDatabase();

    const transaction = this.db!.transaction(['services'], 'readwrite');
    const store = transaction.objectStore('services');

    for (const service of services) {
      await this.promisifyRequest(store.put({
        ...service,
        cachedAt: Date.now()
      }));
    }
  }

  /**
   * Get cached barber data
   */
  async getCachedBarbers(): Promise<any[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction(['barbers'], 'readonly');
    const store = transaction.objectStore('barbers');
    const barbers: any[] = [];

    return new Promise((resolve) => {
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          barbers.push(cursor.value);
          cursor.continue();
        } else {
          resolve(barbers);
        }
      };
    });
  }

  /**
   * Private helper methods
   */
  private async storeAppointmentLocal(appointment: OfflineAppointment): Promise<void> {
    if (!this.db) await this.initializeDatabase();

    const transaction = this.db!.transaction(['appointments'], 'readwrite');
    const store = transaction.objectStore('appointments');
    
    await this.promisifyRequest(store.put(appointment));
  }

  private async getAppointmentLocal(id: string): Promise<OfflineAppointment | null> {
    if (!this.db) return null;

    const transaction = this.db.transaction(['appointments'], 'readonly');
    const store = transaction.objectStore('appointments');
    
    const result = await this.promisifyRequest(store.get(id));
    return result || null;
  }

  private async deleteAppointmentLocal(id: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['appointments'], 'readwrite');
    const store = transaction.objectStore('appointments');
    
    await this.promisifyRequest(store.delete(id));
  }

  private async syncAppointmentToServer(appointment: OfflineAppointment): Promise<OfflineAppointment> {
    // Implementation would sync with actual API
    // For now, simulate API call
    const response = await fetch('/api/v2/appointments', {
      method: appointment.isOfflineCreated ? 'POST' : 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointment)
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }

    const syncedAppointment = await response.json();
    
    // Update local copy with server data
    const updatedAppointment: OfflineAppointment = {
      ...appointment,
      ...syncedAppointment,
      syncStatus: 'synced',
      isOfflineCreated: false
    };

    await this.storeAppointmentLocal(updatedAppointment);
    return updatedAppointment;
  }

  private async deleteAppointmentFromServer(id: string): Promise<void> {
    const response = await fetch(`/api/v2/appointments/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }
  }

  private generateOfflineId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private promisifyRequest(request: IDBRequest): Promise<any> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

/**
 * Conflict Resolution System
 */
class ConflictResolver {
  /**
   * Resolve appointment conflicts using smart merge strategies
   */
  async resolveConflict(conflict: CalendarConflict): Promise<OfflineAppointment> {
    switch (conflict.type) {
      case 'time_overlap':
        return this.resolveTimeOverlap(conflict);
      case 'double_booking':
        return this.resolveDoubleBooking(conflict);
      case 'service_mismatch':
        return this.resolveServiceMismatch(conflict);
      default:
        return conflict.localAppointment;
    }
  }

  private resolveTimeOverlap(conflict: CalendarConflict): OfflineAppointment {
    // Use the most recent modification
    const localTime = conflict.localAppointment.lastModified;
    const serverTime = conflict.serverAppointment.lastModified || 0;
    
    return localTime > serverTime 
      ? conflict.localAppointment 
      : conflict.serverAppointment;
  }

  private resolveDoubleBooking(conflict: CalendarConflict): OfflineAppointment {
    // Prefer confirmed appointments over pending ones
    if (conflict.localAppointment.status === 'scheduled' && 
        conflict.serverAppointment.status === 'pending') {
      return conflict.localAppointment;
    }
    
    return conflict.serverAppointment;
  }

  private resolveServiceMismatch(conflict: CalendarConflict): OfflineAppointment {
    // Merge service information, preferring local changes
    return {
      ...conflict.serverAppointment,
      serviceName: conflict.localAppointment.serviceName,
      serviceId: conflict.localAppointment.serviceId,
      price: conflict.localAppointment.price,
      duration: conflict.localAppointment.duration
    };
  }
}

// Export singleton instance
export const offlineCalendarManager = new OfflineCalendarManager();
export default offlineCalendarManager;