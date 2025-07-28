/**
 * Real-time Calendar Performance Optimizations
 * 
 * Provides advanced performance optimizations for real-time calendar updates
 * including intelligent batching, debouncing, caching, and memory management.
 */

import { AppointmentEvent, CalendarConflict } from './realtime-calendar';

export interface PerformanceConfig {
  // Batching configuration
  batchSize: number;
  batchIntervalMs: number;
  maxBatchDelay: number;
  priorityThreshold: 'low' | 'medium' | 'high';
  
  // Debouncing configuration
  debounceMs: number;
  maxDebounceMs: number;
  enableSmartDebouncing: boolean;
  
  // Caching configuration
  enableCaching: boolean;
  cacheSize: number;
  cacheTTL: number; // milliseconds
  enablePreemptiveCache: boolean;
  
  // Memory management
  maxEventHistory: number;
  memoryCleanupInterval: number;
  enableMemoryMonitoring: boolean;
  
  // Network optimization
  enableCompression: boolean;
  enableDifferentialUpdates: boolean;
  retryAttempts: number;
  backoffMultiplier: number;
}

export interface PerformanceMetrics {
  eventProcessingLatency: number;
  batchProcessingCount: number;
  cacheHitRate: number;
  memoryUsage: number;
  networkLatency: number;
  droppedEvents: number;
  processedEventsPerSecond: number;
  averageBatchSize: number;
}

