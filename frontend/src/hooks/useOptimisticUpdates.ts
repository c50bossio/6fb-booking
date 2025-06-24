import { useState, useCallback, useRef, useEffect } from 'react';
import { getLoadingManager, LoadingOperation, OptimisticUpdate, LoadingUtils } from '@/lib/loading/loading-manager';

export interface OptimisticOperationConfig {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onStart?: () => void;
  onComplete?: () => void;
  rollbackDelay?: number; // Delay before showing rollback (for better UX)
  resource?: string;
}

export interface OptimisticState<T = any> {
  isLoading: boolean;
  loadingCount: number;
  operations: LoadingOperation[];
  error: Error | null;
  optimisticData: Map<string, T>;
}

export function useOptimisticUpdates<T = any>(
  resource: string = 'default',
  initialData?: T[]
) {
  const [state, setState] = useState<OptimisticState<T>>({
    isLoading: false,
    loadingCount: 0,
    operations: [],
    error: null,
    optimisticData: new Map(),
  });

  const loadingManager = getLoadingManager();
  const rollbackTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Update state from loading manager
  const updateState = useCallback(() => {
    const operations = loadingManager.getOperationsByResource(resource);
    const isLoading = loadingManager.isLoading(resource);
    const loadingCount = loadingManager.getLoadingCount(resource);

    setState(prev => ({
      ...prev,
      isLoading,
      loadingCount,
      operations,
    }));
  }, [loadingManager, resource]);

  // Set up event listeners
  useEffect(() => {
    const handleOperationStart = (operation: LoadingOperation) => {
      if (operation.resource === resource) {
        updateState();
      }
    };

    const handleOperationUpdate = (operation: LoadingOperation) => {
      if (operation.resource === resource) {
        updateState();
      }
    };

    const handleOperationComplete = (operation: LoadingOperation) => {
      if (operation.resource === resource) {
        updateState();
      }
    };

    const handleOptimisticApply = (update: OptimisticUpdate<T>) => {
      if (update.resource === resource) {
        setState(prev => {
          const newOptimisticData = new Map(prev.optimisticData);
          if (update.newData) {
            newOptimisticData.set(update.id, update.newData);
          }
          return {
            ...prev,
            optimisticData: newOptimisticData,
          };
        });
      }
    };

    const handleOptimisticConfirm = (update: OptimisticUpdate<T>) => {
      if (update.resource === resource) {
        setState(prev => {
          const newOptimisticData = new Map(prev.optimisticData);
          newOptimisticData.delete(update.id);
          return {
            ...prev,
            optimisticData: newOptimisticData,
          };
        });
      }
    };

    const handleOptimisticRollback = (update: OptimisticUpdate<T>) => {
      if (update.resource === resource) {
        // Add a delay before showing the rollback for better UX
        const timeoutId = setTimeout(() => {
          setState(prev => {
            const newOptimisticData = new Map(prev.optimisticData);
            newOptimisticData.delete(update.id);
            return {
              ...prev,
              optimisticData: newOptimisticData,
              error: new Error(`Operation failed and was rolled back`),
            };
          });
          rollbackTimeouts.current.delete(update.id);
        }, 500); // 500ms delay

        rollbackTimeouts.current.set(update.id, timeoutId);
      }
    };

    loadingManager.on('operation:start', handleOperationStart);
    loadingManager.on('operation:update', handleOperationUpdate);
    loadingManager.on('operation:complete', handleOperationComplete);
    loadingManager.on('optimistic:apply', handleOptimisticApply);
    loadingManager.on('optimistic:confirm', handleOptimisticConfirm);
    loadingManager.on('optimistic:rollback', handleOptimisticRollback);

    // Initial state update
    updateState();

    return () => {
      loadingManager.off('operation:start', handleOperationStart);
      loadingManager.off('operation:update', handleOperationUpdate);
      loadingManager.off('operation:complete', handleOperationComplete);
      loadingManager.off('optimistic:apply', handleOptimisticApply);
      loadingManager.off('optimistic:confirm', handleOptimisticConfirm);
      loadingManager.off('optimistic:rollback', handleOptimisticRollback);

      // Clear any pending rollback timeouts
      rollbackTimeouts.current.forEach(timeout => clearTimeout(timeout));
      rollbackTimeouts.current.clear();
    };
  }, [loadingManager, resource, updateState]);

  // Create a new item optimistically
  const createOptimistic = useCallback(
    async <TData = T>(
      createFn: () => Promise<TData>,
      optimisticData: TData,
      config: OptimisticOperationConfig = {}
    ): Promise<TData | null> => {
      const operationId = LoadingUtils.startAutoOperation('create', resource, 'Creating...');

      config.onStart?.();

      // Apply optimistic update
      const updateId = loadingManager.applyOptimisticUpdate(
        operationId,
        'create',
        resource,
        undefined,
        optimisticData
      );

      try {
        const result = await createFn();
        LoadingUtils.completeOperation(operationId, 'Created successfully');
        config.onSuccess?.(result);
        return result;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        LoadingUtils.failOperation(operationId, errorObj);
        config.onError?.(errorObj);
        return null;
      } finally {
        config.onComplete?.();
      }
    },
    [loadingManager, resource]
  );

  // Update an item optimistically
  const updateOptimistic = useCallback(
    async <TData = T>(
      updateFn: () => Promise<TData>,
      oldData: TData,
      newData: TData,
      config: OptimisticOperationConfig = {}
    ): Promise<TData | null> => {
      const operationId = LoadingUtils.startAutoOperation('update', resource, 'Updating...');

      config.onStart?.();

      // Apply optimistic update
      const updateId = loadingManager.applyOptimisticUpdate(
        operationId,
        'update',
        resource,
        oldData,
        newData
      );

      try {
        const result = await updateFn();
        LoadingUtils.completeOperation(operationId, 'Updated successfully');
        config.onSuccess?.(result);
        return result;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        LoadingUtils.failOperation(operationId, errorObj);
        config.onError?.(errorObj);
        return null;
      } finally {
        config.onComplete?.();
      }
    },
    [loadingManager, resource]
  );

  // Delete an item optimistically
  const deleteOptimistic = useCallback(
    async <TData = T>(
      deleteFn: () => Promise<void>,
      dataToDelete: TData,
      config: OptimisticOperationConfig = {}
    ): Promise<boolean> => {
      const operationId = LoadingUtils.startAutoOperation('delete', resource, 'Deleting...');

      config.onStart?.();

      // Apply optimistic update
      const updateId = loadingManager.applyOptimisticUpdate(
        operationId,
        'delete',
        resource,
        dataToDelete,
        undefined
      );

      try {
        await deleteFn();
        LoadingUtils.completeOperation(operationId, 'Deleted successfully');
        config.onSuccess?.(undefined);
        return true;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        LoadingUtils.failOperation(operationId, errorObj);
        config.onError?.(errorObj);
        return false;
      } finally {
        config.onComplete?.();
      }
    },
    [loadingManager, resource]
  );

  // Execute operation without optimistic updates
  const executeOperation = useCallback(
    async <TResult = any>(
      operationFn: () => Promise<TResult>,
      type: LoadingOperation['type'] = 'fetch',
      message?: string,
      config: OptimisticOperationConfig = {}
    ): Promise<TResult | null> => {
      const operationId = LoadingUtils.startAutoOperation(type, resource, message);

      config.onStart?.();

      try {
        const result = await operationFn();
        LoadingUtils.completeOperation(operationId, 'Completed successfully');
        config.onSuccess?.(result);
        return result;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        LoadingUtils.failOperation(operationId, errorObj);
        config.onError?.(errorObj);
        return null;
      } finally {
        config.onComplete?.();
      }
    },
    [loadingManager, resource]
  );

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Get merged data (original + optimistic)
  const getMergedData = useCallback(
    (originalData: T[]): T[] => {
      const optimisticArray = Array.from(state.optimisticData.values());
      return [...originalData, ...optimisticArray];
    },
    [state.optimisticData]
  );

  return {
    // State
    isLoading: state.isLoading,
    loadingCount: state.loadingCount,
    operations: state.operations,
    error: state.error,
    optimisticData: state.optimisticData,

    // Operations
    createOptimistic,
    updateOptimistic,
    deleteOptimistic,
    executeOperation,

    // Utilities
    clearError,
    getMergedData,
  };
}

// Hook for simple loading state (without optimistic updates)
export function useLoadingState(resource: string = 'default') {
  const [state, setState] = useState({
    isLoading: false,
    loadingCount: 0,
    operations: [] as LoadingOperation[],
  });

  const loadingManager = getLoadingManager();

  const updateState = useCallback(() => {
    const operations = loadingManager.getOperationsByResource(resource);
    const isLoading = loadingManager.isLoading(resource);
    const loadingCount = loadingManager.getLoadingCount(resource);

    setState({
      isLoading,
      loadingCount,
      operations,
    });
  }, [loadingManager, resource]);

  useEffect(() => {
    const handleUpdate = (operation: LoadingOperation) => {
      if (operation.resource === resource) {
        updateState();
      }
    };

    loadingManager.on('operation:start', handleUpdate);
    loadingManager.on('operation:update', handleUpdate);
    loadingManager.on('operation:complete', handleUpdate);

    updateState();

    return () => {
      loadingManager.off('operation:start', handleUpdate);
      loadingManager.off('operation:update', handleUpdate);
      loadingManager.off('operation:complete', handleUpdate);
    };
  }, [loadingManager, resource, updateState]);

  return state;
}
