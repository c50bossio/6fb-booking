'use client'

/**
 * Mobile-optimized time picker with enhanced touch interactions
 * Provides wheel-style selection, haptic feedback, and large touch targets
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, useAnimation } from '@/lib/framer-motion'
import { format, setHours, setMinutes, startOfDay, addMinutes } from 'date-fns'
import { ChevronUpIcon, ChevronDownIcon, ClockIcon } from '@heroicons/react/24/outline'
import { useTouchEnhancements, TOUCH_TARGET_SIZES } from '@/lib/mobile-touch-enhancements'
import { Haptics, ImpactStyle } from '@/lib/capacitor-haptics'

interface MobileTimePickerProps {
  selectedTime: Date
  onTimeChange: (time: Date) => void
  minTime?: Date
  maxTime?: Date
  minuteInterval?: number
  onClose?: () => void
  className?: string
}

export function MobileTimePicker({
  selectedTime,
  onTimeChange,
  minTime,
  maxTime,
  minuteInterval = 15,
  onClose,
  className = ''
}: MobileTimePickerProps) {
  const [hour, setHour] = useState(selectedTime.getHours())
  const [minute, setMinute] = useState(Math.floor(selectedTime.getMinutes() / minuteInterval) * minuteInterval)
  const [isPM, setIsPM] = useState(hour >= 12)
  const hourWheelRef = useRef<HTMLDivElement>(null)
  const minuteWheelRef = useRef<HTMLDivElement>(null)

  // Generate available hours and minutes
  const hours = Array.from({ length: 12 }, (_, i) => i === 0 ? 12 : i)
  const minutes = Array.from({ length: 60 / minuteInterval }, (_, i) => i * minuteInterval)

  // Haptic feedback
  const triggerHaptic = useCallback(async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light })
    } catch (error) {
      }
  }, [])

  // Update time
  const updateTime = useCallback((newHour: number, newMinute: number, newIsPM: boolean) => {
    let adjustedHour = newHour
    if (newIsPM && newHour !== 12) {
      adjustedHour += 12
    } else if (!newIsPM && newHour === 12) {
      adjustedHour = 0
    }

    const newTime = setMinutes(setHours(startOfDay(selectedTime), adjustedHour), newMinute)
    
    // Check bounds
    if (minTime && newTime < minTime) return
    if (maxTime && newTime > maxTime) return

    triggerHaptic()
    onTimeChange(newTime)
  }, [selectedTime, minTime, maxTime, onTimeChange, triggerHaptic])

  // Wheel component
  const TimeWheel = ({ 
    values, 
    selected, 
    onChange, 
    label,
    format: formatFn = (v: number) => v.toString().padStart(2, '0')
  }: {
    values: number[]
    selected: number
    onChange: (value: number) => void
    label: string
    format?: (value: number) => string
  }) => {
    const wheelRef = useRef<HTMLDivElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [startY, setStartY] = useState(0)
    const [scrollY, setScrollY] = useState(0)

    // Handle touch scrolling
    useTouchEnhancements(wheelRef, (gesture) => {
      if (gesture.type === 'drag') {
        const deltaY = gesture.endY! - gesture.startY
        const itemHeight = 48
        const scrollDelta = Math.round(deltaY / itemHeight)
        
        if (scrollDelta !== 0) {
          const currentIndex = values.indexOf(selected)
          const newIndex = Math.max(0, Math.min(values.length - 1, currentIndex - scrollDelta))
          onChange(values[newIndex])
        }
      }
    }, {
      enableSwipe: false
    })

    const selectedIndex = values.indexOf(selected)

    return (
      <div className="flex flex-col items-center">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          {label}
        </label>
        
        <div className="relative h-48 w-20 overflow-hidden">
          {/* Selection indicator */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 bg-blue-50 dark:bg-blue-900/20 border-y border-blue-200 dark:border-blue-800 pointer-events-none z-10" />
          
          {/* Wheel items */}
          <div
            ref={wheelRef}
            className="absolute inset-0 flex flex-col items-center py-16"
            style={{
              transform: `translateY(${-selectedIndex * 48 + 48}px)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out'
            }}
          >
            {values.map((value, index) => (
              <button
                key={value}
                onClick={() => onChange(value)}
                className={`
                  h-12 w-full flex items-center justify-center
                  text-lg font-medium transition-all duration-200
                  ${value === selected 
                    ? 'text-blue-600 dark:text-blue-400 scale-110' 
                    : 'text-gray-500 dark:text-gray-400 scale-90'
                  }
                `}
              >
                {formatFn(value)}
              </button>
            ))}
          </div>

          {/* Gradient overlays */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white dark:from-gray-900 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none" />
        </div>

        {/* Quick adjustment buttons */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => {
              const currentIndex = values.indexOf(selected)
              if (currentIndex > 0) onChange(values[currentIndex - 1])
            }}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronUpIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              const currentIndex = values.indexOf(selected)
              if (currentIndex < values.length - 1) onChange(values[currentIndex + 1])
            }}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronDownIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className={`
        fixed inset-x-0 bottom-0 z-50
        bg-white dark:bg-gray-900 
        rounded-t-3xl shadow-2xl
        ${className}
      `}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ClockIcon className="w-5 h-5" />
          Select Time
        </h3>
        <button
          onClick={onClose}
          className="text-sm font-medium text-blue-600 dark:text-blue-400"
        >
          Done
        </button>
      </div>

      {/* Time display */}
      <div className="p-4 text-center">
        <div className="text-3xl font-bold text-gray-900 dark:text-white">
          {format(
            setMinutes(setHours(startOfDay(selectedTime), hour + (isPM && hour !== 12 ? 12 : 0)), minute),
            'h:mm a'
          )}
        </div>
      </div>

      {/* Wheel pickers */}
      <div className="flex justify-center gap-4 p-4">
        <TimeWheel
          values={hours}
          selected={hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}
          onChange={(h) => {
            setHour(h === 12 ? (isPM ? 12 : 0) : (isPM && h !== 12 ? h + 12 : h))
            updateTime(h, minute, isPM)
          }}
          label="Hour"
        />

        <div className="flex items-center text-2xl font-bold text-gray-400">:</div>

        <TimeWheel
          values={minutes}
          selected={minute}
          onChange={(m) => {
            setMinute(m)
            updateTime(hour, m, isPM)
          }}
          label="Minute"
        />

        <div className="flex flex-col items-center">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Period
          </label>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                setIsPM(false)
                updateTime(hour, minute, false)
              }}
              className={`
                px-4 py-2 rounded-lg font-medium transition-colors
                ${!isPM 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }
              `}
            >
              AM
            </button>
            <button
              onClick={() => {
                setIsPM(true)
                updateTime(hour, minute, true)
              }}
              className={`
                px-4 py-2 rounded-lg font-medium transition-colors
                ${isPM 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }
              `}
            >
              PM
            </button>
          </div>
        </div>
      </div>

      {/* Quick time selection */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Quick selection:</p>
        <div className="grid grid-cols-4 gap-2">
          {[9, 10, 11, 12, 13, 14, 15, 16].map((h) => (
            <button
              key={h}
              onClick={() => {
                const adjustedHour = h > 12 ? h - 12 : h
                setHour(adjustedHour)
                setMinute(0)
                setIsPM(h >= 12)
                updateTime(adjustedHour, 0, h >= 12)
              }}
              className="py-2 px-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {h > 12 ? h - 12 : h}:00 {h >= 12 ? 'PM' : 'AM'}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Mobile-optimized duration picker
 */
interface MobileDurationPickerProps {
  duration: number // in minutes
  onDurationChange: (duration: number) => void
  minDuration?: number
  maxDuration?: number
  step?: number
  presets?: number[]
  onClose?: () => void
  className?: string
}

export function MobileDurationPicker({
  duration,
  onDurationChange,
  minDuration = 15,
  maxDuration = 240,
  step = 15,
  presets = [30, 45, 60, 90, 120],
  onClose,
  className = ''
}: MobileDurationPickerProps) {
  const sliderRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className={`
        fixed inset-x-0 bottom-0 z-50
        bg-white dark:bg-gray-900 
        rounded-t-3xl shadow-2xl
        ${className}
      `}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold">Duration</h3>
        <button
          onClick={onClose}
          className="text-sm font-medium text-blue-600 dark:text-blue-400"
        >
          Done
        </button>
      </div>

      {/* Current duration display */}
      <div className="p-6 text-center">
        <div className="text-4xl font-bold text-gray-900 dark:text-white">
          {formatDuration(duration)}
        </div>
      </div>

      {/* Slider */}
      <div className="px-6 pb-4">
        <div className="relative">
          <input
            type="range"
            min={minDuration}
            max={maxDuration}
            step={step}
            value={duration}
            onChange={(e) => onDurationChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${
                ((duration - minDuration) / (maxDuration - minDuration)) * 100
              }%, #E5E7EB ${
                ((duration - minDuration) / (maxDuration - minDuration)) * 100
              }%, #E5E7EB 100%)`
            }}
          />
          {/* Custom thumb for better touch */}
          <style jsx>{`
            .slider::-webkit-slider-thumb {
              appearance: none;
              width: 28px;
              height: 28px;
              background: #3B82F6;
              border-radius: 50%;
              cursor: pointer;
              box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            }
          `}</style>
        </div>
        
        {/* Min/Max labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{formatDuration(minDuration)}</span>
          <span>{formatDuration(maxDuration)}</span>
        </div>
      </div>

      {/* Preset buttons */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Common durations:</p>
        <div className="grid grid-cols-3 gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              onClick={() => onDurationChange(preset)}
              className={`
                py-3 px-4 rounded-lg font-medium transition-colors
                ${duration === preset
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
            >
              {formatDuration(preset)}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}