import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

export function useAnimation() {
  const shouldReduceMotion = useReducedMotion()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const getAnimationProps = (animation: any) => {
    if (!isClient || shouldReduceMotion) {
      return {}
    }
    return animation
  }

  const getTransition = (transition: any) => {
    if (!isClient || shouldReduceMotion) {
      return { duration: 0.01 }
    }
    return transition
  }

  return {
    isClient,
    shouldReduceMotion,
    getAnimationProps,
    getTransition
  }
}