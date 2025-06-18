/**
 * Training API service
 */
import apiClient from './client'
import type { TrainingModule } from './client'

interface Enrollment {
  id: number
  user_id: number
  module_id: number
  status: string
  progress_percentage: number
  attempts: number
  best_score: number
  enrolled_at: string
  completed_at?: string
}

interface TrainingAttempt {
  id: number
  enrollment_id: number
  attempt_number: number
  score: number
  passed: boolean
  started_at: string
  completed_at?: string
  time_taken?: number
}

interface Certification {
  id: number
  name: string
  level: string
  description: string
  required_score_average: number
  required_experience_months: number
  validity_period: number
  commission_bonus: number
  mentor_eligibility: boolean
  is_active: boolean
}

interface UserCertification {
  id: number
  certification_id: number
  certification_name: string
  certification_level: string
  earned_date: string
  expiry_date?: string
  final_score: number
  status: string
}

interface SkillAssessment {
  user_id: number
  assessment_type: string
  skill_category: string
  technical_skill: number
  customer_interaction: number
  business_acumen: number
  sixfb_methodology: number
  strengths: string
  areas_for_improvement: string
  recommendations: string
  follow_up_required?: boolean
  location_id?: number
}

interface TrainingProgress {
  user_info: Record<string, any>
  overall_progress: Record<string, any>
  module_progress: Array<Record<string, any>>
  certifications: Array<Record<string, any>>
  skill_assessments: Array<Record<string, any>>
}

interface TrainingPath {
  path_id: number
  name: string
  description: string
  target_certification: string
  estimated_completion_time: number
  modules: Array<{
    module_id: number
    title: string
    estimated_duration: number
    status: string
    progress: number
  }>
  overall_progress: number
}

export const trainingService = {
  /**
   * Get available training modules
   */
  async getModules(category?: string, difficulty?: string): Promise<TrainingModule[]> {
    const params = new URLSearchParams()
    if (category) params.append('category', category)
    if (difficulty) params.append('difficulty', difficulty)

    const response = await apiClient.get<TrainingModule[]>(`/training/modules?${params.toString()}`)
    return response.data
  },

  /**
   * Enroll in a module
   */
  async enrollInModule(moduleId: number): Promise<Enrollment> {
    const response = await apiClient.post<Enrollment>(`/training/modules/${moduleId}/enroll`)
    return response.data
  },

  /**
   * Start module attempt
   */
  async startAttempt(moduleId: number): Promise<TrainingAttempt> {
    const response = await apiClient.post<TrainingAttempt>(`/training/modules/${moduleId}/start-attempt`)
    return response.data
  },

  /**
   * Complete module attempt
   */
  async completeAttempt(attemptId: number, answers: Record<string, any>): Promise<TrainingAttempt> {
    const response = await apiClient.post<TrainingAttempt>(
      `/training/attempts/${attemptId}/complete`,
      { answers }
    )
    return response.data
  },

  /**
   * Get all certifications
   */
  async getCertifications(): Promise<Certification[]> {
    const response = await apiClient.get<Certification[]>('/training/certifications')
    return response.data
  },

  /**
   * Get user's certifications
   */
  async getMyCertifications(): Promise<UserCertification[]> {
    const response = await apiClient.get<UserCertification[]>('/training/my-certifications')
    return response.data
  },

  /**
   * Get user training progress
   */
  async getUserProgress(userId: number): Promise<TrainingProgress> {
    const response = await apiClient.get<TrainingProgress>(`/training/progress/${userId}`)
    return response.data
  },

  /**
   * Create skill assessment
   */
  async createSkillAssessment(assessment: SkillAssessment): Promise<{
    id: number
    user_id: number
    overall_score: number
    assessment_date: string
  }> {
    const response = await apiClient.post('/training/skill-assessment', assessment)
    return response.data
  },

  /**
   * Get recommended training path
   */
  async getRecommendedPath(): Promise<TrainingPath | { message: string }> {
    const response = await apiClient.get('/training/recommended-path')
    return response.data
  },

  /**
   * Get mentor training overview
   */
  async getMentorOverview(): Promise<{
    mentees: Array<{
      user_id: number
      name: string
      location: string
      certification_level?: string
      modules_completed: number
      modules_in_progress: number
      last_activity?: string
    }>
    total_mentees: number
  }> {
    const response = await apiClient.get('/training/mentor-overview')
    return response.data
  },
}