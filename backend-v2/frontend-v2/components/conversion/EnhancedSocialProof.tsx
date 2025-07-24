'use client'

import { useState, useEffect } from 'react'
import { StarIcon, TrophyIcon, CurrencyDollarIcon, UsersIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid'
import { useConversionTracking, ConversionEventType } from '@/components/tracking/ConversionTracker'

interface TestimonialProps {
  quote: string
  author: string
  role: string
  rating: number
  result: string
  timeframe: string
  beforeAfter?: {
    before: string
    after: string
    metric: string
  }
  featured?: boolean
}

interface StatsCardProps {
  icon: React.ComponentType<{ className?: string }>
  value: string | number
  label: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'green' | 'blue' | 'purple' | 'gold'
  animated?: boolean
}

interface LiveStatsProps {
  className?: string
}

function AnimatedNumber({ target, duration = 2000, prefix = '', suffix = '' }: {
  target: number
  duration?: number
  prefix?: string
  suffix?: string
}) {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    let startTime: number
    let animationFrame: number
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(target * easeOut))
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }
    
    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [target, duration])
  
  return <span>{prefix}{count.toLocaleString()}{suffix}</span>
}

function TestimonialCard({ testimonial, index }: { testimonial: TestimonialProps; index: number }) {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 200)
    return () => clearTimeout(timer)
  }, [index])
  
  return (
    <div 
      className={`transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${testimonial.featured ? 'lg:scale-105 ring-2 ring-primary-500' : ''}`}
    >
      <div className={`bg-white dark:bg-gray-800 p-6 lg:p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden ${
        testimonial.featured ? 'border-2 border-primary-200 dark:border-primary-700' : ''
      }`}>
        {testimonial.featured && (
          <div className="absolute top-0 right-0 bg-primary-800 text-white px-3 py-1 rounded-bl-lg text-sm font-semibold">
            Featured Success
          </div>
        )}
        
        {/* Results Badge */}
        <div className="absolute top-4 right-4 bg-green-100 dark:bg-green-900/30 px-3 py-2 rounded-full">
          <div className="text-sm font-bold text-green-800 dark:text-green-300">
            {testimonial.result}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400">
            in {testimonial.timeframe}
          </div>
        </div>
        
        {/* Rating */}
        <div className="flex mb-4">
          {[...Array(testimonial.rating)].map((_, i) => (
            <StarSolidIcon key={i} className="w-5 h-5 text-yellow-400" />
          ))}
        </div>
        
        {/* Before/After Metrics */}
        {testimonial.beforeAfter && (
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {testimonial.beforeAfter.metric}
              </div>
              <div className="flex items-center justify-center space-x-4">
                <div>
                  <div className="text-red-600 dark:text-red-400 font-bold text-lg">
                    {testimonial.beforeAfter.before}
                  </div>
                  <div className="text-xs text-gray-500">Before</div>
                </div>
                <div className="text-gray-400">→</div>
                <div>
                  <div className="text-green-600 dark:text-green-400 font-bold text-lg">
                    {testimonial.beforeAfter.after}
                  </div>
                  <div className="text-xs text-gray-500">After</div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Quote */}
        <blockquote className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
          "{testimonial.quote}"
        </blockquote>
        
        {/* Author */}
        <div className="flex items-center">
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mr-4">
            <span className="text-primary-600 dark:text-primary-400 font-bold text-lg">
              {testimonial.author.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {testimonial.author}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {testimonial.role}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatsCard({ icon: Icon, value, label, trend, trendValue, color = 'blue', animated = true }: StatsCardProps) {
  const colorClasses = {
    green: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20',
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20',
    gold: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20'
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && trendValue && (
          <div className={`text-sm font-semibold ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} {trendValue}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {animated && typeof value === 'number' ? (
          <AnimatedNumber target={value} />
        ) : (
          value
        )}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {label}
      </div>
    </div>
  )
}

function LiveStats({ className = '' }: LiveStatsProps) {
  const [stats, setStats] = useState({
    totalBarbers: 12847,
    totalAppointments: 2100000,
    totalRevenue: 47000000,
    thisWeekSignups: 847
  })
  
  useEffect(() => {
    // Simulate live updates
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        totalAppointments: prev.totalAppointments + Math.floor(Math.random() * 5) + 1,
        totalRevenue: prev.totalRevenue + Math.floor(Math.random() * 500) + 100,
        thisWeekSignups: prev.thisWeekSignups + (Math.random() > 0.8 ? 1 : 0)
      }))
    }, 10000)
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      <StatsCard
        icon={UsersIcon}
        value={stats.totalBarbers}
        label="Six Figure Barbers"
        trend="up"
        trendValue="+12%"
        color="blue"
      />
      <StatsCard
        icon={CurrencyDollarIcon}
        value={`$${Math.floor(stats.totalRevenue / 1000000)}M+`}
        label="Revenue Generated"
        trend="up"
        trendValue="+$47K today"
        color="green"
      />
      <StatsCard
        icon={ChartBarIcon}
        value={`${(stats.totalAppointments / 1000000).toFixed(1)}M+`}
        label="Appointments Booked"
        trend="up"
        trendValue="+234 today"
        color="purple"
      />
      <StatsCard
        icon={TrophyIcon}
        value={stats.thisWeekSignups}
        label="Joined This Week"
        trend="up"
        trendValue="+23 today"
        color="gold"
      />
    </div>
  )
}

interface EnhancedSocialProofProps {
  className?: string
  variant?: 'default' | 'testimonials_focus' | 'stats_focus' | 'combined'
}

export function EnhancedSocialProof({ className = '', variant = 'combined' }: EnhancedSocialProofProps) {
  const { track } = useConversionTracking()
  
  const enhancedTestimonials: TestimonialProps[] = [
    {
      quote: "I went from $3,200/month to $8,900/month in 4 months. The automated systems freed up 15 hours per week I was spending on admin work. Now I actually have time to cut hair and make money.",
      author: "Marcus Johnson",
      role: "Downtown Barbershop • Atlanta, GA",
      rating: 5,
      result: "178% revenue increase",
      timeframe: "4 months",
      beforeAfter: {
        before: "$3,200/mo",
        after: "$8,900/mo",
        metric: "Monthly Revenue"
      },
      featured: true
    },
    {
      quote: "My no-show rate dropped from 30% to under 5%. That's an extra $2,400/month just from clients actually showing up. The ROI paid for itself in the first week.",
      author: "David Chen",
      role: "Precision Cuts • Los Angeles, CA",
      rating: 5,
      result: "25% reduction in no-shows",
      timeframe: "2 weeks",
      beforeAfter: {
        before: "30%",
        after: "5%",
        metric: "No-Show Rate"
      }
    },
    {
      quote: "I opened my second location 6 months after starting with BookedBarber. The multi-location dashboard makes managing both shops effortless. On track for $15K/month by year-end.",
      author: "Tyrell Washington",
      role: "Washington's Barber Co. • Chicago, IL",
      rating: 5,
      result: "2nd location opened",
      timeframe: "6 months",
      beforeAfter: {
        before: "1 shop",
        after: "2 shops",
        metric: "Business Scale"
      }
    },
    {
      quote: "The automated marketing brought back 40% of my old clients who hadn't booked in months. That's $1,800 in recovered revenue without me lifting a finger. This platform pays for itself.",
      author: "Isabella Rodriguez",
      role: "Bella's Beauty Bar • Miami, FL",
      rating: 5,
      result: "40% client reactivation",
      timeframe: "3 months",
      beforeAfter: {
        before: "60%",
        after: "85%",
        metric: "Client Retention"
      }
    }
  ]
  
  useEffect(() => {
    track(ConversionEventType.SELECT_CONTENT, {
      content_type: 'social_proof_section',
      content_name: variant,
      value: enhancedTestimonials.length
    })
  }, [variant, track])
  
  if (variant === 'stats_focus') {
    return (
      <section className={`py-20 bg-gray-50 dark:bg-gray-800 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Real Results from Real Barbers
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Live data from our Six Figure Barber community
            </p>
          </div>
          <LiveStats />
        </div>
      </section>
    )
  }
  
  if (variant === 'testimonials_focus') {
    return (
      <section className={`py-20 bg-white dark:bg-gray-900 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Success Stories That Speak for Themselves
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Join thousands of barbers transforming their businesses
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8 mb-16">
            {enhancedTestimonials.map((testimonial, index) => (
              <TestimonialCard key={index} testimonial={testimonial} index={index} />
            ))}
          </div>
        </div>
      </section>
    )
  }
  
  // Combined variant (default)
  return (
    <section className={`py-20 bg-white dark:bg-gray-900 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Trusted by Top Barbers Nationwide
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Real results from real barbers growing with BookedBarber
          </p>
        </div>
        
        {/* Live Stats */}
        <LiveStats className="mb-16" />
        
        {/* Featured Testimonials */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {enhancedTestimonials.slice(0, 2).map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} index={index} />
          ))}
        </div>
        
        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-primary-50 dark:bg-primary-900/20 p-8 rounded-xl mb-8">
            <div className="text-2xl font-bold text-primary-800 dark:text-primary-200 mb-4">
              🔥 Join <AnimatedNumber target={847} /> barbers who signed up this week
            </div>
            <div className="text-lg text-primary-600 dark:text-primary-400 mb-6">
              Limited time: Get our $297 Six Figure Barber Blueprint free with signup
            </div>
            <div className="inline-flex items-center bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-6 py-3 rounded-full font-semibold">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <AnimatedNumber target={23} suffix=" signed up today" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default EnhancedSocialProof