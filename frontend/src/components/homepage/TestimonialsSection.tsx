'use client'

import { StarIcon } from '@heroicons/react/24/outline'

// TypeScript interfaces for data structures
interface Testimonial {
  name: string
  title: string
  quote: string
  rating: number
}

interface Metric {
  value: string
  label: string
  gradientColors: string
}

// Testimonials data extracted from page-complex.tsx
const testimonials: Testimonial[] = [
  {
    name: 'Marcus Johnson',
    title: 'Master Barber, Atlanta',
    quote: 'The automated payouts changed my life. I focus on cutting hair while Booked Barber handles my money. My income went up 40% in 6 months.',
    rating: 5,
  },
  {
    name: 'Sarah Mitchell',
    title: 'Shop Owner, Denver',
    quote: 'Managing 8 barbers was chaos. Now payment splits are automatic, everyone gets paid on time, and I have analytics showing exactly where we stand.',
    rating: 5,
  },
  {
    name: 'David Rodriguez',
    title: 'Celebrity Barber, Los Angeles',
    quote: 'The VIP pricing and peak hour rates are genius. I charge more for premium slots automatically. Best investment I\'ve made in my career.',
    rating: 5,
  },
]

// Success metrics data
const metrics: Metric[] = [
  {
    value: '$2.5M+',
    label: 'Paid Out Monthly',
    gradientColors: 'from-teal-500 to-teal-600',
  },
  {
    value: '45K+',
    label: 'Appointments Tracked',
    gradientColors: 'from-slate-400 to-slate-500',
  },
  {
    value: '98%',
    label: 'On-Time Payouts',
    gradientColors: 'from-teal-500 to-teal-600',
  },
  {
    value: '30 sec',
    label: 'Instant Transfers',
    gradientColors: 'from-slate-400 to-slate-500',
  },
]

// Reusable TestimonialCard component
interface TestimonialCardProps {
  testimonial: Testimonial
}

function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <div className="bg-white p-8 hover-lift group border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl">
      {/* Star Rating */}
      <div className="flex items-center mb-6">
        {[...Array(testimonial.rating)].map((_, i) => (
          <StarIcon key={i} className="h-5 w-5 text-yellow-400 fill-current" />
        ))}
      </div>

      {/* Quote */}
      <blockquote className="text-slate-900 mb-6 text-lg leading-relaxed font-medium">
        "{testimonial.quote}"
      </blockquote>

      {/* Author */}
      <div className="flex items-center">
        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
          {testimonial.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <div className="font-semibold text-slate-900">{testimonial.name}</div>
          <div className="text-slate-700 text-sm font-semibold">{testimonial.title}</div>
        </div>
      </div>
    </div>
  )
}

// Reusable MetricCard component
interface MetricCardProps {
  metric: Metric
}

function MetricCard({ metric }: MetricCardProps) {
  return (
    <div className="text-center bg-white p-6 hover-lift border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl">
      <div className="text-4xl font-bold mb-2 text-slate-900">{metric.value}</div>
      <div className="font-medium text-slate-700">{metric.label}</div>
      <div className={`mt-3 w-10 h-1 bg-gradient-to-r ${metric.gradientColors} rounded-full mx-auto`}></div>
    </div>
  )
}

// Main TestimonialsSection component
export default function TestimonialsSection() {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-semibold px-6 py-3 rounded-full mb-6 transition-all duration-300 hover:bg-white/15">
            <span className="mr-2">⭐</span> Trusted Nationwide
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Join 1,200+ Successful Barbers
          </h2>
          <p className="text-xl text-white max-w-3xl mx-auto leading-relaxed">
            See why top barbers across the country trust Booked Barber to manage their business and earnings.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} />
          ))}
        </div>

        {/* Success Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {metrics.map((metric, index) => (
            <MetricCard key={index} metric={metric} />
          ))}
        </div>
      </div>
    </section>
  )
}
