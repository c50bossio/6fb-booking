'use client'

import { useCallback, useRef, useEffect } from 'react'
import { animationPresets } from '@/lib/animations'

interface VisualEffectsConfig {
  enableRipples?: boolean
  enableParticles?: boolean
  enableGlow?: boolean
  enableShimmer?: boolean
  enablePulse?: boolean
  performance?: 'low' | 'medium' | 'high'
}

interface RippleEffect {
  x: number
  y: number
  color?: string
  size?: number
  duration?: number
}

interface ParticleEffect {
  x: number
  y: number
  count?: number
  colors?: string[]
  direction?: 'up' | 'down' | 'radial'
  duration?: number
}

/**
 * Comprehensive visual effects system for calendar interactions
 * Provides ripples, particles, glows, and other micro-interactions
 */
export class CalendarVisualEffects {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private effects: Array<{
    id: string
    type: string
    timestamp: number
    duration: number
    draw: (progress: number) => void
  }> = []
  private animationId: number | null = null
  private config: VisualEffectsConfig = {}

  constructor(canvas?: HTMLCanvasElement, config: VisualEffectsConfig = {}) {
    this.config = {
      enableRipples: true,
      enableParticles: true,
      enableGlow: true,
      enableShimmer: true,
      enablePulse: true,
      performance: 'medium',
      ...config
    }

    if (canvas) {
      this.setCanvas(canvas)
    }
  }

  setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.startAnimationLoop()
  }

  private startAnimationLoop() {
    if (this.animationId) return

    const animate = () => {
      this.clearCanvas()
      this.updateEffects()
      this.drawEffects()
      
      if (this.effects.length > 0) {
        this.animationId = requestAnimationFrame(animate)
      } else {
        this.animationId = null
      }
    }

    this.animationId = requestAnimationFrame(animate)
  }

  private clearCanvas() {
    if (!this.ctx || !this.canvas) return
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  private updateEffects() {
    const now = Date.now()
    this.effects = this.effects.filter(effect => {
      return now - effect.timestamp < effect.duration
    })
  }

  private drawEffects() {
    const now = Date.now()
    this.effects.forEach(effect => {
      const elapsed = now - effect.timestamp
      const progress = Math.min(elapsed / effect.duration, 1)
      effect.draw(progress)
    })
  }

  /**
   * Create ripple effect at specified coordinates
   */
  createRipple({ x, y, color = '#3B82F6', size = 50, duration = 800 }: RippleEffect) {
    if (!this.config.enableRipples || !this.ctx) return

    const id = `ripple_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.effects.push({
      id,
      type: 'ripple',
      timestamp: Date.now(),
      duration,
      draw: (progress: number) => {
        if (!this.ctx) return
        
        const radius = size * progress
        const opacity = 1 - progress
        
        this.ctx.save()
        this.ctx.globalAlpha = opacity * 0.6
        this.ctx.strokeStyle = color
        this.ctx.lineWidth = 2
        this.ctx.beginPath()
        this.ctx.arc(x, y, radius, 0, Math.PI * 2)
        this.ctx.stroke()
        
        // Inner ripple
        this.ctx.globalAlpha = opacity * 0.3
        this.ctx.beginPath()
        this.ctx.arc(x, y, radius * 0.7, 0, Math.PI * 2)
        this.ctx.stroke()
        
        this.ctx.restore()
      }
    })

    this.startAnimationLoop()
  }

  /**
   * Create particle explosion effect
   */
  createParticles({ 
    x, 
    y, 
    count = 10, 
    colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'],
    direction = 'radial',
    duration = 1500 
  }: ParticleEffect) {
    if (!this.config.enableParticles || !this.ctx) return

    const particles = Array.from({ length: count }, (_, i) => {
      let angle = (Math.PI * 2 / count) * i
      const velocity = 2 + Math.random() * 3
      
      if (direction === 'up') {
        angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 3
      } else if (direction === 'down') {
        angle = Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 3
      }

      return {
        startX: x,
        startY: y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 4,
        life: 1
      }
    })

    const id = `particles_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.effects.push({
      id,
      type: 'particles',
      timestamp: Date.now(),
      duration,
      draw: (progress: number) => {
        if (!this.ctx) return
        
        particles.forEach(particle => {
          const currentX = particle.startX + particle.vx * progress * 50
          const currentY = particle.startY + particle.vy * progress * 50
          const opacity = 1 - progress
          const size = particle.size * (1 - progress * 0.5)
          
          this.ctx!.save()
          this.ctx!.globalAlpha = opacity
          this.ctx!.fillStyle = particle.color
          this.ctx!.beginPath()
          this.ctx!.arc(currentX, currentY, size, 0, Math.PI * 2)
          this.ctx!.fill()
          this.ctx!.restore()
        })
      }
    })

    this.startAnimationLoop()
  }

  /**
   * Create pulsing glow effect
   */
  createGlow(element: HTMLElement, color = '#3B82F6', intensity = 'medium') {
    if (!this.config.enableGlow) return

    const intensities = {
      low: { blur: '4px', spread: '2px' },
      medium: { blur: '8px', spread: '4px' },
      high: { blur: '16px', spread: '8px' }
    }

    const glowStyle = intensities[intensity as keyof typeof intensities] || intensities.medium
    
    element.style.boxShadow = `0 0 ${glowStyle.blur} ${glowStyle.spread} ${color}40`
    element.style.transition = 'box-shadow 300ms ease-out'
    
    // Pulse animation
    const pulseAnimation = element.animate([
      { boxShadow: `0 0 ${glowStyle.blur} ${glowStyle.spread} ${color}40` },
      { boxShadow: `0 0 ${glowStyle.blur} ${glowStyle.spread} ${color}80` },
      { boxShadow: `0 0 ${glowStyle.blur} ${glowStyle.spread} ${color}40` }
    ], {
      duration: 2000,
      iterations: Infinity,
      easing: 'ease-in-out'
    })

    return () => {
      pulseAnimation.cancel()
      element.style.boxShadow = 'none'
    }
  }

  /**
   * Create shimmer effect across element
   */
  createShimmer(element: HTMLElement, direction = 'right', duration = 1500) {
    if (!this.config.enableShimmer) return

    element.style.position = 'relative'
    element.style.overflow = 'hidden'

    const shimmer = document.createElement('div')
    shimmer.style.position = 'absolute'
    shimmer.style.top = '0'
    shimmer.style.left = '-100%'
    shimmer.style.width = '100%'
    shimmer.style.height = '100%'
    shimmer.style.background = 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)'
    shimmer.style.pointerEvents = 'none'
    shimmer.style.zIndex = '1'

    element.appendChild(shimmer)

    const animation = shimmer.animate([
      { transform: direction === 'right' ? 'translateX(0%)' : 'translateX(200%)' },
      { transform: direction === 'right' ? 'translateX(200%)' : 'translateX(0%)' }
    ], {
      duration,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    })

    animation.onfinish = () => {
      shimmer.remove()
    }

    return () => {
      animation.cancel()
      shimmer.remove()
    }
  }

  /**
   * Create success checkmark animation
   */
  createSuccessCheckmark(x: number, y: number, size = 30, color = '#10B981') {
    if (!this.ctx) return

    const id = `checkmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const duration = 800
    
    this.effects.push({
      id,
      type: 'checkmark',
      timestamp: Date.now(),
      duration,
      draw: (progress: number) => {
        if (!this.ctx) return
        
        this.ctx.save()
        this.ctx.strokeStyle = color
        this.ctx.lineWidth = 3
        this.ctx.lineCap = 'round'
        this.ctx.lineJoin = 'round'
        
        // Circle background
        const circleProgress = Math.min(progress * 1.5, 1)
        this.ctx.globalAlpha = 0.2
        this.ctx.fillStyle = color
        this.ctx.beginPath()
        this.ctx.arc(x, y, size, 0, Math.PI * 2 * circleProgress)
        this.ctx.fill()
        
        // Checkmark
        if (progress > 0.3) {
          const checkProgress = (progress - 0.3) / 0.7
          this.ctx.globalAlpha = 1
          this.ctx.beginPath()
          
          // First line of checkmark
          const firstLineProgress = Math.min(checkProgress * 2, 1)
          this.ctx.moveTo(x - size * 0.3, y)
          this.ctx.lineTo(
            x - size * 0.3 + (size * 0.2) * firstLineProgress,
            y + (size * 0.2) * firstLineProgress
          )
          this.ctx.stroke()
          
          // Second line of checkmark
          if (checkProgress > 0.5) {
            const secondLineProgress = (checkProgress - 0.5) / 0.5
            this.ctx.beginPath()
            this.ctx.moveTo(x - size * 0.1, y + size * 0.2)
            this.ctx.lineTo(
              x - size * 0.1 + (size * 0.4) * secondLineProgress,
              y + size * 0.2 - (size * 0.4) * secondLineProgress
            )
            this.ctx.stroke()
          }
        }
        
        this.ctx.restore()
      }
    })

    this.startAnimationLoop()
  }

  /**
   * Create loading dots animation
   */
  createLoadingDots(x: number, y: number, count = 3, color = '#6B7280') {
    if (!this.ctx) return

    const id = `loading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const duration = 2000
    
    this.effects.push({
      id,
      type: 'loading',
      timestamp: Date.now(),
      duration,
      draw: (progress: number) => {
        if (!this.ctx) return
        
        this.ctx.save()
        this.ctx.fillStyle = color
        
        for (let i = 0; i < count; i++) {
          const dotX = x + i * 15 - (count - 1) * 7.5
          const phase = (progress * 4 + i * 0.5) % 2
          const opacity = phase <= 1 ? phase : 2 - phase
          const scale = 0.5 + opacity * 0.5
          
          this.ctx.globalAlpha = opacity
          this.ctx.beginPath()
          this.ctx.arc(dotX, y, 4 * scale, 0, Math.PI * 2)
          this.ctx.fill()
        }
        
        this.ctx.restore()
      }
    })

    this.startAnimationLoop()
  }

  /**
   * Clean up all effects and stop animation loop
   */
  cleanup() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    this.effects = []
    this.clearCanvas()
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VisualEffectsConfig>) {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get performance statistics
   */
  getStats() {
    return {
      activeEffects: this.effects.length,
      isAnimating: this.animationId !== null,
      config: this.config
    }
  }
}

