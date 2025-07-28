'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { 
  Trophy, 
  Star, 
  Target,
  TrendingUp,
  Award,
  Zap,
  Crown,
  Medal,
  Flame,
  Gift,
  Users,
  Calendar,
  DollarSign,
  BarChart
} from 'lucide-react'

interface Achievement {
  achievement_id: number
  name: string
  title: string
  description: string
  category: string
  rarity: string
  current_progress: number
  target_progress: number
  progress_percentage: number
  is_unlocked: boolean
  unlocked_at?: string
  xp_reward: number
  icon?: string
  badge_design?: {
    background_color: string
    border_color: string
    icon_color: string
  }
}

interface XPProfile {
  total_xp: number
  current_level: number
  xp_in_current_level: number
  xp_needed_for_next_level: number
  level_progress_percentage: number
  daily_xp_earned: number
  weekly_xp_earned: number
  monthly_xp_earned: number
  global_rank?: number
  regional_rank?: number
  tier_rank?: number
}

interface XPTransaction {
  id: number
  xp_amount: number
  xp_source: string
  source_description: string
  multiplier_applied: number
  bonus_reason?: string
  caused_level_up: boolean
  transaction_date: string
}

interface LeaderboardEntry {
  user_id: number
  user_name: string
  current_position: number
  position_change: number
  current_score: number
  score_change: number
  percentile_rank: number
  is_current_user?: boolean
}

interface GamificationStats {
  total_achievements_unlocked: number
  total_achievements_available: number
  achievement_completion_rate: number
  current_level: number
  total_xp: number
  challenges_completed: number
  leaderboard_positions: Record<string, number>
  recent_achievements: Achievement[]
  recent_xp_transactions: XPTransaction[]
}

