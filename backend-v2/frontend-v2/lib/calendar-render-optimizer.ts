/**
 * Calendar Render Optimizer
 * Advanced rendering performance optimization for complex appointment layouts
 * Implements batching, prioritization, and intelligent re-rendering strategies
 */

import { safeRequestAnimationFrame } from './browser-compatibility'

export interface RenderTask {
  id: string
  type: 'appointment' | 'timeSlot' | 'dayColumn' | 'weekView' | 'monthView'
  priority: number
  element?: HTMLElement
  data: any
  renderFunction: () => void
  estimatedTime: number // milliseconds
  dependencies: string[]
  retryCount: number
}

export interface RenderBatch {
  id: string
  tasks: RenderTask[]
  totalTime: number
  frameDeadline: number
  completed: boolean
}

export interface RenderMetrics {
  totalRenders: number
  averageRenderTime: number
  droppedFrames: number
  batchesProcessed: number
  priorityQueueSize: number
  frameRate: number
  renderEfficiency: number
}

export interface RenderConfig {
  maxBatchSize: number
  maxFrameTime: number // milliseconds per frame
  priorityThreshold: number
  enableBatching: boolean
  enablePrioritization: boolean
  enableDependencyTracking: boolean
  frameTargetMs: number // 16.67ms for 60fps
}

/**
 * Advanced rendering performance optimizer
 */
class CalendarRenderOptimizer {
  private config: RenderConfig
  private renderQueue: RenderTask[] = []
  private currentBatch: RenderBatch | null = null
  private renderMetrics: RenderMetrics = {
    totalRenders: 0,
    averageRenderTime: 0,
    droppedFrames: 0,
    batchesProcessed: 0,
    priorityQueueSize: 0,
    frameRate: 0,
    renderEfficiency: 0
  }

  private frameStartTime = 0
  private isProcessing = false
  private frameMonitor = 0
  private lastFrameTime = performance.now()
  private frameCount = 0
  private cleanupInterval: NodeJS.Timeout

  // Priority levels for different render operations
  private renderPriorities = {
    // Critical (immediate user interaction)
    'appointment-drag': 100,
    'appointment-hover': 95,
    'appointment-select': 90,
    
    // High (visible content)
    'appointment-render': 80,
    'timeSlot-render': 75,
    'dayColumn-render': 70,
    
    // Medium (layout and structure)
    'weekView-render': 60,
    'monthView-render': 55,
    'calendar-header': 50,
    
    // Low (background updates)
    'appointment-count': 30,
    'calendar-footer': 25,
    'analytics-update': 20
  }

  // Estimated render times for different operations (in milliseconds)
  private renderTimeEstimates = {
    'appointment-drag': 2,
    'appointment-hover': 1,
    'appointment-select': 1,
    'appointment-render': 5,
    'timeSlot-render': 3,
    'dayColumn-render': 8,
    'weekView-render': 15,
    'monthView-render': 25,
    'calendar-header': 4,
    'appointment-count': 2,
    'calendar-footer': 2,
    'analytics-update': 3
  }

  constructor(config: Partial<RenderConfig> = {}) {
    this.config = {
      maxBatchSize: 10,
      maxFrameTime: 12, // Leave 4ms buffer for other operations
      priorityThreshold: 50,
      enableBatching: true,
      enablePrioritization: true,
      enableDependencyTracking: true,
      frameTargetMs: 16.67, // 60fps target
      ...config
    }

    this.initializeRenderOptimization()
    this.startFrameMonitoring()

    // Cleanup and optimization
    this.cleanupInterval = setInterval(() => {
      this.performRenderOptimization()
    }, 5000) // Every 5 seconds
  }

