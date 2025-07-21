'use client'

import React, { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AvailabilityCalendar } from '@/components/availability/AvailabilityCalendar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeftIcon, CalendarDaysIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { availabilityAPI } from '@/lib/api/availability'
import { useToast } from '@/components/ui/use-toast'
import { format } from 'date-fns'

export default function AvailabilityPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [timeOffData, setTimeOffData] = useState({
    reason: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  // Debug: Show user data for testing
  console.log('User data:', user)
  
  // Check if user has access to availability management
  // Allowed roles: BARBER, SHOP_OWNER, ENTERPRISE_OWNER, admin roles
  const hasAvailabilityAccess = user?.role === 'barber' || 
                                user?.role === 'admin' || 
                                user?.role === 'super_admin' ||
                                user?.unified_role === 'BARBER' || 
                                user?.unified_role === 'SHOP_OWNER' ||
                                user?.unified_role === 'ENTERPRISE_OWNER' ||
                                user?.unified_role === 'SUPER_ADMIN'

  if (!hasAvailabilityAccess) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <Alert>
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            This page is only available for barbers and business owners. Please contact support if you believe this is an error.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const handleTimeOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || !user?.id) return

    try {
      setLoading(true)
      await availabilityAPI.createBarberTimeOff(user.id, {
        start_date: format(selectedDate, 'yyyy-MM-dd'),
        end_date: format(selectedDate, 'yyyy-MM-dd'),
        reason: timeOffData.reason,
        notes: timeOffData.notes
      })

      toast({
        title: 'Success',
        description: 'Time off request created successfully'
      })

      // Reset form
      setSelectedDate(undefined)
      setTimeOffData({ reason: '', notes: '' })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create time off request',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Availability Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your working hours and time off
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="schedule" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schedule">
            <CalendarDaysIcon className="w-4 h-4 mr-2" />
            Weekly Schedule
          </TabsTrigger>
          <TabsTrigger value="timeoff">
            <ClockIcon className="w-4 h-4 mr-2" />
            Time Off
          </TabsTrigger>
          <TabsTrigger value="special">
            <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
            Special Hours
          </TabsTrigger>
        </TabsList>

        {/* Weekly Schedule Tab */}
        <TabsContent value="schedule" className="mt-6">
          {user?.id && <AvailabilityCalendar barberId={user.id} />}
        </TabsContent>

        {/* Time Off Tab */}
        <TabsContent value="timeoff" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Request Time Off</CardTitle>
                <CardDescription>
                  Block out days when you won't be available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTimeOffSubmit} className="space-y-4">
                  <div>
                    <Label>Select Date</Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-md border mt-2"
                      disabled={(date) => date < new Date()}
                    />
                  </div>

                  {selectedDate && (
                    <>
                      <div>
                        <Label htmlFor="reason">Reason</Label>
                        <Input
                          id="reason"
                          value={timeOffData.reason}
                          onChange={(e) => setTimeOffData(prev => ({ 
                            ...prev, 
                            reason: e.target.value 
                          }))}
                          placeholder="e.g., Vacation, Personal Day"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                          id="notes"
                          value={timeOffData.notes}
                          onChange={(e) => setTimeOffData(prev => ({ 
                            ...prev, 
                            notes: e.target.value 
                          }))}
                          placeholder="Additional information..."
                          rows={3}
                        />
                      </div>

                      <Button type="submit" disabled={loading}>
                        {loading ? 'Submitting...' : 'Submit Request'}
                      </Button>
                    </>
                  )}
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Time Off</CardTitle>
                <CardDescription>
                  Your scheduled time off
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No upcoming time off scheduled
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Special Hours Tab */}
        <TabsContent value="special" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Special Hours</CardTitle>
              <CardDescription>
                Set different hours for specific dates (holidays, events, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                Special hours feature coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}