export function GamificationDashboard() {
  const [stats, setStats] = useState<GamificationStats | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [xpProfile, setXPProfile] = useState<XPProfile | null>(null)
  const [xpTransactions, setXPTransactions] = useState<XPTransaction[]>([])
  const [leaderboards, setLeaderboards] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGamificationData()
  }, [])

  const loadGamificationData = async () => {
    try {
      setLoading(true)
      
      // Load all gamification data in parallel
      const [statsRes, achievementsRes, xpRes, transactionsRes, leaderboardsRes] = await Promise.all([
        fetch('/api/v2/gamification/stats'),
        fetch('/api/v2/gamification/achievements'),
        fetch('/api/v2/gamification/xp/profile'),
        fetch('/api/v2/gamification/xp/transactions?limit=20'),
        fetch('/api/v2/gamification/leaderboards')
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (achievementsRes.ok) {
        const achievementsData = await achievementsRes.json()
        setAchievements(achievementsData)
      }

      if (xpRes.ok) {
        const xpData = await xpRes.json()
        setXPProfile(xpData)
      }

      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json()
        setXPTransactions(transactionsData)
      }

      if (leaderboardsRes.ok) {
        const leaderboardsData = await leaderboardsRes.json()
        setLeaderboards(leaderboardsData)
      }

    } catch (error) {
      console.error('Error loading gamification data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'uncommon': return 'bg-green-100 text-green-800 border-green-300'
      case 'rare': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'epic': return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'legendary': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'revenue_mastery': return <DollarSign className="w-4 h-4" />
      case 'client_excellence': return <Users className="w-4 h-4" />
      case 'efficiency_expert': return <Zap className="w-4 h-4" />
      case 'growth_champion': return <TrendingUp className="w-4 h-4" />
      case 'service_mastery': return <Star className="w-4 h-4" />
      case 'brand_builder': return <Award className="w-4 h-4" />
      case 'innovation_leader': return <Target className="w-4 h-4" />
      case 'community_leader': return <Users className="w-4 h-4" />
      case 'consistency_king': return <Calendar className="w-4 h-4" />
      case 'premium_positioning': return <Crown className="w-4 h-4" />
      default: return <Trophy className="w-4 h-4" />
    }
  }

  const getXPSourceIcon = (source: string) => {
    switch (source) {
      case 'appointment_completion': return <Calendar className="w-4 h-4" />
      case 'revenue_milestone': return <DollarSign className="w-4 h-4" />
      case 'achievement_unlock': return <Trophy className="w-4 h-4" />
      case 'client_satisfaction': return <Star className="w-4 h-4" />
      case 'tier_advancement': return <Crown className="w-4 h-4" />
      case 'streak_maintenance': return <Flame className="w-4 h-4" />
      default: return <Zap className="w-4 h-4" />
    }
  }

  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory)

  const categories = [
    { value: 'all', label: 'All Categories', icon: <Trophy className="w-4 h-4" /> },
    { value: 'revenue_mastery', label: 'Revenue Mastery', icon: <DollarSign className="w-4 h-4" /> },
    { value: 'client_excellence', label: 'Client Excellence', icon: <Users className="w-4 h-4" /> },
    { value: 'efficiency_expert', label: 'Efficiency Expert', icon: <Zap className="w-4 h-4" /> },
    { value: 'growth_champion', label: 'Growth Champion', icon: <TrendingUp className="w-4 h-4" /> },
    { value: 'service_mastery', label: 'Service Mastery', icon: <Star className="w-4 h-4" /> },
    { value: 'premium_positioning', label: 'Premium Positioning', icon: <Crown className="w-4 h-4" /> }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Level</p>
                  <p className="text-2xl font-bold text-teal-600">{stats.current_level}</p>
                </div>
                <Crown className="w-8 h-8 text-teal-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total XP</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.total_xp.toLocaleString()}</p>
                </div>
                <Zap className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Achievements</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.total_achievements_unlocked}/{stats.total_achievements_available}
                  </p>
                </div>
                <Trophy className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.achievement_completion_rate.toFixed(1)}%
                  </p>
                </div>
                <Target className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* XP Profile Card */}
      {xpProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Experience Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">Level {xpProfile.current_level}</p>
                  <p className="text-sm text-gray-600">
                    {xpProfile.xp_in_current_level} / {xpProfile.xp_needed_for_next_level} XP
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Progress to Level {xpProfile.current_level + 1}</p>
                  <p className="text-lg font-semibold text-purple-600">
                    {xpProfile.level_progress_percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
              
              <Progress value={xpProfile.level_progress_percentage} className="h-3" />
              
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">{xpProfile.daily_xp_earned}</p>
                  <p className="text-xs text-gray-600">Today</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-600">{xpProfile.weekly_xp_earned}</p>
                  <p className="text-xs text-gray-600">This Week</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-purple-600">{xpProfile.monthly_xp_earned}</p>
                  <p className="text-xs text-gray-600">This Month</p>
                </div>
              </div>

              {xpProfile.global_rank && (
                <div className="flex justify-center pt-2">
                  <Badge variant="outline" className="text-teal-600 border-teal-300">
                    <Medal className="w-3 h-3 mr-1" />
                    Global Rank #{xpProfile.global_rank}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="achievements" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="leaderboards">Leaderboards</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
        </TabsList>

        <TabsContent value="achievements" className="space-y-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.value}
                variant={selectedCategory === category.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.value)}
                className="flex items-center gap-1"
              >
                {category.icon}
                {category.label}
              </Button>
            ))}
          </div>

          {/* Achievements Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAchievements.map((achievement) => (
              <Card 
                key={achievement.achievement_id} 
                className={`transition-all duration-200 hover:shadow-lg ${
                  achievement.is_unlocked 
                    ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200' 
                    : 'hover:border-gray-300'
                }`}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Achievement Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(achievement.category)}
                        <span className="text-lg">{achievement.icon || '🏆'}</span>
                      </div>
                      <Badge className={getRarityColor(achievement.rarity)}>
                        {achievement.rarity}
                      </Badge>
                    </div>

                    {/* Achievement Info */}
                    <div>
                      <h3 className="font-semibold text-gray-900">{achievement.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{achievement.description}</p>
                    </div>

                    {/* Progress */}
                    {!achievement.is_unlocked && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">
                            {achievement.progress_percentage.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={achievement.progress_percentage} className="h-2" />
                        <div className="text-xs text-gray-500">
                          {achievement.current_progress} / {achievement.target_progress}
                        </div>
                      </div>
                    )}

                    {/* Unlock Status */}
                    {achievement.is_unlocked ? (
                      <div className="flex items-center justify-between">
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          <Trophy className="w-3 h-3 mr-1" />
                          Unlocked
                        </Badge>
                        <span className="text-sm font-medium text-yellow-600">
                          +{achievement.xp_reward} XP
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">
                          In Progress
                        </Badge>
                        <span className="text-sm text-gray-500">
                          Reward: {achievement.xp_reward} XP
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboards" className="space-y-4">
          {leaderboards.map((leaderboard) => (
            <Card key={leaderboard.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-blue-600" />
                  {leaderboard.title}
                </CardTitle>
                {leaderboard.description && (
                  <p className="text-sm text-gray-600">{leaderboard.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboard.entries.slice(0, 10).map((entry: LeaderboardEntry, index: number) => (
                    <div 
                      key={entry.user_id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        entry.is_current_user 
                          ? 'bg-teal-50 border border-teal-200' 
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-orange-500 text-white' :
                          'bg-gray-200 text-gray-700'
                        }`}>
                          {entry.current_position}
                        </div>
                        <div>
                          <p className="font-medium">{entry.user_name}</p>
                          <p className="text-sm text-gray-600">
                            Score: {entry.current_score.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {entry.position_change !== 0 && (
                        <Badge 
                          variant="outline" 
                          className={
                            entry.position_change > 0 
                              ? 'text-red-600 border-red-300' 
                              : 'text-green-600 border-green-300'
                          }
                        >
                          {entry.position_change > 0 ? '↓' : '↑'} {Math.abs(entry.position_change)}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
                
                {leaderboard.user_position && leaderboard.user_position > 10 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-teal-50 border border-teal-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold">
                          {leaderboard.user_position}
                        </div>
                        <div>
                          <p className="font-medium">Your Position</p>
                          <p className="text-sm text-gray-600">
                            Score: {leaderboard.user_score?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                Recent XP Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {xpTransactions.map((transaction) => (
                  <div 
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      {getXPSourceIcon(transaction.xp_source)}
                      <div>
                        <p className="font-medium">{transaction.source_description}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(transaction.transaction_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-bold text-purple-600">+{transaction.xp_amount} XP</p>
                      {transaction.multiplier_applied > 1 && (
                        <p className="text-xs text-green-600">
                          {transaction.multiplier_applied}x multiplier
                        </p>
                      )}
                      {transaction.caused_level_up && (
                        <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                          Level Up!
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          {stats?.recent_achievements && stats.recent_achievements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  Recent Achievement Unlocks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.recent_achievements.map((achievement) => (
                    <div 
                      key={achievement.achievement_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{achievement.icon || '🏆'}</span>
                        <div>
                          <p className="font-medium">{achievement.title}</p>
                          <p className="text-sm text-gray-600">
                            {achievement.unlocked_at && new Date(achievement.unlocked_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge className={getRarityColor(achievement.rarity)}>
                          {achievement.rarity}
                        </Badge>
                        <p className="text-sm font-medium text-yellow-600 mt-1">
                          +{achievement.xp_reward} XP
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="challenges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-600" />
                Active Challenges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No active challenges at the moment.</p>
                <p className="text-sm">Check back soon for new challenges!</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}