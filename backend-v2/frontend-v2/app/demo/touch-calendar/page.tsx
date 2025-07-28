'use client'

import React, { useState } from 'react'
import { TouchOptimizedCalendar } from '@/components/TouchOptimizedCalendar'
import { TouchInteractionDemo } from '@/components/TouchInteractionDemo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Smartphone, 
  Calendar,
  Zap,
  TestTube,
  BookOpen,
  Settings
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Mock appointment data for the demo
const mockAppointments = [
  {
    id: 1,
    client_name: 'John Smith',
    service_name: 'Haircut & Styling',
    start_time: '2024-01-15T10:00:00',
    barber_id: 1,
    status: 'confirmed'
  },
  {
    id: 2,
    client_name: 'Sarah Johnson',
    service_name: 'Beard Trim',
    start_time: '2024-01-15T14:30:00',
    barber_id: 1,
    status: 'confirmed'
  },
  {
    id: 3,
    client_name: 'Mike Wilson',
    service_name: 'Full Service',
    start_time: '2024-01-16T09:00:00',
    barber_id: 1,
    status: 'pending'
  },
  {
    id: 4,
    client_name: 'Emma Davis',
    service_name: 'Hair Wash',
    start_time: '2024-01-16T11:00:00',
    barber_id: 2,
    status: 'confirmed'
  },
  {
    id: 5,
    client_name: 'Chris Brown',
    service_name: 'Styling',
    start_time: '2024-01-17T15:00:00',
    barber_id: 1,
    status: 'confirmed'
  }
]

const mockBarbers = [
  { id: 1, name: 'Alex Thompson', specialties: ['Haircuts', 'Styling'] },
  { id: 2, name: 'Jordan Martinez', specialties: ['Beard Trim', 'Full Service'] }
]