export class RealtimePerformanceManager {
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics;
  private eventCache: Map<string, CachedEvent> = new Map();
  private batchQueue: EventBatch[] = [];
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private processingStartTimes: Map<string, number> = new Map();
  private memoryMonitorInterval: NodeJS.Timeout | null = null;
  private performanceObserver: PerformanceObserver | null = null;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      batchSize: 10,
      batchIntervalMs: 1000,
      maxBatchDelay: 5000,
      priorityThreshold: 'medium',
      debounceMs: 300,
      maxDebounceMs: 2000,
      enableSmartDebouncing: true,
      enableCaching: true,
      cacheSize: 1000,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      enablePreemptiveCache: true,
      maxEventHistory: 500,
      memoryCleanupInterval: 30000, // 30 seconds
      enableMemoryMonitoring: true,
      enableCompression: false, // Would require implementation
      enableDifferentialUpdates: true,
      retryAttempts: 3,
      backoffMultiplier: 2,
      ...config,
    };

    this.metrics = {
      eventProcessingLatency: 0,
      batchProcessingCount: 0,
      cacheHitRate: 0,
      memoryUsage: 0,
      networkLatency: 0,
      droppedEvents: 0,
      processedEventsPerSecond: 0,
      averageBatchSize: 0,
    };

    this.initializePerformanceMonitoring();
  }

  private initializePerformanceMonitoring(): void {
    if (this.config.enableMemoryMonitoring) {
      this.startMemoryMonitoring();
    }

    // Initialize Performance Observer if available
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((entries) => {
        entries.getEntries().forEach(entry => {
          if (entry.name.startsWith('realtime-calendar')) {
            this.updateLatencyMetrics(entry.duration);
          }
        });
      });

      this.performanceObserver.observe({ entryTypes: ['measure'] });
    }
  }

  private startMemoryMonitoring(): void {
    this.memoryMonitorInterval = setInterval(() => {
      this.performMemoryCleanup();
      this.updateMemoryMetrics();
    }, this.config.memoryCleanupInterval);
  }

  // Intelligent Batching System
  public createBatchProcessor<T extends AppointmentEvent | CalendarConflict>(
    processor: (batch: T[]) => Promise<void>
  ): (event: T) => void {
    const batchKey = `batch_${Date.now()}`;
    let currentBatch: T[] = [];
    let batchTimer: NodeJS.Timeout | null = null;

    const processBatch = async () => {
      if (currentBatch.length === 0) return;

      const batch = [...currentBatch];
      currentBatch = [];
      
      const startTime = performance.now();
      
      try {
        await processor(batch);
        this.updateBatchMetrics(batch.length, performance.now() - startTime);
      } catch (error) {
        console.error('Batch processing failed:', error);
        this.metrics.droppedEvents += batch.length;
      }

      if (batchTimer) {
        clearTimeout(batchTimer);
        batchTimer = null;
      }
    };

    return (event: T) => {
      // Add to current batch
      currentBatch.push(event);

      // Check if batch should be processed immediately based on priority
      const shouldProcessImmediately = this.shouldProcessImmediately(event);
      
      if (shouldProcessImmediately || currentBatch.length >= this.config.batchSize) {
        processBatch();
        return;
      }

      // Set or reset batch timer
      if (batchTimer) {
        clearTimeout(batchTimer);
      }

      batchTimer = setTimeout(() => {
        processBatch();
      }, this.config.batchIntervalMs);
    };
  }

  private shouldProcessImmediately<T extends AppointmentEvent | CalendarConflict>(event: T): boolean {
    // Process high-priority events immediately
    if ('priority' in event && event.priority === 'high') {
      return true;
    }

    // Process conflicts immediately
    if ('severity' in event && event.severity === 'high') {
      return true;
    }

    // Process certain event types immediately
    if ('type' in event && ['cancelled', 'no_show', 'emergency'].includes(event.type)) {
      return true;
    }

    return false;
  }

  // Smart Debouncing System
  public createSmartDebouncer<T extends AppointmentEvent>(
    processor: (event: T) => void,
    keyExtractor: (event: T) => string = (event) => `${event.appointmentId}_${event.type}`
  ): (event: T) => void {
    return (event: T) => {
      const key = keyExtractor(event);
      const existingTimer = this.debounceTimers.get(key);

      // Clear existing timer
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Calculate dynamic debounce delay based on event characteristics
      const debounceDelay = this.calculateDebounceDelay(event);

      // Create new timer
      const timer = setTimeout(() => {
        processor(event);
        this.debounceTimers.delete(key);
      }, debounceDelay);

      this.debounceTimers.set(key, timer);
    };
  }

  private calculateDebounceDelay<T extends AppointmentEvent>(event: T): number {
    if (!this.config.enableSmartDebouncing) {
      return this.config.debounceMs;
    }

    let delay = this.config.debounceMs;

    // Reduce delay for high-priority events
    if (event.priority === 'high') {
      delay = Math.min(delay * 0.5, 100);
    }

    // Increase delay for low-priority events
    if (event.priority === 'low') {
      delay = Math.min(delay * 1.5, this.config.maxDebounceMs);
    }

    // Reduce delay for time-sensitive event types
    if (['check_in', 'no_show', 'cancelled'].includes(event.type)) {
      delay = Math.min(delay * 0.3, 200);
    }

    return Math.max(50, Math.min(delay, this.config.maxDebounceMs));
  }

  // Advanced Caching System
  public createEventCache(): EventCacheManager {
    return new EventCacheManager(this.config, (hitRate) => {
      this.metrics.cacheHitRate = hitRate;
    });
  }

  // Differential Update System
  public createDifferentialProcessor<T extends AppointmentEvent>(
    processor: (updates: DifferentialUpdate<T>[]) => void
  ): (events: T[]) => void {
    let lastSnapshot: Map<string, T> = new Map();

    return (events: T[]) => {
      if (!this.config.enableDifferentialUpdates) {
        processor(events.map(event => ({ type: 'update', event, previous: null })));
        return;
      }

      const currentSnapshot = new Map(events.map(event => [event.id, event]));
      const updates: DifferentialUpdate<T>[] = [];

      // Find new and updated events
      for (const [id, event] of currentSnapshot) {
        const previous = lastSnapshot.get(id);
        
        if (!previous) {
          updates.push({ type: 'create', event, previous: null });
        } else if (this.hasEventChanged(previous, event)) {
          updates.push({ type: 'update', event, previous });
        }
      }

      // Find deleted events
      for (const [id, event] of lastSnapshot) {
        if (!currentSnapshot.has(id)) {
          updates.push({ type: 'delete', event, previous: null });
        }
      }

      if (updates.length > 0) {
        processor(updates);
      }

      lastSnapshot = currentSnapshot;
    };
  }

  private hasEventChanged<T extends AppointmentEvent>(previous: T, current: T): boolean {
    // Compare key fields that would indicate a meaningful change
    const keyFields: (keyof AppointmentEvent)[] = [
      'type', 'clientName', 'serviceName', 'newTime', 'newDate', 'priority'
    ];

    return keyFields.some(field => previous[field] !== current[field]);
  }

  // Memory Management
  private performMemoryCleanup(): void {
    const now = Date.now();

    // Clean up expired cache entries
    for (const [key, entry] of this.eventCache) {
      if (now - entry.timestamp > this.config.cacheTTL) {
        this.eventCache.delete(key);
      }
    }

    // Clean up old debounce timers
    if (this.debounceTimers.size > 100) {
      // This is a simple cleanup - in production you'd want more sophisticated logic
      const oldTimers = Array.from(this.debounceTimers.entries()).slice(0, 50);
      oldTimers.forEach(([key, timer]) => {
        clearTimeout(timer);
        this.debounceTimers.delete(key);
      });
    }

    // Clean up batch queue if it's getting too large
    if (this.batchQueue.length > 50) {
      this.batchQueue = this.batchQueue.slice(-25);
    }
  }

  private updateMemoryMetrics(): void {
    // Estimate memory usage (simplified)
    const eventCacheSize = this.eventCache.size * 1024; // Rough estimate
    const debounceTimersSize = this.debounceTimers.size * 256;
    const batchQueueSize = this.batchQueue.length * 512;

    this.metrics.memoryUsage = eventCacheSize + debounceTimersSize + batchQueueSize;
  }

  private updateBatchMetrics(batchSize: number, processingTime: number): void {
    this.metrics.batchProcessingCount++;
    this.metrics.averageBatchSize = (
      (this.metrics.averageBatchSize * (this.metrics.batchProcessingCount - 1) + batchSize) /
      this.metrics.batchProcessingCount
    );
    
    // Update processing latency
    this.metrics.eventProcessingLatency = (
      (this.metrics.eventProcessingLatency * 0.9) + (processingTime * 0.1)
    );
  }

  private updateLatencyMetrics(latency: number): void {
    this.metrics.networkLatency = (this.metrics.networkLatency * 0.9) + (latency * 0.1);
  }

  // Performance measurement utilities
  public measurePerformance<T>(name: string, fn: () => T): T {
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;
    
    performance.mark(startMark);
    const result = fn();
    performance.mark(endMark);
    
    performance.measure(name, startMark, endMark);
    
    return result;
  }

  public async measureAsyncPerformance<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await fn();
      const endTime = performance.now();
      this.updateLatencyMetrics(endTime - startTime);
      return result;
    } catch (error) {
      const endTime = performance.now();
      this.updateLatencyMetrics(endTime - startTime);
      throw error;
    }
  }

  // Metrics and monitoring
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getDetailedMetrics(): DetailedPerformanceMetrics {
    return {
      ...this.metrics,
      cacheSize: this.eventCache.size,
      pendingDebounces: this.debounceTimers.size,
      queuedBatches: this.batchQueue.length,
      memoryBreakdown: {
        eventCache: this.eventCache.size * 1024,
        debounceTimers: this.debounceTimers.size * 256,
        batchQueue: this.batchQueue.length * 512,
      },
    };
  }

  public resetMetrics(): void {
    this.metrics = {
      eventProcessingLatency: 0,
      batchProcessingCount: 0,
      cacheHitRate: 0,
      memoryUsage: 0,
      networkLatency: 0,
      droppedEvents: 0,
      processedEventsPerSecond: 0,
      averageBatchSize: 0,
    };
  }

  // Cleanup
  public destroy(): void {
    // Clear all timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();

    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    // Clear caches
    this.eventCache.clear();
    this.batchQueue = [];
  }
}

