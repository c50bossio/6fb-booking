'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Trophy, 
  Star, 
  Crown,
  Zap,
  Gift,
  X,
  Share2,
  Sparkles
} from 'lucide-react'

interface CelebrationData {
  achievement_name: string
  achievement_description: string
  rarity: string
  category: string
  xp_earned: number
  icon?: string
  badge_design?: {
    background_color: string
    border_color: string
    icon_color: string
  }
  color_scheme?: {
    primary: string
    secondary: string
    accent: string
  }
  level_up_occurred?: boolean
}

interface AchievementCelebrationProps {
  isVisible: boolean
  celebrationData: CelebrationData | null
  onClose: () => void
  onShare?: () => void
}

export function AchievementCelebration({ 
  isVisible, 
  celebrationData, 
  onClose, 
  onShare 
}: AchievementCelebrationProps) {
  const [showFireworks, setShowFireworks] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  useEffect(() => {
    if (isVisible && celebrationData) {
      // Trigger fireworks for rare achievements
      if (['epic', 'legendary'].includes(celebrationData.rarity)) {
        setShowFireworks(true)
        setTimeout(() => setShowFireworks(false), 3000)
      }

      // Play celebration sound (if available)
      if (soundEnabled) {
        playAchievementSound(celebrationData.rarity)
      }

      // Auto-close after 8 seconds for common achievements
      if (celebrationData.rarity === 'common') {
        setTimeout(() => {
          onClose()
        }, 8000)
      }
    }
  }, [isVisible, celebrationData, soundEnabled, onClose])

  const playAchievementSound = (rarity: string) => {
    try {
      // This would play achievement sounds based on rarity
      // Implementation would depend on audio assets
      const audio = new Audio(`/sounds/achievement-${rarity}.mp3`)
      audio.volume = 0.5
      audio.play().catch(() => {
        // Fail silently if audio doesn't work
      })
    } catch (error) {
      // Audio not available, continue without sound
    }
  }

  const getRarityConfig = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return {
          bgGradient: 'from-gray-100 to-gray-200',
          textColor: 'text-gray-800',
          glowColor: 'shadow-gray-500/20',
          particles: 10,
          animationDuration: 0.6
        }
      case 'uncommon':
        return {
          bgGradient: 'from-green-100 to-green-200',
          textColor: 'text-green-800',
          glowColor: 'shadow-green-500/30',
          particles: 15,
          animationDuration: 0.8
        }
      case 'rare':
        return {
          bgGradient: 'from-blue-100 to-blue-200',
          textColor: 'text-blue-800',
          glowColor: 'shadow-blue-500/40',
          particles: 20,
          animationDuration: 1.0
        }
      case 'epic':
        return {
          bgGradient: 'from-purple-100 to-purple-200',
          textColor: 'text-purple-800',
          glowColor: 'shadow-purple-500/50',
          particles: 30,
          animationDuration: 1.2
        }
      case 'legendary':
        return {
          bgGradient: 'from-yellow-100 to-yellow-200',
          textColor: 'text-yellow-800',
          glowColor: 'shadow-yellow-500/60',
          particles: 40,
          animationDuration: 1.5
        }
      default:
        return {
          bgGradient: 'from-gray-100 to-gray-200',
          textColor: 'text-gray-800',
          glowColor: 'shadow-gray-500/20',
          particles: 10,
          animationDuration: 0.6
        }
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'revenue_mastery': return '💰'
      case 'client_excellence': return '⭐'
      case 'efficiency_expert': return '⚡'
      case 'growth_champion': return '📈'
      case 'service_mastery': return '✂️'
      case 'brand_builder': return '🎯'
      case 'innovation_leader': return '🚀'
      case 'community_leader': return '👥'
      case 'consistency_king': return '🔥'
      case 'premium_positioning': return '💎'
      default: return '🏆'
    }
  }

  if (!isVisible || !celebrationData) {
    return null
  }

  const rarityConfig = getRarityConfig(celebrationData.rarity)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        {/* Fireworks Effect for Epic/Legendary */}
        {showFireworks && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: rarityConfig.particles }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                initial={{
                  opacity: 1,
                  scale: 0,
                  x: window.innerWidth / 2,
                  y: window.innerHeight / 2
                }}
                animate={{
                  opacity: [1, 1, 0],
                  scale: [0, 1, 0],
                  x: window.innerWidth / 2 + (Math.random() - 0.5) * 800,
                  y: window.innerHeight / 2 + (Math.random() - 0.5) * 600
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 0.5,
                  ease: "easeOut"
                }}
              />
            ))}
          </div>
        )}

        {/* Main Achievement Card */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 10 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
            duration: rarityConfig.animationDuration
          }}
          className="relative max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glow Effect */}
          <div className={`absolute inset-0 rounded-xl blur-xl ${rarityConfig.glowColor} opacity-75`} />
          
          <Card className={`relative bg-gradient-to-br ${rarityConfig.bgGradient} border-2 ${
            celebrationData.badge_design?.border_color ? '' : 'border-yellow-300'
          } shadow-2xl`}>
            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 z-10"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>

            <CardContent className="p-8 text-center space-y-6">
              {/* Achievement Icon with Animation */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.2
                }}
                className="relative flex items-center justify-center"
              >
                <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-6xl">
                    {celebrationData.icon || getCategoryIcon(celebrationData.category)}
                  </span>
                </div>
                
                {/* Sparkle Animation */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-2 -right-2"
                >
                  <Sparkles className="w-8 h-8 text-yellow-500" />
                </motion.div>
              </motion.div>

              {/* Achievement Title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <h2 className={`text-2xl font-bold ${rarityConfig.textColor}`}>
                  Achievement Unlocked!
                </h2>
                <h3 className={`text-xl font-semibold ${rarityConfig.textColor}`}>
                  {celebrationData.achievement_name}
                </h3>
              </motion.div>

              {/* Achievement Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className={`text-sm ${rarityConfig.textColor} opacity-80`}
              >
                {celebrationData.achievement_description}
              </motion.p>

              {/* Rarity Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
                className="flex justify-center"
              >
                <Badge 
                  className={`px-4 py-2 text-sm font-bold uppercase tracking-wider ${
                    celebrationData.rarity === 'legendary' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' :
                    celebrationData.rarity === 'epic' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' :
                    celebrationData.rarity === 'rare' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' :
                    celebrationData.rarity === 'uncommon' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                    'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                  }`}
                >
                  {celebrationData.rarity} Achievement
                </Badge>
              </motion.div>

              {/* XP Reward */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 }}
                className="flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5 text-purple-600" />
                <span className="text-lg font-bold text-purple-600">
                  +{celebrationData.xp_earned} XP
                </span>
              </motion.div>

              {/* Level Up Notification */}
              {celebrationData.level_up_occurred && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2 }}
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-3 rounded-lg"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Crown className="w-5 h-5" />
                    <span className="font-bold">Level Up!</span>
                  </div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                className="flex gap-3 justify-center pt-4"
              >
                {onShare && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onShare}
                    className="flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                )}
                
                <Button
                  onClick={onClose}
                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
                >
                  Awesome!
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Achievement Notification Toast Component
interface AchievementToastProps {
  isVisible: boolean
  achievementName: string
  icon?: string
  rarity: string
  onClose: () => void
}

