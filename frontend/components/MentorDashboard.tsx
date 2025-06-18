'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  Users, 
  TrendingUp, 
  Target, 
  BookOpen, 
  Award, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  MessageSquare,
  Star,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'

interface Mentee {
  id: number
  name: string
  email: string
  location: string
  certification_level: string
  sixfb_score: number
  score_trend: 'up' | 'down' | 'stable'
  appointments_this_week: number
  revenue_this_month: number
  last_checkin: string
  goals_progress: number
  areas_needing_attention: string[]
}

interface TrainingProgress {
  module_name: string
  progress: number
  status: 'completed' | 'in_progress' | 'not_started'
  score?: number
  due_date?: string
}

interface Goal {
  id: number
  mentee_name: string
  description: string
  target_value: number
  current_value: number
  target_date: string
  status: 'on_track' | 'at_risk' | 'behind'
  category: string
}

interface Assessment {
  id: number
  mentee_name: string
  assessment_date: string
  overall_score: number
  strengths: string[]
  areas_for_improvement: string[]
  next_steps: string[]
  follow_up_date: string
}

export default function MentorDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [mentees, setMentees] = useState<Mentee[]>([])
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Mock data - replace with actual API calls
      const mockMentees: Mentee[] = [
        {
          id: 1,
          name: 'Mike Johnson',
          email: 'mike@6fb.com',
          location: 'Downtown Location',
          certification_level: 'silver',
          sixfb_score: 87.5,
          score_trend: 'up',
          appointments_this_week: 24,
          revenue_this_month: 4200,
          last_checkin: '2024-06-16',
          goals_progress: 75,
          areas_needing_attention: ['client_retention', 'upselling']
        },
        {
          id: 2,
          name: 'Sarah Williams',
          email: 'sarah@6fb.com',
          location: 'Downtown Location',
          certification_level: 'bronze',
          sixfb_score: 72.3,
          score_trend: 'down',
          appointments_this_week: 18,
          revenue_this_month: 3100,
          last_checkin: '2024-06-14',
          goals_progress: 45,
          areas_needing_attention: ['booking_efficiency', 'service_quality']
        },
        {
          id: 3,
          name: 'David Chen',
          email: 'david@6fb.com',
          location: 'Downtown Location',
          certification_level: 'gold',
          sixfb_score: 94.1,
          score_trend: 'stable',
          appointments_this_week: 28,
          revenue_this_month: 5800,
          last_checkin: '2024-06-17',
          goals_progress: 92,
          areas_needing_attention: []
        }
      ]

      const mockTrainingProgress: TrainingProgress[] = [
        {
          module_name: '6FB Methodology Foundation',
          progress: 100,
          status: 'completed',
          score: 91
        },
        {
          module_name: 'Advanced Client Retention',
          progress: 60,
          status: 'in_progress',
          due_date: '2024-06-25'
        },
        {
          module_name: 'Revenue Optimization',
          progress: 0,
          status: 'not_started',
          due_date: '2024-07-10'
        }
      ]

      const mockGoals: Goal[] = [
        {
          id: 1,
          mentee_name: 'Mike Johnson',
          description: 'Increase client retention rate to 85%',
          target_value: 85,
          current_value: 78,
          target_date: '2024-07-01',
          status: 'on_track',
          category: 'retention'
        },
        {
          id: 2,
          mentee_name: 'Sarah Williams',
          description: 'Achieve 6FB score of 80+',
          target_value: 80,
          current_value: 72.3,
          target_date: '2024-08-01',
          status: 'at_risk',
          category: 'performance'
        },
        {
          id: 3,
          mentee_name: 'David Chen',
          description: 'Complete Gold certification requirements',
          target_value: 100,
          current_value: 90,
          target_date: '2024-06-30',
          status: 'on_track',
          category: 'certification'
        }
      ]

      const mockAssessments: Assessment[] = [
        {
          id: 1,
          mentee_name: 'Mike Johnson',
          assessment_date: '2024-06-15',
          overall_score: 87,
          strengths: ['Technical skills', 'Customer interaction'],
          areas_for_improvement: ['Time management', 'Product sales'],
          next_steps: ['Practice product recommendations', 'Implement time-blocking'],
          follow_up_date: '2024-06-29'
        },
        {
          id: 2,
          mentee_name: 'Sarah Williams',
          assessment_date: '2024-06-12',
          overall_score: 72,
          strengths: ['Reliability', 'Learning attitude'],
          areas_for_improvement: ['Booking efficiency', 'Client follow-up'],
          next_steps: ['Optimize schedule', 'Implement follow-up system'],
          follow_up_date: '2024-06-26'
        }
      ]

      setMentees(mockMentees)
      setTrainingProgress(mockTrainingProgress)
      setGoals(mockGoals)
      setAssessments(mockAssessments)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleScheduleCheckin = (menteeId: number) => {
    console.log('Schedule check-in for mentee:', menteeId)
  }

  const handleCreateGoal = () => {
    console.log('Create new goal clicked')
  }

  const handleConductAssessment = (menteeId: number) => {
    console.log('Conduct assessment for mentee:', menteeId)
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="w-4 h-4 text-green-500" />
      case 'down':
        return <ArrowDown className="w-4 h-4 text-red-500" />
      default:
        return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  const getGoalStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'text-green-600 bg-green-100'
      case 'at_risk':
        return 'text-yellow-600 bg-yellow-100'
      case 'behind':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Loading mentor dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Mentor Dashboard</h1>
                <p className="text-gray-600">6FB Mentorship & Team Development</p>
              </div>
              <div className="flex space-x-3">
                <Button variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Message Team
                </Button>
                <Button onClick={handleCreateGoal}>
                  <Target className="w-4 h-4 mr-2" />
                  Set Goal
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="mentees">
              <Users className="w-4 h-4 mr-2" />
              Mentees
            </TabsTrigger>
            <TabsTrigger value="goals">
              <Target className="w-4 h-4 mr-2" />
              Goals
            </TabsTrigger>
            <TabsTrigger value="training">
              <BookOpen className="w-4 h-4 mr-2" />
              Training
            </TabsTrigger>
            <TabsTrigger value="assessments">
              <Star className="w-4 h-4 mr-2" />
              Assessments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Mentees</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mentees.length}</div>
                  <p className="text-xs text-muted-foreground">Active mentorship relationships</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Team Score</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(mentees.reduce((sum, m) => sum + m.sixfb_score, 0) / mentees.length).toFixed(1)}
                  </div>
                  <p className="text-xs text-muted-foreground">6FB score average</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{goals.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {goals.filter(g => g.status === 'on_track').length} on track
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Certifications</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {mentees.filter(m => m.certification_level !== 'none').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Certified team members</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Team Performance Trends</CardTitle>
                  <CardDescription>6FB score trends for your mentees</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mentees.map((mentee) => (
                      <div key={mentee.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1">
                            {getTrendIcon(mentee.score_trend)}
                            <span className="font-medium">{mentee.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">{mentee.sixfb_score}</span>
                          <Badge variant={mentee.certification_level === 'gold' ? 'default' : 'secondary'}>
                            {mentee.certification_level}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Attention Required</CardTitle>
                  <CardDescription>Mentees needing immediate support</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mentees
                      .filter(mentee => mentee.areas_needing_attention.length > 0 || mentee.sixfb_score < 75)
                      .map((mentee) => (
                        <div key={mentee.id} className="flex items-start justify-between p-3 bg-yellow-50 rounded-lg">
                          <div>
                            <div className="flex items-center space-x-2">
                              <AlertCircle className="w-4 h-4 text-yellow-600" />
                              <span className="font-medium">{mentee.name}</span>
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                              {mentee.areas_needing_attention.join(', ') || 'Low performance score'}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleScheduleCheckin(mentee.id)}>
                            Check-in
                          </Button>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="mentees" className="space-y-6">
            <h2 className="text-2xl font-bold">Mentee Management</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {mentees.map((mentee) => (
                <Card key={mentee.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{mentee.name}</CardTitle>
                        <CardDescription>{mentee.location}</CardDescription>
                      </div>
                      <div className="flex items-center space-x-1">
                        {getTrendIcon(mentee.score_trend)}
                        <span className="text-lg font-bold">{mentee.sixfb_score}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Certification:</span>
                        <Badge variant={mentee.certification_level === 'gold' ? 'default' : 'secondary'}>
                          {mentee.certification_level}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">This Week:</span>
                        <span>{mentee.appointments_this_week} appointments</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Revenue:</span>
                        <span className="font-medium">${mentee.revenue_this_month.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Goals Progress:</span>
                        <span>{mentee.goals_progress}%</span>
                      </div>
                      <Progress value={mentee.goals_progress} className="h-2" />
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Last Check-in:</span>
                        <span>{mentee.last_checkin}</span>
                      </div>
                      {mentee.areas_needing_attention.length > 0 && (
                        <div className="bg-yellow-50 p-2 rounded text-sm">
                          <span className="font-medium text-yellow-800">Focus Areas: </span>
                          <span className="text-yellow-700">
                            {mentee.areas_needing_attention.join(', ')}
                          </span>
                        </div>
                      )}
                      <div className="flex space-x-2 mt-4">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleScheduleCheckin(mentee.id)}
                        >
                          <Calendar className="w-4 h-4 mr-1" />
                          Check-in
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleConductAssessment(mentee.id)}
                        >
                          <Star className="w-4 h-4 mr-1" />
                          Assess
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Goal Management</h2>
              <Button onClick={handleCreateGoal}>
                <Target className="w-4 h-4 mr-2" />
                Create Goal
              </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {goals.map((goal) => (
                <Card key={goal.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{goal.description}</CardTitle>
                        <CardDescription>{goal.mentee_name}</CardDescription>
                      </div>
                      <Badge className={getGoalStatusColor(goal.status)}>
                        {goal.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Progress:</span>
                        <span className="font-medium">
                          {goal.current_value} / {goal.target_value}
                          {goal.category === 'retention' && '%'}
                        </span>
                      </div>
                      <Progress 
                        value={(goal.current_value / goal.target_value) * 100} 
                        className="h-2" 
                      />
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Target Date:</span>
                        <span>{goal.target_date}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Category:</span>
                        <Badge variant="outline">{goal.category}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="training" className="space-y-6">
            <h2 className="text-2xl font-bold">Training Progress</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {trainingProgress.map((module, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{module.module_name}</CardTitle>
                        <CardDescription>
                          {module.status === 'completed' && `Score: ${module.score}`}
                          {module.status === 'in_progress' && `Due: ${module.due_date}`}
                          {module.status === 'not_started' && `Due: ${module.due_date}`}
                        </CardDescription>
                      </div>
                      <Badge 
                        variant={
                          module.status === 'completed' ? 'default' :
                          module.status === 'in_progress' ? 'secondary' : 'outline'
                        }
                      >
                        {module.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {module.status === 'in_progress' && <Clock className="w-3 h-3 mr-1" />}
                        {module.status === 'not_started' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {module.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Progress:</span>
                        <span className="font-medium">{module.progress}%</span>
                      </div>
                      <Progress value={module.progress} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="assessments" className="space-y-6">
            <h2 className="text-2xl font-bold">Skill Assessments</h2>
            
            <div className="space-y-6">
              {assessments.map((assessment) => (
                <Card key={assessment.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{assessment.mentee_name}</CardTitle>
                        <CardDescription>
                          Assessment Date: {assessment.assessment_date}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{assessment.overall_score}</div>
                        <div className="text-sm text-gray-500">Overall Score</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div>
                        <h4 className="font-medium text-green-700 mb-2">Strengths</h4>
                        <ul className="space-y-1 text-sm">
                          {assessment.strengths.map((strength, idx) => (
                            <li key={idx} className="flex items-center space-x-2">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-yellow-700 mb-2">Areas for Improvement</h4>
                        <ul className="space-y-1 text-sm">
                          {assessment.areas_for_improvement.map((area, idx) => (
                            <li key={idx} className="flex items-center space-x-2">
                              <AlertCircle className="w-3 h-3 text-yellow-500" />
                              <span>{area}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-blue-700 mb-2">Next Steps</h4>
                        <ul className="space-y-1 text-sm">
                          {assessment.next_steps.map((step, idx) => (
                            <li key={idx} className="flex items-center space-x-2">
                              <Target className="w-3 h-3 text-blue-500" />
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          Follow-up scheduled: {assessment.follow_up_date}
                        </span>
                        <Button variant="outline" size="sm">
                          <Calendar className="w-4 h-4 mr-2" />
                          Schedule Follow-up
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}