// Event Cache Manager
class EventCacheManager {
  private cache: Map<string, CachedEvent> = new Map();
  private hitCount = 0;
  private missCount = 0;
  private onHitRateUpdate: (hitRate: number) => void;

  constructor(
    private config: PerformanceConfig,
    onHitRateUpdate: (hitRate: number) => void
  ) {
    this.onHitRateUpdate = onHitRateUpdate;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (entry && Date.now() - entry.timestamp < this.config.cacheTTL) {
      this.hitCount++;
      this.updateHitRate();
      return entry.data as T;
    }

    this.missCount++;
    this.updateHitRate();
    
    if (entry) {
      this.cache.delete(key); // Remove expired entry
    }
    
    return null;
  }

  set<T>(key: string, data: T): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.config.cacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? Date.now() - entry.timestamp < this.config.cacheTTL : false;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    this.updateHitRate();
  }

  private updateHitRate(): void {
    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? (this.hitCount / total) * 100 : 0;
    this.onHitRateUpdate(hitRate);
  }
}

// Type definitions
interface CachedEvent {
  data: any;
  timestamp: number;
}

interface EventBatch {
  events: AppointmentEvent[];
  timestamp: number;
  priority: 'low' | 'medium' | 'high';
}

interface DifferentialUpdate<T> {
  type: 'create' | 'update' | 'delete';
  event: T;
  previous: T | null;
}

