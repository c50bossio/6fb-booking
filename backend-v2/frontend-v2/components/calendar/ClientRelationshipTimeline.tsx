'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ClockIcon,
  CalendarDaysIcon,
  HeartIcon,
  StarIcon,
  ExclamationTriangleIcon,
  UserPlusIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

interface Appointment {
  id: number
  client_name: string
  client_id?: number
  service_name: string
  service_price: number
  start_time: string
  client_tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
  customer_type?: 'new' | 'returning' | 'vip' | 'at_risk'
  status: string
}

interface RelationshipEvent {
  id: string
  client_id: number
  client_name: string
  event_type: 'first_visit' | 'milestone_visit' | 'tier_upgrade' | 'extended_absence' | 'high_value_service' | 'referral_opportunity'
  event_date: string
  event_description: string
  six_fb_insight: string
  relationship_impact: 'positive' | 'neutral' | 'concerning'
  follow_up_action?: string
  priority: 'high' | 'medium' | 'low'
}

interface ClientRelationshipTimelineProps {
  appointments: Appointment[]
  currentDate: Date
  view: 'day' | 'week' | 'month'
  onFollowUpAction?: (event: RelationshipEvent) => void
  className?: string
}

export default function ClientRelationshipTimeline({
  appointments = [],
  currentDate,
  view,
  onFollowUpAction,
  className = ""
}: ClientRelationshipTimelineProps) {
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('all')

  // Generate relationship timeline events based on Six Figure Barber methodology
  const relationshipEvents = useMemo(() => {
    const events: RelationshipEvent[] = []
    const clientVisitHistory = new Map()
    
    // Sort appointments by date
    const sortedAppointments = [...appointments].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )

    sortedAppointments.forEach((apt, index) => {
      const clientKey = apt.client_name
      const appointmentDate = new Date(apt.start_time)
      
      if (!clientVisitHistory.has(clientKey)) {
        clientVisitHistory.set(clientKey, {
          visits: [],
          total_spent: 0,
          first_visit: apt.start_time,
          last_visit: apt.start_time,
          client_tier: apt.client_tier || 'bronze',
          customer_type: apt.customer_type || 'new'
        })
      }
      
      const clientHistory = clientVisitHistory.get(clientKey)
      clientHistory.visits.push(apt)
      clientHistory.total_spent += apt.service_price || 0
      clientHistory.last_visit = apt.start_time

      // First visit event
      if (clientHistory.visits.length === 1 && apt.customer_type === 'new') {
        events.push({
          id: `first-${apt.client_id || index}-${apt.start_time}`,
          client_id: apt.client_id || 0,
          client_name: apt.client_name,
          event_type: 'first_visit',
          event_date: apt.start_time,
          event_description: `${apt.client_name}'s first visit - building the foundation`,
          six_fb_insight: "First impressions are everything. Exceptional first visits create clients for life who become brand ambassadors.",
          relationship_impact: 'positive',
          follow_up_action: "Send welcome message, collect preferences, schedule next appointment",
          priority: 'high'
        })
      }

      // Milestone visit events (every 5th visit)
      if (clientHistory.visits.length > 1 && clientHistory.visits.length % 5 === 0) {
        events.push({
          id: `milestone-${apt.client_id || index}-${apt.start_time}`,
          client_id: apt.client_id || 0,
          client_name: apt.client_name,
          event_type: 'milestone_visit',
          event_date: apt.start_time,
          event_description: `${apt.client_name}'s ${clientHistory.visits.length}th visit milestone`,
          six_fb_insight: "Milestone celebrations strengthen loyalty and demonstrate that you value their business.",
          relationship_impact: 'positive',
          follow_up_action: "Acknowledge milestone, offer loyalty reward, ask for referral",
          priority: 'medium'
        })
      }

      // High-value service event
      if ((apt.service_price || 0) >= 120) {
        events.push({
          id: `high-value-${apt.client_id || index}-${apt.start_time}`,
          client_id: apt.client_id || 0,
          client_name: apt.client_name,
          event_type: 'high_value_service',
          event_date: apt.start_time,
          event_description: `${apt.client_name} invested in premium ${apt.service_name} ($${apt.service_price})`,
          six_fb_insight: "High-value clients appreciate premium experiences and are more likely to refer similar clients.",
          relationship_impact: 'positive',
          follow_up_action: "Provide exceptional service, follow up personally, nurture VIP relationship",
          priority: 'high'
        })
      }

      // Tier upgrade opportunity
      if (clientHistory.total_spent >= 300 && apt.client_tier === 'silver') {
        events.push({
          id: `tier-upgrade-${apt.client_id || index}-${apt.start_time}`,
          client_id: apt.client_id || 0,
          client_name: apt.client_name,
          event_type: 'tier_upgrade',
          event_date: apt.start_time,
          event_description: `${apt.client_name} qualifies for Gold tier ($${clientHistory.total_spent} invested)`,
          six_fb_insight: "Tier upgrades recognize loyalty and encourage continued investment in premium services.",
          relationship_impact: 'positive',
          follow_up_action: "Offer tier upgrade, explain benefits, provide exclusive access",
          priority: 'medium'
        })
      }
    })

    // Check for extended absences (at-risk clients)
    const today = new Date()
    clientVisitHistory.forEach((history, clientName) => {
      const daysSinceLastVisit = Math.floor(
        (today.getTime() - new Date(history.last_visit).getTime()) / (1000 * 60 * 60 * 24)
      )
      
      if (daysSinceLastVisit > 60 && history.visits.length > 1) {
        events.push({
          id: `absence-${clientName}-${history.last_visit}`,
          client_id: history.visits[0].client_id || 0,
          client_name: clientName,
          event_type: 'extended_absence',
          event_date: history.last_visit,
          event_description: `${clientName} hasn't visited in ${daysSinceLastVisit} days`,
          six_fb_insight: "Proactive re-engagement prevents client loss and shows you care about their experience.",
          relationship_impact: 'concerning',
          follow_up_action: "Personal outreach, special offer, feedback request, re-engagement campaign",
          priority: 'high'
        })
      }
    })

    // Sort events by date (most recent first)
    return events.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
  }, [appointments])

  // Filter events for current view
  const filteredEvents = useMemo(() => {
    const viewStart = new Date(currentDate)
    const viewEnd = new Date(currentDate)

    // Adjust date range based on view
    if (view === 'week') {
      viewStart.setDate(currentDate.getDate() - currentDate.getDay())
      viewEnd.setDate(viewStart.getDate() + 6)
    } else if (view === 'month') {
      viewStart.setDate(1)
      viewEnd.setMonth(viewEnd.getMonth() + 1, 0)
    }

    let filtered = relationshipEvents.filter(event => {
      const eventDate = new Date(event.event_date)
      return eventDate >= viewStart && eventDate <= viewEnd
    })

    // Apply client filter
    if (selectedClientFilter !== 'all') {
      filtered = filtered.filter(event => event.client_name === selectedClientFilter)
    }

    return filtered
  }, [relationshipEvents, currentDate, view, selectedClientFilter])

  // Get unique client names for filter
  const uniqueClients = useMemo(() => {
    const clients = new Set(relationshipEvents.map(event => event.client_name))
    return Array.from(clients).sort()
  }, [relationshipEvents])

  // Handle follow-up action
  const handleFollowUpAction = (event: RelationshipEvent) => {
    if (onFollowUpAction) {
      onFollowUpAction(event)
    }
  }

  // Get event icon
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'first_visit': return <UserPlusIcon className="w-4 h-4" />
      case 'milestone_visit': return <StarIcon className="w-4 h-4" />
      case 'tier_upgrade': return <ArrowRightIcon className="w-4 h-4" />
      case 'extended_absence': return <ExclamationTriangleIcon className="w-4 h-4" />
      case 'high_value_service': return <HeartIcon className="w-4 h-4" />
      default: return <CalendarDaysIcon className="w-4 h-4" />
    }
  }

  // Get impact color
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return 'text-green-600 bg-green-50 border-green-200'
      case 'concerning': return 'text-red-600 bg-red-50 border-red-200'
      case 'neutral': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // Format date
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const diffTime = today.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  return (
    <Card className={`client-relationship-timeline ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClockIcon className="w-5 h-5 text-purple-600" />
            Relationship Timeline
            <Badge variant="outline" className="text-xs ml-2">
              {filteredEvents.length} events
            </Badge>
          </CardTitle>
          
          {/* Client Filter */}
          {uniqueClients.length > 1 && (
            <select
              value={selectedClientFilter}
              onChange={(e) => setSelectedClientFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value="all">All Clients</option>
              {uniqueClients.map(client => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredEvents.length === 0 ? (
          <Alert>
            <CalendarDaysIcon className="w-4 h-4" />
            <AlertDescription className="text-sm">
              No relationship events for this {view}. Every client interaction is an opportunity to strengthen relationships.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {filteredEvents.map((event) => (
              <div 
                key={event.id}
                className={`p-4 rounded-lg border ${getImpactColor(event.relationship_impact)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getEventIcon(event.event_type)}
                    <div>
                      <h4 className="font-medium text-sm">
                        {event.event_description}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatEventDate(event.event_date)}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={event.priority === 'high' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {event.priority}
                  </Badge>
                </div>
                
                <Alert className="border-purple-200 bg-purple-50 mb-3">
                  <StarIcon className="w-4 h-4" />
                  <AlertDescription className="text-xs text-purple-800">
                    <strong>6FB Insight:</strong> {event.six_fb_insight}
                  </AlertDescription>
                </Alert>
                
                {event.follow_up_action && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-700 font-medium mb-2">
                      <strong>Recommended Action:</strong> {event.follow_up_action}
                    </p>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getImpactColor(event.relationship_impact).split(' ')[0]} ${getImpactColor(event.relationship_impact).split(' ')[2]}`}
                  >
                    {event.relationship_impact === 'positive' ? '📈' : event.relationship_impact === 'concerning' ? '⚠️' : '➡️'} 
                    {event.relationship_impact}
                  </Badge>
                  
                  {event.follow_up_action && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleFollowUpAction(event)}
                      className="text-xs h-7"
                    >
                      Schedule Follow-up
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Six Figure Barber Methodology Reminder */}
        <Alert className="border-purple-200 bg-purple-50 mt-4">
          <HeartIcon className="w-4 h-4" />
          <AlertDescription className="text-xs text-purple-800">
            <strong>6FB Relationship Strategy:</strong> Every interaction builds lifetime value. Track milestones, celebrate loyalty, address concerns proactively.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
