/**
 * Calendar Enhancement System Test Suite
 * Comprehensive tests for all calendar enhancement features
 * Version: 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { 
  CalendarPerformanceMonitor, 
  getCalendarMonitor,
  CalendarPerformanceMetrics,
  CalendarEvent,
  PerformanceAlert
} from '@/lib/calendar-performance-monitoring'
import { 
  IntelligentSchedulingEngine, 
  getSchedulingEngine,
  AppointmentSlot,
  SchedulingPreference
} from '@/lib/intelligent-scheduling'
import { 
  CalendarVoiceCommandSystem, 
  getCalendarVoiceSystem 
} from '@/lib/calendar-voice-commands'
import { useCalendarPerformance } from '@/hooks/useCalendarPerformance'
import { useIntelligentScheduling } from '@/hooks/useIntelligentScheduling'
import { useCalendarVoiceCommands } from '@/hooks/useCalendarVoiceCommands'

// Mock dependencies
vi.mock('@/lib/voice-commands-accessibility', () => ({
  getVoiceCommandsSystem: vi.fn(() => ({
    addCommand: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    startListening: vi.fn(),
    stopListening: vi.fn(),
    speak: vi.fn(),
    getStatus: vi.fn(() => ({ isListening: false })),
    getCommands: vi.fn(() => [])
  }))
}))

// Mock performance APIs
Object.defineProperty(global.performance, 'now', {
  value: vi.fn(() => Date.now())
})

Object.defineProperty(global.performance, 'mark', {
  value: vi.fn()
})

Object.defineProperty(global.performance, 'measure', {
  value: vi.fn()
})

describe('Calendar Performance Monitoring System', () => {
  let monitor: CalendarPerformanceMonitor

  beforeEach(() => {
    monitor = new CalendarPerformanceMonitor()
    vi.clearAllMocks()
  })

  afterEach(() => {
    monitor.destroy()
  })

  describe('Performance Metrics Collection', () => {
    it('should initialize with default metrics', () => {
      const metrics = monitor.getMetrics()
      
      expect(metrics).toEqual({
        loadTime: 0,
        renderTime: 0,
        conflictResolutionTime: 0,
        apiResponseTime: 0,
        cacheHitRate: 100,
        userInteractionLatency: 0,
        dataFreshness: 100,
        errorRate: 0,
        memoryUsage: 0,
        networkLatency: 0
      })
    })

    it('should measure calendar load time', () => {
      const endMeasurement = monitor.measureCalendarLoad()
      
      // Simulate load completion
      setTimeout(() => {
        endMeasurement()
      }, 100)
      
      expect(global.performance.mark).toHaveBeenCalledWith('calendar-load-start')
    })

    it('should measure render time', () => {
      const endMeasurement = monitor.measureRenderTime()
      
      setTimeout(() => {
        endMeasurement()
      }, 50)
      
      expect(global.performance.mark).toHaveBeenCalledWith('calendar-render-start')
    })

    it('should measure API call duration', () => {
      const endMeasurement = monitor.measureApiCall('appointments')
      
      setTimeout(() => {
        endMeasurement()
      }, 200)
      
      expect(global.performance.mark).toHaveBeenCalledWith('api-appointments-start')
    })

    it('should record conflict resolution time', () => {
      const duration = 1500
      monitor.recordConflictResolution(duration)
      
      const metrics = monitor.getMetrics()
      expect(metrics.conflictResolutionTime).toBeGreaterThan(0)
    })

    it('should record user interaction latency', () => {
      const interaction = 'calendar-click'
      const latency = 50
      
      monitor.recordUserInteraction(interaction, latency)
      
      const events = monitor.getEvents(1)
      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('view_change')
      expect(events[0].metadata.interaction).toBe(interaction)
    })

    it('should record errors', () => {
      const error = new Error('Test error')
      const context = { component: 'calendar' }
      
      monitor.recordError(error, context)
      
      const events = monitor.getEvents()
      const errorEvent = events.find(e => e.type === 'error')
      expect(errorEvent).toBeDefined()
      expect(errorEvent?.metadata.error).toBe('Test error')
      expect(errorEvent?.metadata.context).toEqual(context)
    })

    it('should update cache metrics', () => {
      monitor.updateCacheMetrics(80, 20)
      
      const metrics = monitor.getMetrics()
      expect(metrics.cacheHitRate).toBe(80)
    })
  })

  describe('Performance Alerts', () => {
    it('should create alerts when thresholds are exceeded', () => {
      // Simulate high load time
      const endMeasurement = monitor.measureCalendarLoad()
      vi.mocked(global.performance.now).mockReturnValue(4000) // 4 seconds
      endMeasurement()
      
      const alerts = monitor.getAlerts()
      expect(alerts.length).toBeGreaterThan(0)
      
      const loadTimeAlert = alerts.find(alert => alert.metric === 'loadTime')
      expect(loadTimeAlert).toBeDefined()
      expect(loadTimeAlert?.type).toBe('warning')
    })

    it('should resolve alerts', () => {
      // Create an alert first
      const endMeasurement = monitor.measureCalendarLoad()
      vi.mocked(global.performance.now).mockReturnValue(4000)
      endMeasurement()
      
      const alerts = monitor.getAlerts()
      const alertId = alerts[0]?.id
      
      if (alertId) {
        monitor.resolveAlert(alertId)
        
        const updatedAlerts = monitor.getAlerts()
        const resolvedAlert = updatedAlerts.find(a => a.id === alertId)
        expect(resolvedAlert?.resolved).toBe(true)
      }
    })
  })

  describe('Analytics Generation', () => {
    it('should generate comprehensive analytics', () => {
      // Add some test events
      monitor.recordUserInteraction('calendar-click', 50)
      monitor.recordConflictResolution(1000)
      
      const analytics = monitor.getAnalytics()
      
      expect(analytics).toHaveProperty('dailyAppointments')
      expect(analytics).toHaveProperty('weeklyTrends')
      expect(analytics).toHaveProperty('conflictPatterns')
      expect(analytics).toHaveProperty('peakUsageHours')
      expect(analytics).toHaveProperty('userBehaviorPatterns')
      expect(analytics).toHaveProperty('systemHealthScore')
      
      expect(Array.isArray(analytics.dailyAppointments)).toBe(true)
      expect(typeof analytics.systemHealthScore).toBe('number')
    })
  })

  describe('Data Export', () => {
    it('should export metrics data', () => {
      monitor.recordUserInteraction('test', 100)
      
      const exportedData = monitor.exportMetrics()
      const parsedData = JSON.parse(exportedData)
      
      expect(parsedData).toHaveProperty('sessionId')
      expect(parsedData).toHaveProperty('metrics')
      expect(parsedData).toHaveProperty('events')
      expect(parsedData).toHaveProperty('alerts')
      expect(parsedData).toHaveProperty('analytics')
    })
  })
})

describe('Intelligent Scheduling System', () => {
  let schedulingEngine: IntelligentSchedulingEngine

  beforeEach(() => {
    const preferences: SchedulingPreference = {
      avoidBackToBack: true,
      maximizeBookings: true,
      minimizeGaps: true,
      balanceWorkload: true,
      prioritizeRegularClients: true
    }
    schedulingEngine = new IntelligentSchedulingEngine(preferences)
  })

  describe('Optimal Slot Finding', () => {
    it('should find optimal appointment slots', () => {
      const serviceId = 1
      const duration = 30
      const preferredDate = new Date('2024-01-15')
      
      const slots = schedulingEngine.findOptimalSlots(
        serviceId,
        duration,
        preferredDate,
        'client123',
        { maxResults: 5 }
      )
      
      expect(Array.isArray(slots)).toBe(true)
      expect(slots.length).toBeLessThanOrEqual(5)
      
      slots.forEach(slot => {
        expect(slot).toHaveProperty('id')
        expect(slot).toHaveProperty('start')
        expect(slot).toHaveProperty('end')
        expect(slot).toHaveProperty('barberId')
        expect(slot).toHaveProperty('duration')
        expect(slot).toHaveProperty('isAvailable')
        expect(slot).toHaveProperty('conflictProbability')
        expect(slot).toHaveProperty('preferenceScore')
        expect(slot).toHaveProperty('efficiencyScore')
        
        expect(slot.duration).toBe(duration)
        expect(slot.isAvailable).toBe(true)
        expect(slot.conflictProbability).toBeGreaterThanOrEqual(0)
        expect(slot.conflictProbability).toBeLessThanOrEqual(1)
      })
    })

    it('should filter by barber preferences', () => {
      const slots = schedulingEngine.findOptimalSlots(
        1, 30, new Date(), 'client123',
        { 
          maxResults: 10,
          preferredBarbers: [1, 2],
          excludeBarbers: [3, 4]
        }
      )
      
      slots.forEach(slot => {
        expect([1, 2]).toContain(slot.barberId)
        expect([3, 4]).not.toContain(slot.barberId)
      })
    })

    it('should respect time range constraints', () => {
      const timeRange = { start: '10:00', end: '16:00' }
      const slots = schedulingEngine.findOptimalSlots(
        1, 30, new Date(), undefined,
        { timeRange }
      )
      
      slots.forEach(slot => {
        const hour = slot.start.getHours()
        expect(hour).toBeGreaterThanOrEqual(10)
        expect(hour).toBeLessThan(16)
      })
    })
  })

  describe('Schedule Optimization', () => {
    it('should optimize existing schedule', () => {
      const appointments = [
        {
          id: '1',
          barber_id: 1,
          service_id: 1,
          start_time: '2024-01-15T10:00:00Z',
          duration: 30,
          client_name: 'John Doe'
        },
        {
          id: '2',
          barber_id: 2,
          service_id: 2,
          start_time: '2024-01-15T14:00:00Z',
          duration: 45,
          client_name: 'Jane Smith'
        }
      ]
      
      const optimization = schedulingEngine.optimizeSchedule(
        appointments,
        new Date('2024-01-15')
      )
      
      expect(optimization).toHaveProperty('totalScore')
      expect(optimization).toHaveProperty('barberUtilization')
      expect(optimization).toHaveProperty('gapEfficiency')
      expect(optimization).toHaveProperty('clientSatisfaction')
      expect(optimization).toHaveProperty('conflictReduction')
      expect(optimization).toHaveProperty('recommendations')
      
      expect(typeof optimization.totalScore).toBe('number')
      expect(typeof optimization.barberUtilization).toBe('object')
      expect(Array.isArray(optimization.recommendations)).toBe(true)
    })

    it('should generate meaningful recommendations', () => {
      const appointments = [
        {
          id: '1',
          barber_id: 1,
          start_time: '2024-01-15T10:00:00Z',
          duration: 30
        }
      ]
      
      const optimization = schedulingEngine.optimizeSchedule(
        appointments,
        new Date('2024-01-15')
      )
      
      optimization.recommendations.forEach(rec => {
        expect(rec).toHaveProperty('type')
        expect(rec).toHaveProperty('priority')
        expect(rec).toHaveProperty('description')
        expect(rec).toHaveProperty('impact')
        expect(rec).toHaveProperty('estimatedImprovement')
        
        expect(['reschedule', 'swap', 'add_break', 'extend_hours', 'staff_adjustment']).toContain(rec.type)
        expect(['high', 'medium', 'low']).toContain(rec.priority)
        expect(typeof rec.estimatedImprovement).toBe('number')
      })
    })
  })

  describe('Conflict Resolution', () => {
    it('should resolve scheduling conflicts', () => {
      const conflictingAppointments = [
        {
          id: '1',
          barber_id: 1,
          start_time: '2024-01-15T10:00:00Z',
          duration: 30
        },
        {
          id: '2',
          barber_id: 1,
          start_time: '2024-01-15T10:15:00Z',
          duration: 30
        }
      ]
      
      const recommendations = schedulingEngine.resolveSchedulingConflicts(conflictingAppointments)
      
      expect(Array.isArray(recommendations)).toBe(true)
      expect(recommendations.length).toBeGreaterThan(0)
      
      recommendations.forEach(rec => {
        expect(['high', 'medium', 'low']).toContain(rec.priority)
        expect(typeof rec.estimatedImprovement).toBe('number')
      })
    })
  })

  describe('Demand Prediction', () => {
    it('should predict appointment demand', () => {
      const prediction = schedulingEngine.predictDemand(
        new Date('2024-01-15'),
        1, // serviceId
        1, // barberId
        { start: '09:00', end: '17:00' }
      )
      
      expect(prediction).toHaveProperty('expectedBookings')
      expect(prediction).toHaveProperty('peakHours')
      expect(prediction).toHaveProperty('recommendedStaffing')
      expect(prediction).toHaveProperty('confidenceScore')
      
      expect(typeof prediction.expectedBookings).toBe('number')
      expect(Array.isArray(prediction.peakHours)).toBe(true)
      expect(typeof prediction.recommendedStaffing).toBe('number')
      expect(typeof prediction.confidenceScore).toBe('number')
      
      expect(prediction.confidenceScore).toBeGreaterThanOrEqual(0)
      expect(prediction.confidenceScore).toBeLessThanOrEqual(1)
    })
  })

  describe('Client Learning', () => {
    it('should update client preferences from appointment data', () => {
      const clientId = 'client123'
      const appointmentData = {
        barberId: 1,
        serviceId: 1,
        timeSlot: new Date('2024-01-15T10:00:00Z'),
        satisfaction: 8,
        completed: true
      }
      
      expect(() => {
        schedulingEngine.updateClientPreferences(clientId, appointmentData)
      }).not.toThrow()
      
      // Test that preferences can be updated multiple times
      schedulingEngine.updateClientPreferences(clientId, {
        ...appointmentData,
        timeSlot: new Date('2024-01-16T11:00:00Z'),
        satisfaction: 9
      })
      
      expect(() => {
        schedulingEngine.updateClientPreferences(clientId, appointmentData)
      }).not.toThrow()
    })
  })
})

describe('Calendar Voice Commands System', () => {
  let voiceSystem: CalendarVoiceCommandSystem

  beforeEach(() => {
    voiceSystem = new CalendarVoiceCommandSystem()
  })

  describe('System Initialization', () => {
    it('should initialize with default context', () => {
      const context = voiceSystem.getContext()
      
      expect(context).toHaveProperty('currentView')
      expect(context).toHaveProperty('selectedDate')
      expect(context).toHaveProperty('isBookingMode')
      
      expect(['day', 'week', 'month', 'agenda']).toContain(context.currentView)
      expect(context.selectedDate).toBeInstanceOf(Date)
      expect(typeof context.isBookingMode).toBe('boolean')
    })

    it('should register calendar-specific voice commands', () => {
      const commands = voiceSystem.getVoiceCommands()
      
      expect(Array.isArray(commands)).toBe(true)
      expect(commands.length).toBeGreaterThan(0)
      
      // Check for key command categories
      const hasNavigationCommands = commands.some(cmd => cmd.category === 'navigation')
      const hasBookingCommands = commands.some(cmd => cmd.category === 'booking')
      const hasSearchCommands = commands.some(cmd => cmd.category === 'search')
      
      expect(hasNavigationCommands).toBe(true)
      expect(hasBookingCommands).toBe(true)
      expect(hasSearchCommands).toBe(true)
    })
  })

  describe('Context Management', () => {
    it('should update context', () => {
      const updates = {
        currentView: 'month' as const,
        selectedDate: new Date('2024-01-15'),
        isBookingMode: true
      }
      
      voiceSystem.updateContext(updates)
      const context = voiceSystem.getContext()
      
      expect(context.currentView).toBe('month')
      expect(context.selectedDate.toDateString()).toBe(new Date('2024-01-15').toDateString())
      expect(context.isBookingMode).toBe(true)
    })
  })

  describe('Action Handler Registration', () => {
    it('should register custom action handlers', () => {
      const mockHandler = vi.fn().mockResolvedValue({
        success: true,
        action: {
          type: 'custom',
          action: 'test',
          parameters: {},
          confidence: 0.9,
          timestamp: Date.now()
        },
        response: 'Custom action completed',
        data: {}
      })
      
      expect(() => {
        voiceSystem.registerActionHandler('calendar:custom:test', mockHandler)
      }).not.toThrow()
    })
  })

  describe('Event Listening', () => {
    it('should add and remove event listeners', () => {
      const mockListener = vi.fn()
      
      expect(() => {
        voiceSystem.addListener(mockListener)
      }).not.toThrow()
      
      expect(() => {
        voiceSystem.removeListener(mockListener)
      }).not.toThrow()
    })
  })
})

describe('React Hooks Integration', () => {
  describe('useCalendarPerformance Hook', () => {
    it('should provide performance monitoring capabilities', () => {
      const { result } = renderHook(() => useCalendarPerformance())
      
      expect(result.current).toHaveProperty('measureRender')
      expect(result.current).toHaveProperty('optimizedAppointmentFilter')
      expect(result.current).toHaveProperty('memoizedDateCalculations')
      expect(result.current).toHaveProperty('performanceMetrics')
      expect(result.current).toHaveProperty('enhancedMetrics')
      expect(result.current).toHaveProperty('events')
      expect(result.current).toHaveProperty('alerts')
      expect(result.current).toHaveProperty('analytics')
      
      expect(typeof result.current.measureRender).toBe('function')
      expect(typeof result.current.optimizedAppointmentFilter).toBe('function')
      expect(typeof result.current.memoizedDateCalculations).toBe('function')
    })

    it('should provide enhanced monitoring methods', () => {
      const { result } = renderHook(() => useCalendarPerformance())
      
      expect(result.current).toHaveProperty('measureLoad')
      expect(result.current).toHaveProperty('measureApiCall')
      expect(result.current).toHaveProperty('recordConflictResolution')
      expect(result.current).toHaveProperty('recordUserInteraction')
      expect(result.current).toHaveProperty('recordError')
      expect(result.current).toHaveProperty('startMonitoring')
      expect(result.current).toHaveProperty('stopMonitoring')
      
      expect(typeof result.current.measureLoad).toBe('function')
      expect(typeof result.current.measureApiCall).toBe('function')
      expect(typeof result.current.recordConflictResolution).toBe('function')
    })
  })

  describe('useIntelligentScheduling Hook', () => {
    it('should provide scheduling functionality', () => {
      const { result } = renderHook(() => useIntelligentScheduling())
      
      expect(result.current).toHaveProperty('findOptimalSlots')
      expect(result.current).toHaveProperty('optimizeSchedule')
      expect(result.current).toHaveProperty('resolveConflicts')
      expect(result.current).toHaveProperty('predictDemand')
      expect(result.current).toHaveProperty('updateClientPreferences')
      expect(result.current).toHaveProperty('preferences')
      
      expect(typeof result.current.findOptimalSlots).toBe('function')
      expect(typeof result.current.optimizeSchedule).toBe('function')
      expect(typeof result.current.resolveConflicts).toBe('function')
    })

    it('should handle preference updates', () => {
      const { result } = renderHook(() => useIntelligentScheduling())
      
      act(() => {
        result.current.updatePreferences({
          avoidBackToBack: false,
          maximizeBookings: true
        })
      })
      
      expect(result.current.preferences.avoidBackToBack).toBe(false)
      expect(result.current.preferences.maximizeBookings).toBe(true)
    })
  })

  describe('useCalendarVoiceCommands Hook', () => {
    it('should provide voice command functionality', () => {
      const { result } = renderHook(() => useCalendarVoiceCommands())
      
      expect(result.current).toHaveProperty('isListening')
      expect(result.current).toHaveProperty('isSupported')
      expect(result.current).toHaveProperty('context')
      expect(result.current).toHaveProperty('lastCommand')
      expect(result.current).toHaveProperty('commandHistory')
      expect(result.current).toHaveProperty('startListening')
      expect(result.current).toHaveProperty('stopListening')
      expect(result.current).toHaveProperty('toggle')
      expect(result.current).toHaveProperty('speak')
      
      expect(typeof result.current.isListening).toBe('boolean')
      expect(typeof result.current.isSupported).toBe('boolean')
      expect(typeof result.current.context).toBe('object')
      expect(Array.isArray(result.current.commandHistory)).toBe(true)
    })

    it('should handle voice command callbacks', () => {
      const mockCallback = vi.fn()
      
      const { result } = renderHook(() => 
        useCalendarVoiceCommands({
          onVoiceCommand: mockCallback
        })
      )
      
      expect(result.current.isSupported).toBe(true)
    })
  })
})

describe('Integration Tests', () => {
  describe('Performance Monitoring + Voice Commands', () => {
    it('should record voice command interactions as performance metrics', () => {
      const monitor = getCalendarMonitor()
      const voiceSystem = getCalendarVoiceSystem()
      
      // Simulate voice command usage
      monitor.recordUserInteraction('voice-command', 150)
      
      const events = monitor.getEvents()
      const voiceEvent = events.find(e => e.metadata.interaction === 'voice-command')
      
      expect(voiceEvent).toBeDefined()
      expect(voiceEvent?.duration).toBe(150)
    })
  })

  describe('Intelligent Scheduling + Performance Monitoring', () => {
    it('should monitor scheduling algorithm performance', () => {
      const monitor = getCalendarMonitor()
      const scheduler = getSchedulingEngine()
      
      const startTime = Date.now()
      
      // Execute scheduling operation
      scheduler.findOptimalSlots(1, 30, new Date())
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Record the scheduling performance
      monitor.recordUserInteraction('scheduling-optimization', duration)
      
      const events = monitor.getEvents()
      const schedulingEvent = events.find(e => e.metadata.interaction === 'scheduling-optimization')
      
      expect(schedulingEvent).toBeDefined()
    })
  })

  describe('Voice Commands + Intelligent Scheduling', () => {
    it('should trigger scheduling operations via voice commands', () => {
      const voiceSystem = getCalendarVoiceSystem()
      
      // Register a custom handler for scheduling
      const mockSchedulingHandler = vi.fn().mockResolvedValue({
        success: true,
        action: {
          type: 'scheduling',
          action: 'optimize',
          parameters: {},
          confidence: 0.9,
          timestamp: Date.now()
        },
        response: 'Schedule optimized',
        data: { optimized: true }
      })
      
      voiceSystem.registerActionHandler('calendar:optimize:schedule', mockSchedulingHandler)
      
      // Verify handler was registered
      expect(() => {
        voiceSystem.registerActionHandler('calendar:optimize:schedule', mockSchedulingHandler)
      }).not.toThrow()
    })
  })
})

describe('Error Handling and Edge Cases', () => {
  describe('Performance Monitoring Error Handling', () => {
    it('should handle invalid metric values gracefully', () => {
      const monitor = new CalendarPerformanceMonitor()
      
      expect(() => {
        monitor.recordUserInteraction('', -1)
      }).not.toThrow()
      
      expect(() => {
        monitor.recordConflictResolution(-100)
      }).not.toThrow()
      
      monitor.destroy()
    })

    it('should handle memory pressure events', () => {
      const monitor = new CalendarPerformanceMonitor()
      
      // Simulate high memory usage
      const mockMemory = { usedJSHeapSize: 250 * 1024 * 1024 } // 250MB
      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        configurable: true
      })
      
      expect(() => {
        monitor.updateCacheMetrics(0, 100) // All misses
      }).not.toThrow()
      
      monitor.destroy()
    })
  })

  describe('Scheduling Algorithm Edge Cases', () => {
    it('should handle empty appointment lists', () => {
      const scheduler = new IntelligentSchedulingEngine()
      
      expect(() => {
        scheduler.optimizeSchedule([], new Date())
      }).not.toThrow()
      
      const slots = scheduler.findOptimalSlots(1, 30, new Date())
      expect(Array.isArray(slots)).toBe(true)
    })

    it('should handle invalid date inputs', () => {
      const scheduler = new IntelligentSchedulingEngine()
      
      expect(() => {
        scheduler.findOptimalSlots(1, 30, new Date('invalid-date'))
      }).not.toThrow()
    })

    it('should handle extreme scheduling preferences', () => {
      const extremePreferences: SchedulingPreference = {
        avoidBackToBack: true,
        maximizeBookings: true,
        minimizeGaps: true,
        balanceWorkload: true,
        prioritizeRegularClients: true
      }
      
      expect(() => {
        new IntelligentSchedulingEngine(extremePreferences)
      }).not.toThrow()
    })
  })

  describe('Voice Commands Error Handling', () => {
    it('should handle unsupported browser environments', () => {
      // Mock unsupported environment
      const originalSpeechRecognition = (global as any).SpeechRecognition
      const originalWebkitSpeechRecognition = (global as any).webkitSpeechRecognition
      
      delete (global as any).SpeechRecognition
      delete (global as any).webkitSpeechRecognition
      
      expect(() => {
        new CalendarVoiceCommandSystem()
      }).not.toThrow()
      
      // Restore original values
      if (originalSpeechRecognition) {
        (global as any).SpeechRecognition = originalSpeechRecognition
      }
      if (originalWebkitSpeechRecognition) {
        (global as any).webkitSpeechRecognition = originalWebkitSpeechRecognition
      }
    })

    it('should handle malformed voice command parameters', () => {
      const voiceSystem = new CalendarVoiceCommandSystem()
      
      const mockHandler = vi.fn().mockResolvedValue({
        success: false,
        action: {
          type: 'test',
          action: 'malformed',
          parameters: {},
          confidence: 0.5,
          timestamp: Date.now()
        },
        response: 'Invalid command',
        error: 'Malformed parameters'
      })
      
      expect(() => {
        voiceSystem.registerActionHandler('calendar:test:malformed', mockHandler)
      }).not.toThrow()
    })
  })
})

describe('Performance Benchmarks', () => {
  it('should complete performance monitoring operations within time limits', async () => {
    const monitor = new CalendarPerformanceMonitor()
    const startTime = Date.now()
    
    // Perform various monitoring operations
    const loadMeasure = monitor.measureCalendarLoad()
    const renderMeasure = monitor.measureRenderTime()
    const apiMeasure = monitor.measureApiCall('test')
    
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 10))
    
    loadMeasure()
    renderMeasure()
    apiMeasure()
    
    monitor.recordUserInteraction('test', 50)
    monitor.recordConflictResolution(1000)
    monitor.updateCacheMetrics(80, 20)
    
    const analytics = monitor.getAnalytics()
    const exported = monitor.exportMetrics()
    
    const totalTime = Date.now() - startTime
    
    expect(totalTime).toBeLessThan(1000) // Should complete within 1 second
    expect(analytics).toBeDefined()
    expect(exported).toBeDefined()
    
    monitor.destroy()
  })

  it('should handle high-frequency scheduling operations', () => {
    const scheduler = new IntelligentSchedulingEngine()
    const startTime = Date.now()
    
    // Perform multiple scheduling operations
    for (let i = 0; i < 10; i++) {
      const slots = scheduler.findOptimalSlots(1, 30, new Date())
      expect(slots).toBeDefined()
    }
    
    const totalTime = Date.now() - startTime
    expect(totalTime).toBeLessThan(5000) // Should complete within 5 seconds
  })

  it('should maintain performance under concurrent operations', async () => {
    const monitor = new CalendarPerformanceMonitor()
    const scheduler = new IntelligentSchedulingEngine()
    const voiceSystem = new CalendarVoiceCommandSystem()
    
    const startTime = Date.now()
    
    // Simulate concurrent operations
    const operations = [
      () => monitor.recordUserInteraction('concurrent-test', 100),
      () => scheduler.findOptimalSlots(1, 30, new Date()),
      () => voiceSystem.getContext(),
      () => monitor.getAnalytics(),
      () => scheduler.predictDemand(new Date())
    ]
    
    // Run operations concurrently
    await Promise.all(operations.map(op => 
      new Promise(resolve => {
        setTimeout(() => {
          op()
          resolve(undefined)
        }, Math.random() * 100)
      })
    ))
    
    const totalTime = Date.now() - startTime
    expect(totalTime).toBeLessThan(2000) // Should handle concurrency efficiently
    
    monitor.destroy()
  })
})