interface DetailedPerformanceMetrics extends PerformanceMetrics {
  cacheSize: number;
  pendingDebounces: number;
  queuedBatches: number;
  memoryBreakdown: {
    eventCache: number;
    debounceTimers: number;
    batchQueue: number;
  };
}

// Performance optimization presets
export const PERFORMANCE_PRESETS = {
  LOW_LATENCY: {
    batchSize: 5,
    batchIntervalMs: 500,
    debounceMs: 100,
    enableSmartDebouncing: true,
    enableCaching: true,
    enableDifferentialUpdates: true,
  } as Partial<PerformanceConfig>,

  HIGH_THROUGHPUT: {
    batchSize: 50,
    batchIntervalMs: 2000,
    debounceMs: 500,
    enableSmartDebouncing: true,
    enableCaching: true,
    enableDifferentialUpdates: true,
  } as Partial<PerformanceConfig>,

  MEMORY_EFFICIENT: {
    batchSize: 20,
    batchIntervalMs: 1000,
    debounceMs: 300,
    cacheSize: 100,
    maxEventHistory: 100,
    enableMemoryMonitoring: true,
  } as Partial<PerformanceConfig>,

  BALANCED: {
    batchSize: 10,
    batchIntervalMs: 1000,
    debounceMs: 300,
    enableSmartDebouncing: true,
    enableCaching: true,
    enableDifferentialUpdates: true,
    enableMemoryMonitoring: true,
  } as Partial<PerformanceConfig>,
};

// Export utility functions
export function createOptimizedProcessor<T extends AppointmentEvent>(
  processor: (events: T[]) => Promise<void>,
  preset: keyof typeof PERFORMANCE_PRESETS = 'BALANCED'
): (event: T) => void {
  const performanceManager = new RealtimePerformanceManager(PERFORMANCE_PRESETS[preset]);
  return performanceManager.createBatchProcessor(processor);
}

export function createOptimizedDebouncer<T extends AppointmentEvent>(
  processor: (event: T) => void,
  preset: keyof typeof PERFORMANCE_PRESETS = 'BALANCED'
): (event: T) => void {
  const performanceManager = new RealtimePerformanceManager(PERFORMANCE_PRESETS[preset]);
  return performanceManager.createSmartDebouncer(processor);
}