export default function TouchCalendarDemo() {
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState(mockAppointments)
  const [showInstructions, setShowInstructions] = useState(true)
  const { toast } = useToast()

  const handleAppointmentClick = (appointment: any) => {
    toast({
      title: 'Appointment Selected',
      description: `Opening details for ${appointment.client_name}`,
      duration: 2000
    })
  }

  const handleTimeSlotClick = (date: Date, barberId?: number) => {
    const barber = barberId ? mockBarbers.find(b => b.id === barberId) : null
    toast({
      title: 'New Appointment',
      description: `Creating appointment for ${date.toLocaleString()}${barber ? ` with ${barber.name}` : ''}`,
      duration: 3000
    })
  }

  const handleAppointmentUpdate = (appointmentId: number, newStartTime: string, isDragDrop?: boolean) => {
    setAppointments(prev => 
      prev.map(apt => 
        apt.id === appointmentId 
          ? { ...apt, start_time: newStartTime }
          : apt
      )
    )
    
    toast({
      title: 'Appointment Rescheduled',
      description: `Appointment moved to ${new Date(newStartTime).toLocaleString()}`,
      duration: 2000
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Smartphone className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Touch-Optimized Calendar Demo</CardTitle>
                  <p className="text-gray-600 mt-1">
                    Interactive mobile calendar with advanced touch gestures and haptic feedback
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Phase 2 Complete
                </Badge>
                <Switch 
                  checked={showInstructions} 
                  onCheckedChange={setShowInstructions}
                  id="instructions-toggle"
                />
                <label htmlFor="instructions-toggle" className="text-sm font-medium">
                  Show Instructions
                </label>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Instructions Panel */}
      {showInstructions && (
        <div className="max-w-6xl mx-auto mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                How to Use This Demo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Swipe Navigation:</strong> Swipe left/right to change dates, up/down to change views
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Tap to Select:</strong> Single tap appointments or time slots to select them
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Double Tap:</strong> Double tap time slots to create new appointments
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Long Press:</strong> Hold appointments for 600ms to see context options
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Drag & Drop:</strong> Drag appointments to new time slots to reschedule
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Haptic Feedback:</strong> Feel different vibration patterns for each interaction
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Demo Content */}
      <div className="max-w-6xl mx-auto">
        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Touch Calendar
            </TabsTrigger>
            <TabsTrigger value="interactions" className="flex items-center gap-2">
              <TestTube className="w-4 h-4" />
              Interaction Demo
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings & Info
            </TabsTrigger>
          </TabsList>

          {/* Touch-Optimized Calendar Tab */}
          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  TouchOptimizedCalendar Component
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Production-ready calendar with mobile-first touch interactions, haptic feedback, and performance optimizations.
                </p>
              </CardHeader>
              <CardContent>
                <TouchOptimizedCalendar
                  view={currentView}
                  onViewChange={setCurrentView}
                  currentDate={currentDate}
                  onDateChange={setCurrentDate}
                  appointments={appointments}
                  barbers={mockBarbers}
                  startHour={8}
                  endHour={19}
                  slotDuration={30}
                  onAppointmentClick={handleAppointmentClick}
                  onTimeSlotClick={handleTimeSlotClick}
                  onAppointmentUpdate={handleAppointmentUpdate}
                  className="touch-calendar-demo"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Interaction Demo Tab */}
          <TabsContent value="interactions">
            <TouchInteractionDemo />
          </TabsContent>

          {/* Settings & Info Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Feature Implementation Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-green-700">✅ Completed Features</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">Phase 1</Badge>
                          <span>Enhanced Offline Booking Capabilities</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">Phase 2</Badge>
                          <span>Touch-Optimized Calendar Enhancement</span>
                        </div>
                        <ul className="ml-8 space-y-1 text-xs text-gray-600">
                          <li>• Advanced touch gesture recognition</li>
                          <li>• Swipe navigation (dates, views)</li>
                          <li>• Drag-and-drop appointment rescheduling</li>
                          <li>• Haptic feedback system (17+ patterns)</li>
                          <li>• Performance optimization for mobile</li>
                          <li>• Large touch targets (44px minimum)</li>
                          <li>• Visual feedback and animations</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-semibold text-blue-700">🔮 Future Enhancements</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-blue-200 text-blue-700">Phase 3</Badge>
                          <span>Advanced Sync & Conflict Resolution</span>
                        </div>
                        <ul className="ml-8 space-y-1 text-xs text-gray-600">
                          <li>• Real-time appointment synchronization</li>
                          <li>• Intelligent conflict detection</li>
                          <li>• Multi-device state management</li>
                          <li>• Background sync capabilities</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Technical Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-2">Touch Gestures</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Swipe (4 directions)</li>
                      <li>• Single & Double Tap</li>
                      <li>• Long Press (600ms)</li>
                      <li>• Drag & Drop</li>
                      <li>• Pinch to Zoom</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Haptic Patterns</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Navigation feedback</li>
                      <li>• Selection confirmation</li>
                      <li>• Drag state indicators</li>
                      <li>• Success/error patterns</li>
                      <li>• Contextual intensities</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Performance</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Virtual scrolling</li>
                      <li>• Lazy loading</li>
                      <li>• Memory management</li>
                      <li>• Adaptive rendering</li>
                      <li>• Touch optimization</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Browser Compatibility</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-green-700">iOS Safari</div>
                    <div className="text-xs text-gray-600">Full Support</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-green-700">Chrome Mobile</div>
                    <div className="text-xs text-gray-600">Full Support</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-green-700">Firefox Mobile</div>
                    <div className="text-xs text-gray-600">Full Support</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-yellow-700">Desktop</div>
                    <div className="text-xs text-gray-600">Partial (no haptics)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Custom Styles */}
      <style jsx global>{`
        .touch-calendar-demo {
          max-width: 100%;
          overflow-x: auto;
        }
        
        /* Enhanced touch targets for demo */
        .touch-calendar-demo .touch-time-slot {
          min-height: 64px;
        }
        
        .touch-calendar-demo .touch-appointment {
          min-height: 48px;
        }
        
        /* Demo-specific styling */
        @media (max-width: 768px) {
          .touch-calendar-demo .touch-time-slot {
            min-height: 72px;
            padding: 16px;
          }
          
          .touch-calendar-demo .touch-appointment {
            min-height: 56px;
            padding: 16px;
          }
        }
      `}</style>
    </div>
  )
}