  /**
   * Initialize render optimization
   */
  private initializeRenderOptimization(): void {
    // Adjust configuration based on device performance
    const deviceType = this.detectRenderPerformance()
    
    switch (deviceType) {
      case 'highEnd':
        this.config.maxBatchSize = 15
        this.config.maxFrameTime = 14
        break
      case 'lowEnd':
        this.config.maxBatchSize = 5
        this.config.maxFrameTime = 8
        break
      default:
        // Keep default values for standard devices
        break
    }

    console.log('CalendarRenderOptimizer: Initialized', {
      deviceType,
      maxBatchSize: this.config.maxBatchSize,
      maxFrameTime: this.config.maxFrameTime
    })
  }

  /**
   * Detect device rendering performance
   */
  private detectRenderPerformance(): 'highEnd' | 'standard' | 'lowEnd' {
    const navigator = window.navigator as any
    const hardwareConcurrency = navigator.hardwareConcurrency || 4
    const deviceMemory = navigator.deviceMemory || 4
    
    // Check for high-end indicators
    if (hardwareConcurrency >= 8 && deviceMemory >= 8) {
      return 'highEnd'
    }
    
    // Check for low-end indicators
    if (hardwareConcurrency <= 2 || deviceMemory <= 2) {
      return 'lowEnd'
    }
    
    return 'standard'
  }