export function AchievementToast({ 
  isVisible, 
  achievementName, 
  icon, 
  rarity, 
  onClose 
}: AchievementToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose()
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose])

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'border-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50'
      case 'epic': return 'border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50'
      case 'rare': return 'border-blue-500 bg-gradient-to-r from-blue-50 to-cyan-50'
      case 'uncommon': return 'border-green-500 bg-gradient-to-r from-green-50 to-emerald-50'
      default: return 'border-gray-500 bg-gradient-to-r from-gray-50 to-gray-100'
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className="fixed top-4 right-4 z-50"
        >
          <Card className={`border-2 ${getRarityColor(rarity)} shadow-lg max-w-sm`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center">
                  <span className="text-xl">{icon || '🏆'}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Achievement Unlocked!</p>
                  <p className="text-sm text-gray-600">{achievementName}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="w-6 h-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Hook for managing achievement celebrations
export function useAchievementCelebration() {
  const [celebrationData, setCelebrationData] = useState<CelebrationData | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [toastQueue, setToastQueue] = useState<Array<{
    id: string
    name: string
    icon?: string
    rarity: string
  }>>([])

  const showCelebration = (data: CelebrationData) => {
    setCelebrationData(data)
    setIsVisible(true)
  }

  const showToast = (achievementName: string, icon?: string, rarity: string = 'common') => {
    const id = Date.now().toString()
    setToastQueue(prev => [...prev, { id, name: achievementName, icon, rarity }])
  }

  const closeCelebration = () => {
    setIsVisible(false)
    setTimeout(() => {
      setCelebrationData(null)
    }, 300)
  }

  const closeToast = (id: string) => {
    setToastQueue(prev => prev.filter(toast => toast.id !== id))
  }

  return {
    celebrationData,
    isVisible,
    toastQueue,
    showCelebration,
    showToast,
    closeCelebration,
    closeToast
  }
}