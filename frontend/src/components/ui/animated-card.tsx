'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { cardHover } from '@/lib/animations'

interface AnimatedCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function AnimatedCard({
  children,
  className,
  hover = true,
  ...props
}: AnimatedCardProps) {
  return (
    <motion.div
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        className
      )}
      variants={hover ? cardHover : undefined}
      initial={hover ? "rest" : undefined}
      whileHover={hover ? "hover" : undefined}
      whileTap={hover ? "tap" : undefined}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedCardContent({
  children,
  className,
  ...props
}: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={cn("p-6", className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}
