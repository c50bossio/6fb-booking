/**
 * Consolidated metric explanations for all dashboard tooltips
 * Centralizes all metric descriptions and help text in one location
 */

export interface MetricExplanation {
  explanation: string
  details?: string
}

export const MetricExplanations: Record<string, MetricExplanation> = {
  // Today's metrics
  todaysBookings: {
    explanation: "Number of appointments scheduled for today",
    details: "Includes confirmed bookings across all barbers and locations"
  },
  
  todaysRevenue: {
    explanation: "Total revenue generated from today's completed appointments",
    details: "Real-time calculation based on completed services and payments"
  },

  // Weekly metrics
  weeklyBookings: {
    explanation: "Total appointments this week (Monday-Sunday)",
    details: "Includes all confirmed and completed bookings for the current week"
  },

  weeklyRevenue: {
    explanation: "Total revenue this week from completed appointments",
    details: "Calculated from finalized payments for services rendered this week"
  },

  // Monthly metrics
  monthlyProgress: {
    explanation: "Progress toward monthly revenue goal",
    details: "Track your path to six-figure income with monthly revenue targets"
  },

  monthlyRevenue: {
    explanation: "Total revenue for the current month",
    details: "Sum of all completed appointments and services for this calendar month"
  },

  // Client metrics
  totalClients: {
    explanation: "Total number of unique clients",
    details: "All clients who have ever booked appointments with your business"
  },

  activeClients: {
    explanation: "Clients who have visited in the last 90 days",
    details: "Building a strong client base is essential for predictable six-figure income"
  },

  newClients: {
    explanation: "New clients acquired this month",
    details: "First-time customers who booked their initial appointment this month"
  },

  clientRetention: {
    explanation: "Percentage of clients who return for additional appointments",
    details: "Retention rate calculated over the last 6 months of booking data"
  },

  // Financial metrics
  averageTicket: {
    explanation: "Average revenue per appointment",
    details: "Higher average tickets through upselling and premium services drive six-figure success"
  },

  totalRevenue: {
    explanation: "All-time revenue generated",
    details: "Total revenue from all completed appointments since account creation"
  },

  // Performance metrics
  bookingRate: {
    explanation: "Percentage of available appointment slots that are booked",
    details: "Optimal booking rate (80-90%) maximizes revenue while maintaining service quality"
  },

  // Legacy alias for backward compatibility
  utilizationRate: {
    explanation: "Percentage of available appointment slots that are booked",
    details: "Optimal booking rate (80-90%) maximizes revenue while maintaining service quality"
  },

  conversionRate: {
    explanation: "Percentage of inquiries that become booked appointments",
    details: "Measures effectiveness of booking process and client communication"
  },

  // Six Figure Barber specific metrics
  sixFigureProgress: {
    explanation: "Annual progress toward six-figure income goal",
    details: "Track your journey using proven Six Figure Barber methodology"
  },

  // Appointment metrics
  pendingAppointments: {
    explanation: "Appointments awaiting confirmation",
    details: "Bookings that require approval or have pending payment"
  },

  upcomingAppointments: {
    explanation: "Confirmed appointments in the next 7 days",
    details: "Your upcoming schedule of confirmed client appointments"
  },

  // Business analytics
  peakHours: {
    explanation: "Your busiest time periods",
    details: "Optimize staffing and pricing based on demand patterns"
  },

  topServices: {
    explanation: "Most frequently booked services",
    details: "Focus marketing and upselling efforts on popular services"
  },

  // Growth metrics
  growthRate: {
    explanation: "Month-over-month business growth percentage",
    details: "Measures business expansion and progress toward income goals"
  },

  bookingTrends: {
    explanation: "Appointment booking patterns over time",
    details: "Identify seasonal trends and growth opportunities"
  }
}

/**
 * Get explanation for a specific metric
 */
export function getMetricExplanation(metricKey: string): MetricExplanation | null {
  return MetricExplanations[metricKey] || null
}

/**
 * Get all available metric keys
 */
export function getAvailableMetrics(): string[] {
  return Object.keys(MetricExplanations)
}