  /**
   * Schedule render task with optimization
   */
  scheduleRender(task: Omit<RenderTask, 'id' | 'estimatedTime' | 'retryCount'>): string {
    const renderTask: RenderTask = {
      ...task,
      id: `render-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      estimatedTime: this.renderTimeEstimates[task.type] || 5,
      retryCount: 0
    }

    // Add to priority queue
    this.addToRenderQueue(renderTask)

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processRenderQueue()
    }

    return renderTask.id
  }

  /**
   * Add task to render queue with priority sorting
   */
  private addToRenderQueue(task: RenderTask): void {
    // Check dependencies
    if (this.config.enableDependencyTracking && task.dependencies.length > 0) {
      const unresolvedDependencies = task.dependencies.filter(depId =>
        this.renderQueue.some(t => t.id === depId) ||
        (this.currentBatch && this.currentBatch.tasks.some(t => t.id === depId))
      )
      
      if (unresolvedDependencies.length > 0) {
        // Defer until dependencies are resolved
        setTimeout(() => {
          this.addToRenderQueue(task)
        }, 1)
        return
      }
    }

    // Insert in priority order
    if (this.config.enablePrioritization) {
      let insertIndex = this.renderQueue.length
      for (let i = 0; i < this.renderQueue.length; i++) {
        if (this.renderQueue[i].priority < task.priority) {
          insertIndex = i
          break
        }
      }
      this.renderQueue.splice(insertIndex, 0, task)
    } else {
      this.renderQueue.push(task)
    }

    this.renderMetrics.priorityQueueSize = this.renderQueue.length
  }

  /**
   * Process render queue with batching and frame timing
   */
  private processRenderQueue(): void {
    if (this.isProcessing || this.renderQueue.length === 0) {
      return
    }

    this.isProcessing = true
    this.frameStartTime = performance.now()

    // Create batch for current frame
    if (this.config.enableBatching) {
      this.createRenderBatch()
    } else {
      // Process tasks individually
      this.processSingleTask()
    }
  }

  /**
   * Create optimized render batch
   */
  private createRenderBatch(): void {
    const batch: RenderBatch = {
      id: `batch-${Date.now()}`,
      tasks: [],
      totalTime: 0,
      frameDeadline: this.frameStartTime + this.config.maxFrameTime,
      completed: false
    }

    // Fill batch with high-priority tasks that fit in frame
    while (
      this.renderQueue.length > 0 &&
      batch.tasks.length < this.config.maxBatchSize &&
      batch.totalTime + this.renderQueue[0].estimatedTime <= this.config.maxFrameTime
    ) {
      const task = this.renderQueue.shift()!
      batch.tasks.push(task)
      batch.totalTime += task.estimatedTime
    }

    if (batch.tasks.length > 0) {
      this.currentBatch = batch
      this.executeBatch(batch)
    } else {
      this.isProcessing = false
    }
  }

  /**
   * Execute render batch
   */
  private executeBatch(batch: RenderBatch): void {
    const executeNextTask = (taskIndex: number) => {
      if (taskIndex >= batch.tasks.length) {
        // Batch completed
        batch.completed = true
        this.renderMetrics.batchesProcessed++
        this.currentBatch = null
        this.isProcessing = false
        
        // Continue with next batch if queue has more tasks
        if (this.renderQueue.length > 0) {
          safeRequestAnimationFrame(() => {
            this.processRenderQueue()
          })
        }
        return
      }

      const task = batch.tasks[taskIndex]
      const taskStartTime = performance.now()

      try {
        // Check frame time budget
        if (performance.now() > batch.frameDeadline) {
          // Frame budget exceeded, defer remaining tasks
          this.renderMetrics.droppedFrames++
          this.deferRemainingTasks(batch, taskIndex)
          return
        }

        // Execute render task
        task.renderFunction()
        
        // Update metrics
        const renderTime = performance.now() - taskStartTime
        this.updateRenderMetrics(renderTime)
        
        // Continue with next task
        safeRequestAnimationFrame(() => {
          executeNextTask(taskIndex + 1)
        })

      } catch (error) {
        console.error('CalendarRenderOptimizer: Task execution failed:', error)
        
        // Retry task if within retry limit
        if (task.retryCount < 3) {
          task.retryCount++
          this.renderQueue.unshift(task) // Add back to front of queue
        }
        
        // Continue with next task
        safeRequestAnimationFrame(() => {
          executeNextTask(taskIndex + 1)
        })
      }
    }

    // Start batch execution
    safeRequestAnimationFrame(() => {
      executeNextTask(0)
    })
  }

  /**
   * Process single task (non-batched mode)
   */
  private processSingleTask(): void {
    if (this.renderQueue.length === 0) {
      this.isProcessing = false
      return
    }

    const task = this.renderQueue.shift()!
    const taskStartTime = performance.now()

    try {
      task.renderFunction()
      
      // Update metrics
      const renderTime = performance.now() - taskStartTime
      this.updateRenderMetrics(renderTime)
      
      // Continue with next task
      safeRequestAnimationFrame(() => {
        this.processRenderQueue()
      })

    } catch (error) {
      console.error('CalendarRenderOptimizer: Single task execution failed:', error)
      
      // Retry task if within retry limit
      if (task.retryCount < 3) {
        task.retryCount++
        this.renderQueue.unshift(task)
      }
      
      this.isProcessing = false
    }
  }

  /**
   * Defer remaining tasks when frame budget is exceeded
   */
  private deferRemainingTasks(batch: RenderBatch, startIndex: number): void {
    const remainingTasks = batch.tasks.slice(startIndex)
    
    // Add remaining tasks back to queue
    remainingTasks.reverse().forEach(task => {
      this.renderQueue.unshift(task)
    })

    this.currentBatch = null
    this.isProcessing = false

    // Schedule next batch for next frame
    safeRequestAnimationFrame(() => {
      this.processRenderQueue()
    })
  }

  /**
   * Update render metrics
   */
  private updateRenderMetrics(renderTime: number): void {
    this.renderMetrics.totalRenders++
    
    // Calculate rolling average
    const alpha = 0.1
    this.renderMetrics.averageRenderTime = 
      this.renderMetrics.averageRenderTime * (1 - alpha) + renderTime * alpha

    // Update render efficiency
    this.renderMetrics.renderEfficiency = 
      Math.max(0, 1 - (this.renderMetrics.droppedFrames / Math.max(this.renderMetrics.totalRenders, 1)))

    this.renderMetrics.priorityQueueSize = this.renderQueue.length
  }

  /**
   * Start frame rate monitoring
   */
  private startFrameMonitoring(): void {
    const updateFrameRate = (currentTime: number) => {
      this.frameCount++
      
      // Calculate FPS every second
      if (currentTime - this.lastFrameTime >= 1000) {
        const fps = (this.frameCount * 1000) / (currentTime - this.lastFrameTime)
        this.renderMetrics.frameRate = fps
        
        // Adjust batch size based on frame rate
        this.adjustBatchSizeByFrameRate(fps)
        
        this.frameCount = 0
        this.lastFrameTime = currentTime
      }

      this.frameMonitor = requestAnimationFrame(updateFrameRate)
    }

    this.frameMonitor = requestAnimationFrame(updateFrameRate)
  }

  /**
   * Adjust batch size based on frame rate
   */
  private adjustBatchSizeByFrameRate(fps: number): void {
    if (fps < 45) {
      // Reduce batch size for better frame rate
      this.config.maxBatchSize = Math.max(3, Math.floor(this.config.maxBatchSize * 0.8))
      this.config.maxFrameTime = Math.max(6, Math.floor(this.config.maxFrameTime * 0.9))
    } else if (fps > 58) {
      // Increase batch size for better throughput
      this.config.maxBatchSize = Math.min(20, Math.floor(this.config.maxBatchSize * 1.1))
      this.config.maxFrameTime = Math.min(15, Math.floor(this.config.maxFrameTime * 1.05))
    }
  }

  /**
   * Periodic render optimization
   */
  private performRenderOptimization(): void {
    // Remove old completed batches from memory
    // (This would be implemented if we store batch history)

    // Log performance metrics
    if (this.renderMetrics.totalRenders > 0) {
      console.log('CalendarRenderOptimizer: Performance metrics', {
        averageRenderTime: Math.round(this.renderMetrics.averageRenderTime * 100) / 100,
        frameRate: Math.round(this.renderMetrics.frameRate),
        renderEfficiency: Math.round(this.renderMetrics.renderEfficiency * 100),
        queueSize: this.renderMetrics.priorityQueueSize,
        droppedFrames: this.renderMetrics.droppedFrames
      })
    }
  }

  /**
   * Cancel render task
   */
  cancelRender(taskId: string): boolean {
    const index = this.renderQueue.findIndex(task => task.id === taskId)
    if (index >= 0) {
      this.renderQueue.splice(index, 1)
      this.renderMetrics.priorityQueueSize = this.renderQueue.length
      return true
    }
    return false
  }

  /**
   * Clear all render tasks
   */
  clearAllRenders(): void {
    this.renderQueue = []
    this.currentBatch = null
    this.isProcessing = false
    this.renderMetrics.priorityQueueSize = 0
    
    console.log('CalendarRenderOptimizer: All render tasks cleared')
  }

  /**
   * Get render metrics
   */
  getRenderMetrics(): RenderMetrics {
    return { ...this.renderMetrics }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RenderConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('CalendarRenderOptimizer: Configuration updated', this.config)
  }

  /**
   * Destroy the render optimizer
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    if (this.frameMonitor) {
      cancelAnimationFrame(this.frameMonitor)
    }

    this.clearAllRenders()
  }
}

// Singleton instance for global render optimization
export const calendarRenderOptimizer = new CalendarRenderOptimizer()

// React hook for render-optimized calendar operations
export function useCalendarRenderOptimization() {
  const scheduleRender = (
    type: RenderTask['type'],
    renderFunction: () => void,
    priority: number = 50,
    dependencies: string[] = []
  ) => {
    return calendarRenderOptimizer.scheduleRender({
      type,
      priority,
      data: {},
      renderFunction,
      dependencies
    })
  }

  const cancelRender = (taskId: string) => {
    return calendarRenderOptimizer.cancelRender(taskId)
  }

  const getMetrics = () => {
    return calendarRenderOptimizer.getRenderMetrics()
  }

  const clearAllRenders = () => {
    calendarRenderOptimizer.clearAllRenders()
  }

  return {
    scheduleRender,
    cancelRender,
    getMetrics,
    clearAllRenders
  }
}

export default calendarRenderOptimizer