'use client'

import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import '../styles/six-figure-barber-theme.css'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  Calendar, 
  Users, 
  Star,
  Trophy,
  Target,
  Flame,
  Crown
} from 'lucide-react'

interface BarberTierData {
  id: number
  name: string
  email: string
  currentTier: {
    name: string
    rate: number
    emoji: string
    color: string
  }
  metrics: {
    utilizationRate: number
    avgLeadTimeDays: number
    demandVelocity: number
    clientSatisfaction: number
    tierScore: number
  }
  nextTier?: {
    name: string
    emoji: string
    requiredScore: number
  }
  progressToNext: number
  achievements: string[]
  streakWeeks: number
  isNewTierUnlocked?: boolean
}

interface GamifiedBarberProfileProps {
  barber: BarberTierData
  showDetailed?: boolean
  onBooking?: () => void
}

export function GamifiedBarberProfile({ 
  barber, 
  showDetailed = false,
  onBooking 
}: GamifiedBarberProfileProps) {
  
  const getTierColor = (tierName: string) => {
    switch (tierName.toLowerCase()) {
      case 'standard': return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'popular': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'premium': return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'elite': return 'bg-gold-100 text-yellow-800 border-yellow-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-gradient-to-r from-purple-500 to-pink-500'
    if (progress >= 75) return 'bg-gradient-to-r from-blue-500 to-purple-500'
    if (progress >= 50) return 'bg-gradient-to-r from-green-500 to-blue-500'
    return 'bg-gradient-to-r from-gray-400 to-green-500'
  }

  return (
    <Card className={`sfb-card-premium sfb-tier-${barber.currentTier.name.toLowerCase()} ${
      barber.isNewTierUnlocked ? 'sfb-pulse-teal sfb-achievement-glow' : ''
    }`}>
      {barber.isNewTierUnlocked && (
        <div className="text-center py-2 text-sm font-bold text-white rounded-t-lg" style={{ background: 'var(--sfb-gradient-teal)' }}>
          🎉 TIER UP! New rate unlocked! 🎉
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--sfb-gradient-teal)' }}>
              <span className="text-white font-bold text-lg">
                {barber.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            
            {/* Name and Tier */}
            <div>
              <h3 className="sfb-heading-secondary font-bold text-lg">{barber.name}</h3>
              <div className="flex items-center gap-2">
                <Badge className="sfb-badge-teal font-medium">
                  {barber.currentTier.emoji} {barber.currentTier.name} Tier
                </Badge>
                {barber.streakWeeks > 0 && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    <Flame className="w-3 h-3 mr-1" />
                    {barber.streakWeeks}w streak
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Rate Display */}
          <div className="text-right sm:text-right">
            <div className="text-2xl font-bold" style={{ color: 'var(--sfb-teal)' }}>
              ${barber.currentTier.rate}
            </div>
            <div className="text-sm sfb-text-premium">per service</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tier Progress */}
        {barber.nextTier && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Progress to {barber.nextTier.name} {barber.nextTier.emoji}
              </span>
              <span className="text-sm font-bold text-purple-600">
                {barber.progressToNext.toFixed(1)}%
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={barber.progressToNext} 
                className="h-3"
              />
              <div 
                className={`absolute top-0 left-0 h-3 rounded-full transition-all duration-500 ${getProgressColor(barber.progressToNext)}`}
                style={{ width: `${barber.progressToNext}%` }}
              />
            </div>
            <div className="text-xs text-gray-500">
              Score: {barber.metrics.tierScore}/100 (Need {barber.nextTier.requiredScore})
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Utilization</span>
            </div>
            <div className="text-lg font-bold text-blue-800">
              {(barber.metrics.utilizationRate * 100).toFixed(0)}%
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Lead Time</span>
            </div>
            <div className="text-lg font-bold text-purple-800">
              {barber.metrics.avgLeadTimeDays.toFixed(1)} days
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Demand</span>
            </div>
            <div className="text-lg font-bold text-green-800">
              {barber.metrics.demandVelocity.toFixed(1)}/week
            </div>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900">Rating</span>
            </div>
            <div className="text-lg font-bold text-yellow-800">
              {barber.metrics.clientSatisfaction.toFixed(1)}/5
            </div>
          </div>
        </div>

        {/* Achievement Badges */}
        {barber.achievements.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              Recent Achievements
            </div>
            <div className="flex flex-wrap gap-1">
              {barber.achievements.slice(0, 3).map((achievement, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  🏆 {achievement}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Metrics (Optional) */}
        {showDetailed && (
          <div className="pt-3 border-t space-y-2">
            <div className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Target className="w-4 h-4" />
              Performance Breakdown
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Utilization Score:</span>
                <span className="font-medium">{(barber.metrics.utilizationRate * 100).toFixed(0)}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Lead Time Score:</span>
                <span className="font-medium">{Math.round(barber.metrics.avgLeadTimeDays * 4)}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Demand Score:</span>
                <span className="font-medium">{Math.round(barber.metrics.demandVelocity * 5)}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rating Score:</span>
                <span className="font-medium">{Math.round(barber.metrics.clientSatisfaction * 20)}/100</span>
              </div>
            </div>
          </div>
        )}

        {/* Booking Button */}
        <button
          onClick={onBooking}
          className="sfb-button-premium w-full py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
        >
          Book Appointment - ${barber.currentTier.rate}
          {barber.currentTier.name === 'Elite' && <Crown className="w-4 h-4" />}
        </button>

        {/* Tier Justification */}
        <div className="text-xs text-center sfb-text-premium">
          {barber.currentTier.name} rate earned through {(barber.metrics.utilizationRate * 100).toFixed(0)}% utilization 
          and {barber.metrics.avgLeadTimeDays.toFixed(1)}-day average lead time
        </div>
      </CardContent>
    </Card>
  )
}

// Demo barber data for testing
export const demoBarberData: BarberTierData[] = [
  {
    id: 1,
    name: 'Marcus Johnson',
    email: 'marcus@bookedbarber.com',
    currentTier: {
      name: 'Premium',
      rate: 65,
      emoji: '🏆',
      color: 'purple'
    },
    metrics: {
      utilizationRate: 0.87,
      avgLeadTimeDays: 14.5,
      demandVelocity: 15.2,
      clientSatisfaction: 4.8,
      tierScore: 78.5
    },
    nextTier: {
      name: 'Elite',
      emoji: '💎',
      requiredScore: 86
    },
    progressToNext: 82.3,
    achievements: ['High Demand', 'Client Favorite', '500+ Services'],
    streakWeeks: 6
  },
  {
    id: 2,
    name: 'Diego Rivera',
    email: 'diego@bookedbarber.com',
    currentTier: {
      name: 'Popular',
      rate: 55,
      emoji: '⭐',
      color: 'blue'
    },
    metrics: {
      utilizationRate: 0.76,
      avgLeadTimeDays: 10.2,
      demandVelocity: 12.5,
      clientSatisfaction: 4.6,
      tierScore: 68.2
    },
    nextTier: {
      name: 'Premium',
      emoji: '🏆',
      requiredScore: 71
    },
    progressToNext: 89.1,
    achievements: ['Consistency Master', 'Rising Star'],
    streakWeeks: 3,
    isNewTierUnlocked: true
  },
  {
    id: 3,
    name: 'Aisha Thompson',
    email: 'aisha@bookedbarber.com',
    currentTier: {
      name: 'Standard',
      rate: 45,
      emoji: '🔰',
      color: 'gray'
    },
    metrics: {
      utilizationRate: 0.65,
      avgLeadTimeDays: 5.5,
      demandVelocity: 8.2,
      clientSatisfaction: 4.2,
      tierScore: 45.8
    },
    nextTier: {
      name: 'Popular',
      emoji: '⭐',
      requiredScore: 51
    },
    progressToNext: 76.4,
    achievements: ['New Talent'],
    streakWeeks: 1
  }
]