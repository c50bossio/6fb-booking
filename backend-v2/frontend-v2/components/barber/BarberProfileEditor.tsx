'use client'

import React, { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { SingleImageUpload } from '@/components/ui/ImageUpload'
import { Form, FormField, FormError, FormSuccess, FormActions } from '@/components/forms/Form'
import { cn } from '@/lib/utils'
import { 
  User, 
  MapPin, 
  Scissors, 
  Star, 
  DollarSign, 
  Clock, 
  Instagram, 
  Facebook, 
  Twitter,
  X,
  Plus
} from 'lucide-react'

// Validation schema for barber profile
const barberProfileSchema = z.object({
  bio: z.string().min(10, 'Bio must be at least 10 characters').max(500, 'Bio must be less than 500 characters').optional(),
  profileImageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
  specialties: z.array(z.string()).min(1, 'Select at least one specialty').max(10, 'Maximum 10 specialties allowed'),
  experienceLevel: z.enum(['junior', 'mid', 'senior', 'expert'], {
    required_error: 'Please select experience level'
  }),
  hourlyRate: z.number().min(0, 'Rate cannot be negative').max(1000, 'Rate seems too high').optional(),
  socialMedia: z.object({
    instagram: z.string().url('Invalid Instagram URL').optional().or(z.literal('')),
    facebook: z.string().url('Invalid Facebook URL').optional().or(z.literal('')),
    twitter: z.string().url('Invalid Twitter URL').optional().or(z.literal(''))
  }).optional()
})

type BarberProfileFormData = z.infer<typeof barberProfileSchema>

interface BarberProfile extends Omit<BarberProfileFormData, 'specialties'> {
  specialties: string[]
  id?: number
  updated_at?: string
}

interface BarberProfileEditorProps {
  initialData?: BarberProfile
  onSave?: (data: BarberProfileFormData) => Promise<void>
  loading?: boolean
  className?: string
}

// Predefined specialty options
const SPECIALTY_OPTIONS = [
  'Classic Haircuts',
  'Beard Trimming',
  'Mustache Styling',
  'Fade Cuts',
  'Scissor Cuts',
  'Razor Shaves',
  'Hair Washing',
  'Styling & Grooming',
  'Color & Highlights',
  'Hair Treatments',
  'Wedding Styling',
  'Kids Haircuts'
]

// Experience level options
const EXPERIENCE_LEVELS = [
  { value: 'junior', label: 'Junior (0-2 years)', description: 'New to the industry' },
  { value: 'mid', label: 'Mid-level (3-5 years)', description: 'Solid foundation and growing expertise' },
  { value: 'senior', label: 'Senior (6-10 years)', description: 'Experienced with advanced techniques' },
  { value: 'expert', label: 'Expert (10+ years)', description: 'Master craftsman with specialized skills' }
]

export const BarberProfileEditor: React.FC<BarberProfileEditorProps> = ({
  initialData,
  onSave,
  loading = false,
  className
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [newSpecialty, setNewSpecialty] = useState('')

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset
  } = useForm<BarberProfileFormData>({
    resolver: zodResolver(barberProfileSchema),
    defaultValues: {
      bio: initialData?.bio || '',
      profileImageUrl: initialData?.profileImageUrl || '',
      specialties: initialData?.specialties || [],
      experienceLevel: initialData?.experienceLevel || 'junior',
      hourlyRate: initialData?.hourlyRate || 0,
      socialMedia: {
        instagram: initialData?.socialMedia?.instagram || '',
        facebook: initialData?.socialMedia?.facebook || '',
        twitter: initialData?.socialMedia?.twitter || ''
      }
    }
  })

  const watchedSpecialties = watch('specialties')

  useEffect(() => {
    if (initialData) {
      reset({
        bio: initialData.bio || '',
        profileImageUrl: initialData.profileImageUrl || '',
        specialties: initialData.specialties || [],
        experienceLevel: initialData.experienceLevel || 'junior',
        hourlyRate: initialData.hourlyRate || 0,
        socialMedia: {
          instagram: initialData.socialMedia?.instagram || '',
          facebook: initialData.socialMedia?.facebook || '',
          twitter: initialData.socialMedia?.twitter || ''
        }
      })
    }
  }, [initialData, reset])

  const onSubmit = async (data: BarberProfileFormData) => {
    setSubmitMessage(null)
    setIsSubmitting(true)

    try {
      await onSave?.(data)
      setSubmitMessage({ type: 'success', text: 'Profile updated successfully!' })
      toast({
        title: 'Success',
        description: 'Your barber profile has been updated.',
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile'
      setSubmitMessage({ type: 'error', text: errorMessage })
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const addSpecialty = (specialty: string) => {
    const current = watchedSpecialties || []
    if (!current.includes(specialty) && current.length < 10) {
      setValue('specialties', [...current, specialty], { shouldDirty: true })
    }
  }

  const removeSpecialty = (specialty: string) => {
    const current = watchedSpecialties || []
    setValue('specialties', current.filter(s => s !== specialty), { shouldDirty: true })
  }

  const addCustomSpecialty = () => {
    if (newSpecialty.trim() && !watchedSpecialties?.includes(newSpecialty.trim())) {
      addSpecialty(newSpecialty.trim())
      setNewSpecialty('')
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Barber Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form isSubmitting={isSubmitting} onSubmit={handleSubmit(onSubmit)}>
          {/* Submit messages */}
          {submitMessage && (
            <div className="mb-6">
              {submitMessage.type === 'success' ? (
                <FormSuccess message={submitMessage.text} />
              ) : (
                <FormError error={submitMessage.text} />
              )}
            </div>
          )}

          {/* Profile Image */}
          <FormField className="mb-6">
            <Label>Profile Image</Label>
            <Controller
              name="profileImageUrl"
              control={control}
              render={({ field }) => (
                <SingleImageUpload
                  value={field.value}
                  onChange={field.onChange}
                  maxSize={5}
                  acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                  quality="avatar"
                  className="max-w-sm"
                />
              )}
            />
            {errors.profileImageUrl && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {errors.profileImageUrl.message}
              </p>
            )}
          </FormField>

          {/* Bio */}
          <FormField className="mb-6">
            <Label htmlFor="bio">Professional Bio</Label>
            <Controller
              name="bio"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="bio"
                  placeholder="Tell clients about your experience, style, and what makes you unique as a barber..."
                  className="min-h-[100px] resize-y"
                  maxLength={500}
                />
              )}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.bio && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.bio.message}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                {watch('bio')?.length || 0}/500 characters
              </p>
            </div>
          </FormField>

          {/* Specialties */}
          <FormField className="mb-6">
            <Label>Specialties & Skills</Label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Select your areas of expertise (max 10)
            </p>
            
            {/* Selected specialties */}
            <div className="flex flex-wrap gap-2 mb-4">
              {watchedSpecialties?.map(specialty => (
                <Badge
                  key={specialty}
                  variant="secondary"
                  className="flex items-center gap-1 px-3 py-1"
                >
                  <Scissors className="w-3 h-3" />
                  {specialty}
                  <button
                    type="button"
                    onClick={() => removeSpecialty(specialty)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>

            {/* Available specialties */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
              {SPECIALTY_OPTIONS.filter(specialty => !watchedSpecialties?.includes(specialty)).map(specialty => (
                <Button
                  key={specialty}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addSpecialty(specialty)}
                  disabled={watchedSpecialties?.length >= 10}
                  className="justify-start text-left h-auto p-2 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1 flex-shrink-0" />
                  {specialty}
                </Button>
              ))}
            </div>

            {/* Add custom specialty */}
            <div className="flex gap-2">
              <Input
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                placeholder="Add custom specialty"
                className="text-sm"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSpecialty())}
                disabled={watchedSpecialties?.length >= 10}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomSpecialty}
                disabled={!newSpecialty.trim() || watchedSpecialties?.length >= 10}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {errors.specialties && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {errors.specialties.message}
              </p>
            )}
          </FormField>

          {/* Experience Level */}
          <FormField className="mb-6">
            <Label>Experience Level</Label>
            <Controller
              name="experienceLevel"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {EXPERIENCE_LEVELS.map(level => (
                    <div
                      key={level.value}
                      className={cn(
                        'border rounded-lg p-4 cursor-pointer transition-all',
                        'hover:border-primary-400 hover:bg-primary-50/50',
                        'dark:hover:border-primary-600 dark:hover:bg-primary-950/20',
                        field.value === level.value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                          : 'border-gray-200 dark:border-gray-700'
                      )}
                      onClick={() => field.onChange(level.value)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-4 h-4" />
                        <h4 className="font-medium">{level.label}</h4>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {level.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            />
            {errors.experienceLevel && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {errors.experienceLevel.message}
              </p>
            )}
          </FormField>

          {/* Hourly Rate */}
          <FormField className="mb-6">
            <Label htmlFor="hourlyRate">Base Hourly Rate (optional)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Controller
                name="hourlyRate"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    id="hourlyRate"
                    placeholder="0"
                    min="0"
                    max="1000"
                    step="5"
                    className="pl-10"
                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                  />
                )}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This helps clients understand your pricing range
            </p>
            {errors.hourlyRate && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {errors.hourlyRate.message}
              </p>
            )}
          </FormField>

          {/* Social Media Links */}
          <FormField className="mb-6">
            <Label>Social Media (optional)</Label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Share your professional social media profiles
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Instagram className="w-5 h-5 text-pink-500" />
                <Controller
                  name="socialMedia.instagram"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="https://instagram.com/yourhandle"
                      className="flex-1"
                    />
                  )}
                />
              </div>
              
              <div className="flex items-center gap-3">
                <Facebook className="w-5 h-5 text-blue-500" />
                <Controller
                  name="socialMedia.facebook"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="https://facebook.com/yourpage"
                      className="flex-1"
                    />
                  )}
                />
              </div>
              
              <div className="flex items-center gap-3">
                <Twitter className="w-5 h-5 text-blue-400" />
                <Controller
                  name="socialMedia.twitter"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="https://twitter.com/yourhandle"
                      className="flex-1"
                    />
                  )}
                />
              </div>
            </div>

            {(errors.socialMedia?.instagram || errors.socialMedia?.facebook || errors.socialMedia?.twitter) && (
              <div className="mt-1 space-y-1">
                {errors.socialMedia?.instagram && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Instagram: {errors.socialMedia.instagram.message}
                  </p>
                )}
                {errors.socialMedia?.facebook && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Facebook: {errors.socialMedia.facebook.message}
                  </p>
                )}
                {errors.socialMedia?.twitter && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Twitter: {errors.socialMedia.twitter.message}
                  </p>
                )}
              </div>
            )}
          </FormField>

          {/* Form Actions */}
          <FormActions align="between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isDirty ? 'You have unsaved changes' : 'All changes saved'}
            </p>
            <Button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <User className="w-4 h-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </FormActions>
        </Form>
      </CardContent>
    </Card>
  )
}

export default BarberProfileEditor