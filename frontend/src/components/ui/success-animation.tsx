'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check, CheckCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SuccessAnimationProps {
  show: boolean
  message?: string
  onComplete?: () => void
  className?: string
}

export function SuccessAnimation({
  show,
  message = "Success!",
  onComplete,
  className
}: SuccessAnimationProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={cn("fixed inset-0 flex items-center justify-center z-50", className)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onAnimationComplete={onComplete}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Success Card */}
          <motion.div
            className="relative bg-white rounded-lg p-8 shadow-xl"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 15 }}
          >
            {/* Sparkles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                initial={{
                  x: 0,
                  y: 0,
                  opacity: 0
                }}
                animate={{
                  x: Math.cos(i * 60 * Math.PI / 180) * 100,
                  y: Math.sin(i * 60 * Math.PI / 180) * 100,
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 1,
                  delay: 0.3,
                  ease: "easeOut"
                }}
              >
                <Sparkles className="h-6 w-6 text-yellow-400" />
              </motion.div>
            ))}

            {/* Checkmark Circle */}
            <motion.div
              className="mx-auto mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                damping: 10,
                delay: 0.2
              }}
            >
              <div className="relative">
                <motion.div
                  className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center"
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 0.5,
                    delay: 0.4
                  }}
                >
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </motion.div>

                {/* Ring animation */}
                <motion.div
                  className="absolute inset-0 border-4 border-green-500 rounded-full"
                  initial={{ scale: 0.8, opacity: 1 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{
                    duration: 0.8,
                    delay: 0.5
                  }}
                />
              </div>
            </motion.div>

            {/* Message */}
            <motion.h3
              className="text-xl font-semibold text-center text-gray-900"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {message}
            </motion.h3>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function MiniSuccessAnimation({ show, className }: { show: boolean; className?: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={cn("inline-flex items-center", className)}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
        >
          <motion.div
            className="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center"
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 0.3,
              times: [0, 0.5, 1]
            }}
          >
            <Check className="h-3 w-3 text-white" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
