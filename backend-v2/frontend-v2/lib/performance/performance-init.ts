/**
 * Performance initialization script
 * Runs critical performance optimizations on app startup
 */

import { initializePerformanceOptimizations } from './performance-optimization'

// Initialize performance optimizations immediately
if (typeof window !== 'undefined') {
  // Start performance monitoring
  const startTime = performance.now()
  
  // Initialize all optimizations
  initializePerformanceOptimizations()
  
  // Monitor initial load time
  window.addEventListener('load', () => {
    const loadTime = performance.now() - startTime
    
    if (process.env.NODE_ENV === 'development') {
      console.group('📊 Performance Metrics')
      console.log(`⏱️ App initialization: ${loadTime.toFixed(2)}ms`)
      
      // Monitor Web Vitals
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'largest-contentful-paint') {
                console.log(`🎨 LCP: ${entry.startTime.toFixed(2)}ms`)
              }
              if (entry.entryType === 'first-input' && 'processingStart' in entry) {
                console.log(`👆 FID: ${((entry as any).processingStart - entry.startTime).toFixed(2)}ms`)
              }
              if (entry.entryType === 'layout-shift' && !((entry as any).hadRecentInput)) {
                console.log(`📏 CLS: ${(entry as any).value}`)
              }
            }
          })
          
          observer.observe({ 
            entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] 
          })
        } catch (e) {
          // Ignore if not supported
        }
      }
      
      console.groupEnd()
    }
    
    // Report slow load times
    if (loadTime > 3000) {
      console.warn(`⚠️ Slow app load detected: ${loadTime.toFixed(2)}ms`)
      
      // In production, this could report to analytics
      if (process.env.NODE_ENV === 'production' && window.gtag) {
        window.gtag('event', 'timing_complete', {
          name: 'app_load_time',
          value: Math.round(loadTime)
        })
      }
    }
  })
  
  // Monitor for performance issues during runtime
  let slowRenderCount = 0
  const originalRender = console.time
  
  // Wrap console.time to detect slow operations
  console.time = function(label: string) {
    if (label && label.includes('render')) {
      setTimeout(() => {
        slowRenderCount++
        if (slowRenderCount > 5) {
          console.warn('⚠️ Multiple slow renders detected - check for performance issues')
        }
      }, 100)
    }
    return originalRender.call(this, label)
  }
}

export { initializePerformanceOptimizations }