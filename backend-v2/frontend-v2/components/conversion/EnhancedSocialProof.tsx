'use client'

import React from 'react'
import { StarIcon, UserIcon } from '@heroicons/react/24/solid'
import { CheckCircleIcon, UsersIcon, TrophyIcon } from '@heroicons/react/24/outline'

export interface Testimonial {
  id: string
  name: string
  role: string
  business?: string
  rating: number
  quote: string
  image?: string
  location: string
}

export interface BusinessStat {
  id: string
  value: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

export interface EnhancedSocialProofProps {
  variant?: 'combined' | 'testimonials_focus' | 'stats_focus'
  children?: React.ReactNode
  testimonials?: Testimonial[]
  stats?: BusinessStat[]
}

// Default testimonials data
const defaultTestimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Marcus Johnson',
    role: 'Master Barber',
    business: 'Elite Cuts Barbershop',
    rating: 5,
    quote: 'BookedBarber transformed my business completely. I went from struggling to book clients to having a 3-week waiting list. The automated reminders alone saved me 10 hours per week.',
    location: 'Atlanta, GA'
  },
  {
    id: '2',
    name: 'Sarah Williams', 
    role: 'Regular Client',
    rating: 5,
    quote: 'Finally, a booking system that actually works! I can schedule my appointments anytime, get reminders, and even reschedule if needed. So much better than calling the shop.',
    location: 'Miami, FL'
  },
  {
    id: '3',
    name: 'David Rodriguez',
    role: 'Shop Owner',
    business: 'The Cutting Edge',
    rating: 5,
    quote: 'We increased our revenue by 40% in the first 6 months. The analytics showed us our peak times, and the online booking brought in customers we never would have reached.',
    location: 'Los Angeles, CA'
  },
  {
    id: '4',
    name: 'Jennifer Thompson',
    role: 'Licensed Barber',
    rating: 5,
    quote: 'The payment processing is seamless, and I love getting paid instantly after each cut. My clients appreciate the professional experience from booking to payment.',
    location: 'Chicago, IL'
  },
  {
    id: '5',
    name: 'Mike Chen',
    role: 'Business Owner',
    business: 'Urban Fade Co.',
    rating: 5,
    quote: 'Managing multiple barbers was a nightmare before BookedBarber. Now everything is organized, payments are automated, and my team focuses on what they do best - cutting hair.',
    location: 'New York, NY'
  },
  {
    id: '6',
    name: 'Ashley Davis',
    role: 'Loyal Customer',
    rating: 5,
    quote: 'I travel for work constantly, and BookedBarber helps me find great barbers wherever I am. The reviews and booking system give me confidence I\'ll get a quality cut.',
    location: 'Denver, CO'
  }
]

// Default business stats
const defaultStats: BusinessStat[] = [
  {
    id: '1',
    value: '500+',
    label: 'Barbers Served',
    icon: UsersIcon,
    color: 'text-blue-600'
  },
  {
    id: '2', 
    value: '95%',
    label: 'Customer Satisfaction',
    icon: TrophyIcon,
    color: 'text-green-600'
  },
  {
    id: '3',
    value: '50k+',
    label: 'Appointments Booked',
    icon: CheckCircleIcon,
    color: 'text-purple-600'
  }
]

export function EnhancedSocialProof({ 
  variant = 'combined', 
  children, 
  testimonials = defaultTestimonials, 
  stats = defaultStats 
}: EnhancedSocialProofProps) {
  
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon 
        key={i} 
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
      />
    ))
  }

  const renderTestimonialCard = (testimonial: Testimonial) => (
    <div key={testimonial.id} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          {testimonial.image ? (
            <img 
              src={testimonial.image} 
              alt={testimonial.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <div className="flex space-x-1">
              {renderStars(testimonial.rating)}
            </div>
          </div>
          <blockquote className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-4">
            "{testimonial.quote}"
          </blockquote>
          <div className="text-sm">
            <div className="font-semibold text-slate-900 dark:text-slate-100">{testimonial.name}</div>
            <div className="text-slate-600 dark:text-slate-400">
              {testimonial.role}{testimonial.business && ` • ${testimonial.business}`}
            </div>
            <div className="text-slate-500 dark:text-slate-500 text-xs mt-1">{testimonial.location}</div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      {stats.map((stat) => {
        const IconComponent = stat.icon
        return (
          <div key={stat.id} className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/20 shadow-lg mb-4">
              <IconComponent className={`w-8 h-8 ${stat.color}`} />
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">{stat.value}</div>
            <div className="text-slate-600 dark:text-slate-400 font-medium">{stat.label}</div>
          </div>
        )
      })}
    </div>
  )

  if (variant === 'stats_focus') {
    return (
      <section className="w-full py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Trusted by Professionals Nationwide
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Join thousands of barbers and satisfied clients who've transformed their booking experience
            </p>
          </div>
          {renderStats()}
          {children}
        </div>
      </section>
    )
  }

  if (variant === 'testimonials_focus') {
    return (
      <section className="w-full py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              What Our Community Says
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Real stories from barbers and clients who've experienced the BookedBarber difference
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.slice(0, 6).map(renderTestimonialCard)}
          </div>
          {children}
        </div>
      </section>
    )
  }

  // Combined variant (default)
  return (
    <section className="w-full py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Trusted by Professionals Nationwide
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Join thousands of barbers and satisfied clients who've transformed their booking experience
          </p>
        </div>
        
        {renderStats()}
        
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            What Our Community Says
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.slice(0, 6).map(renderTestimonialCard)}
        </div>
        
        {children}
      </div>
    </section>
  )
}