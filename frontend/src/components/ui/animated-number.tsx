'use client'

import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'

interface AnimatedNumberProps {
  value: number
  format?: (value: number) => string
  duration?: number
  className?: string
}

export function AnimatedNumber({
  value,
  format = (v) => v.toLocaleString(),
  duration = 0.5,
  className
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, Math.round)
  const formatted = useTransform(rounded, format)
  const previousValue = useRef(0)

  useEffect(() => {
    const animation = animate(motionValue, value, {
      duration,
      ease: "easeOut"
    })

    previousValue.current = value

    return animation.stop
  }, [motionValue, value, duration])

  return (
    <motion.span className={className}>
      {formatted}
    </motion.span>
  )
}
