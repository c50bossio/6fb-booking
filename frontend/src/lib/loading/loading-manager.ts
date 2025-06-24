import { EventEmitter } from 'events';

export interface LoadingOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'sync' | 'fetch';
  resource: string;
  status: 'pending' | 'in-progress' | 'success' | 'error';
  progress?: number;
  message?: string;
  startTime: Date;
  endTime?: Date;
  error?: Error;
  rollbackData?: any;
}

export interface OptimisticUpdate<T = any> {
  id: string;
  operationId: string;
  type: 'create' | 'update' | 'delete';
  resource: string;
  oldData?: T;
  newData?: T;
  applied: boolean;
  timestamp: Date;
}

export class LoadingManager extends EventEmitter {
  private operations: Map<string, LoadingOperation> = new Map();
  private optimisticUpdates: Map<string, OptimisticUpdate> = new Map();
  private operationHistory: LoadingOperation[] = [];
  private maxHistorySize = 100;

  // Start a new loading operation
  startOperation(
    id: string,
    type: LoadingOperation['type'],
    resource: string,
    message?: string
  ): LoadingOperation {
    const operation: LoadingOperation = {
      id,
      type,
      resource,
      status: 'pending',
      message,
      startTime: new Date(),
    };

    this.operations.set(id, operation);
    this.emit('operation:start', operation);

    // Set to in-progress after a brief delay to show pending state
    setTimeout(() => {
      this.updateOperation(id, { status: 'in-progress' });
    }, 100);

    return operation;
  }

  // Update an existing operation
  updateOperation(
    id: string,
    updates: Partial<LoadingOperation>
  ): LoadingOperation | null {
    const operation = this.operations.get(id);
    if (!operation) return null;

    const updatedOperation = { ...operation, ...updates };
    this.operations.set(id, updatedOperation);
    this.emit('operation:update', updatedOperation);

    // If operation is complete, move to history
    if (updates.status === 'success' || updates.status === 'error') {
      updatedOperation.endTime = new Date();
      this.completeOperation(id);
    }

    return updatedOperation;
  }

  // Complete an operation
  private completeOperation(id: string): void {
    const operation = this.operations.get(id);
    if (!operation) return;

    // Add to history
    this.operationHistory.unshift(operation);
    if (this.operationHistory.length > this.maxHistorySize) {
      this.operationHistory.pop();
    }

    // Remove from active operations
    this.operations.delete(id);
    this.emit('operation:complete', operation);

    // Clean up associated optimistic updates
    if (operation.status === 'success') {
      this.confirmOptimisticUpdate(id);
    } else if (operation.status === 'error') {
      this.rollbackOptimisticUpdate(id);
    }
  }

  // Apply an optimistic update
  applyOptimisticUpdate<T>(
    operationId: string,
    type: OptimisticUpdate['type'],
    resource: string,
    oldData?: T,
    newData?: T
  ): string {
    const updateId = `${operationId}-${Date.now()}`;
    const update: OptimisticUpdate<T> = {
      id: updateId,
      operationId,
      type,
      resource,
      oldData,
      newData,
      applied: true,
      timestamp: new Date(),
    };

    this.optimisticUpdates.set(updateId, update);
    this.emit('optimistic:apply', update);

    return updateId;
  }

  // Confirm an optimistic update (operation succeeded)
  confirmOptimisticUpdate(operationId: string): void {
    const updates = Array.from(this.optimisticUpdates.values()).filter(
      update => update.operationId === operationId
    );

    updates.forEach(update => {
      this.optimisticUpdates.delete(update.id);
      this.emit('optimistic:confirm', update);
    });
  }

  // Rollback an optimistic update (operation failed)
  rollbackOptimisticUpdate(operationId: string): void {
    const updates = Array.from(this.optimisticUpdates.values()).filter(
      update => update.operationId === operationId
    );

    updates.forEach(update => {
      this.optimisticUpdates.delete(update.id);
      this.emit('optimistic:rollback', update);
    });
  }

  // Get active operations
  getActiveOperations(): LoadingOperation[] {
    return Array.from(this.operations.values());
  }

  // Get operations by resource
  getOperationsByResource(resource: string): LoadingOperation[] {
    return this.getActiveOperations().filter(op => op.resource === resource);
  }

  // Check if any operations are in progress
  isLoading(resource?: string): boolean {
    const operations = resource
      ? this.getOperationsByResource(resource)
      : this.getActiveOperations();

    return operations.some(op =>
      op.status === 'pending' || op.status === 'in-progress'
    );
  }

  // Get loading count
  getLoadingCount(resource?: string): number {
    const operations = resource
      ? this.getOperationsByResource(resource)
      : this.getActiveOperations();

    return operations.filter(op =>
      op.status === 'pending' || op.status === 'in-progress'
    ).length;
  }

  // Get operation history
  getHistory(limit?: number): LoadingOperation[] {
    return limit ? this.operationHistory.slice(0, limit) : this.operationHistory;
  }

  // Clear all operations
  clearAll(): void {
    this.operations.clear();
    this.optimisticUpdates.clear();
    this.emit('clear');
  }

  // Generate unique operation ID
  static generateOperationId(prefix: string = 'op'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
let loadingManagerInstance: LoadingManager | null = null;

export function getLoadingManager(): LoadingManager {
  if (!loadingManagerInstance) {
    loadingManagerInstance = new LoadingManager();
  }
  return loadingManagerInstance;
}

// Utility functions for common operations
export const LoadingUtils = {
  // Create operation with automatic ID
  startAutoOperation(
    type: LoadingOperation['type'],
    resource: string,
    message?: string
  ): string {
    const manager = getLoadingManager();
    const id = LoadingManager.generateOperationId(type);
    manager.startOperation(id, type, resource, message);
    return id;
  },

  // Complete operation with success
  completeOperation(id: string, message?: string): void {
    const manager = getLoadingManager();
    manager.updateOperation(id, {
      status: 'success',
      progress: 100,
      message
    });
  },

  // Fail operation with error
  failOperation(id: string, error: Error | string): void {
    const manager = getLoadingManager();
    const errorObj = error instanceof Error ? error : new Error(error);
    manager.updateOperation(id, {
      status: 'error',
      error: errorObj,
      message: errorObj.message
    });
  },

  // Update operation progress
  updateProgress(id: string, progress: number, message?: string): void {
    const manager = getLoadingManager();
    const updates: Partial<LoadingOperation> = { progress };
    if (message) updates.message = message;
    manager.updateOperation(id, updates);
  },
};