/**
 * React hook for using visual effects
 */
export function useCalendarVisualEffects(config?: VisualEffectsConfig) {
  const effectsRef = useRef<CalendarVisualEffects | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const initializeEffects = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas
    effectsRef.current = new CalendarVisualEffects(canvas, config)
  }, [config])

  const createRipple = useCallback((ripple: RippleEffect) => {
    effectsRef.current?.createRipple(ripple)
  }, [])

  const createParticles = useCallback((particles: ParticleEffect) => {
    effectsRef.current?.createParticles(particles)
  }, [])

  const createGlow = useCallback((element: HTMLElement, color?: string, intensity?: string) => {
    return effectsRef.current?.createGlow(element, color, intensity)
  }, [])

  const createShimmer = useCallback((element: HTMLElement, direction?: string, duration?: number) => {
    return effectsRef.current?.createShimmer(element, direction, duration)
  }, [])

  const createSuccessCheckmark = useCallback((x: number, y: number, size?: number, color?: string) => {
    effectsRef.current?.createSuccessCheckmark(x, y, size, color)
  }, [])

  const createLoadingDots = useCallback((x: number, y: number, count?: number, color?: string) => {
    effectsRef.current?.createLoadingDots(x, y, count, color)
  }, [])

  useEffect(() => {
    return () => {
      effectsRef.current?.cleanup()
    }
  }, [])

  return {
    initializeEffects,
    createRipple,
    createParticles,
    createGlow,
    createShimmer,
    createSuccessCheckmark,
    createLoadingDots,
    canvasRef,
    effects: effectsRef.current
  }
}

/**
 * Performance-optimized visual effects utilities
 */
export const VisualEffectsUtils = {
  /**
   * Check if reduced motion is preferred
   */
  shouldReduceMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  },

  /**
   * Get optimal performance configuration based on device capabilities
   */
  getOptimalConfig(): VisualEffectsConfig {
    const isHighPerformanceDevice = () => {
      // Simple performance detection
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      return gl !== null && navigator.hardwareConcurrency >= 4
    }

    if (this.shouldReduceMotion()) {
      return {
        enableRipples: false,
        enableParticles: false,
        enableGlow: false,
        enableShimmer: false,
        enablePulse: false,
        performance: 'low'
      }
    }

    return {
      enableRipples: true,
      enableParticles: isHighPerformanceDevice(),
      enableGlow: true,
      enableShimmer: true,
      enablePulse: true,
      performance: isHighPerformanceDevice() ? 'high' : 'medium'
    }
  },

  /**
   * Debounce visual effects to prevent excessive calls
   */
  debounceEffect(fn: Function, delay: number = 100) {
    let timeoutId: number
    return (...args: any[]) => {
      clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => fn.apply(null, args), delay)
    }
  },

  /**
   * Throttle visual effects for performance
   */
  throttleEffect(fn: Function, limit: number = 100) {
    let inThrottle: boolean
    return (...args: any[]) => {
      if (!inThrottle) {
        fn.apply(null, args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }
}

export default CalendarVisualEffects