'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogoFull } from '@/components/ui/Logo'
import { 
  CalendarDaysIcon, 
  ChartBarIcon, 
  UserGroupIcon,
  BellIcon,
  CreditCardIcon,
  ArrowPathIcon,
  CheckIcon,
  PlayIcon,
  StarIcon,
  TrophyIcon,
  BoltIcon,
  ShieldCheckIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { AuthHeaderCTAs, AuthHeroCTAs } from '@/components/ui/AuthCTAs'
import { useConversionTracking, ConversionEventType } from '@/components/tracking/ConversionTracker'
import { ABTestingWrapper, ABTestDebugPanel } from '@/components/conversion/ABTestingWrapper'
import { EnhancedHeroSection } from '@/components/conversion/EnhancedHeroSection'
import { EnhancedSocialProof } from '@/components/conversion/EnhancedSocialProof'
import { EnhancedCTASection } from '@/components/conversion/EnhancedCTASection'
import { EnhancedMobileCTA } from '@/components/conversion/EnhancedMobileCTA'

export default function LandingPage() {
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'professional' | 'enterprise'>('professional')
  const { track, trackPageView } = useConversionTracking()
  
  // Track page view on load
  useEffect(() => {
    trackPageView({
      page_title: 'BookedBarber - Six Figure Barber Platform',
      page_path: '/'
    })
  }, [trackPageView])

  const features = [
    {
      icon: CalendarDaysIcon,
      title: 'Never Lose Money to No-Shows Again',
      description: 'Smart booking system with automated reminders reduces no-shows by 80%. Every missed appointment costs you $50-150 in lost revenue.',
      metric: '80% fewer no-shows',
      color: 'from-blue-500 to-indigo-600',
      benefits: ['Automated SMS/email reminders', 'Real-time availability updates', 'Smart scheduling optimization']
    },
    {
      icon: ChartBarIcon,
      title: 'See Exactly Where Your Money Goes',
      description: 'Built-in Six Figure Barber analytics show you which services make the most profit and which clients are worth keeping.',
      metric: '$2,847 avg monthly increase',
      color: 'from-green-500 to-emerald-600',
      benefits: ['Revenue tracking by service', 'Client lifetime value analysis', 'Profit margin insights']
    },
    {
      icon: CreditCardIcon,
      title: 'Get Paid Faster, Stress Less',
      description: 'Automated payment processing and instant payouts mean you never chase clients for money again. Focus on cutting hair, not collecting cash.',
      metric: '24hr automatic payouts',
      color: 'from-purple-500 to-violet-600',
      benefits: ['Contactless payments', 'Instant card processing', 'Automated payouts']
    },
    {
      icon: ArrowPathIcon,
      title: 'Build Recurring Revenue Like Netflix',
      description: 'Lock in your best clients with automated recurring appointments. Predictable income means predictable growth.',
      metric: '67% client retention boost',
      color: 'from-orange-500 to-red-500',
      benefits: ['Subscription-style bookings', 'Automated rebooking', 'Client loyalty programs']
    },
    {
      icon: BellIcon,
      title: 'Marketing That Actually Works',
      description: 'Automated SMS campaigns and email marketing bring back old clients and attract new ones. No more empty chairs.',
      metric: '34% more bookings',
      color: 'from-teal-500 to-cyan-600',
      benefits: ['Targeted email campaigns', 'SMS marketing automation', 'Social media integration']
    },
    {
      icon: UserGroupIcon,
      title: 'Scale Beyond One Chair',
      description: 'Manage multiple locations and barbers from one dashboard. Build the empire you deserve, not just another job.',
      metric: 'Up to 10 locations',
      color: 'from-pink-500 to-rose-600',
      benefits: ['Multi-location management', 'Staff scheduling tools', 'Centralized reporting']
    }
  ]


  const plans = {
    starter: {
      name: 'Starter',
      price: 29,
      description: 'Perfect for independent barbers',
      features: [
        'Up to 100 appointments/month',
        'Basic calendar management',
        'Email reminders',
        'Client management',
        'Basic analytics'
      ]
    },
    professional: {
      name: 'Professional',
      price: 59,
      description: 'For growing barbershops',
      features: [
        'Unlimited appointments',
        'Advanced calendar features',
        'SMS & email reminders',
        'Recurring appointments',
        'Revenue analytics',
        'Payment processing',
        'Google Calendar sync',
        'Priority support'
      ],
      popular: true
    },
    enterprise: {
      name: 'Enterprise',
      price: 'Custom',
      description: 'Multi-location businesses',
      features: [
        'Everything in Professional',
        'Multi-location management',
        'Advanced analytics',
        'Custom integrations',
        'Dedicated account manager',
        'Onboarding & training',
        'SLA guarantee'
      ]
    }
  }

  return (
    <main className="bg-white dark:bg-gray-900 mobile-safe no-overflow-x">
      {/* Enhanced Header Navigation - 2025 Glassmorphism Design */}
      <header className="sticky top-0 z-50 transition-all duration-500 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20">
        {/* Premium Glassmorphism Background with Enhanced Interactions */}
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border-b border-slate-200/60 dark:border-gray-800/60 transition-all duration-500 hover:bg-white/90 dark:hover:bg-gray-900/90 hover:backdrop-blur-3xl" />
        
        {/* Subtle Depth Enhancement with Interaction Response */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent dark:from-gray-900/50 pointer-events-none transition-opacity duration-500 hover:opacity-80" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            {/* Enhanced Logo Section with Sophisticated Interactions */}
            <div className="flex items-center">
              <div className="group transition-all duration-500 hover:scale-105 relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/0 via-purple-600/10 to-blue-600/0 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-500 blur-sm" />
                <div className="relative">
                  <LogoFull variant="auto" size="md" href="/" />
                </div>
              </div>
            </div>
            
            {/* Enhanced Navigation with Sophisticated Micro-Interactions */}
            <nav className="hidden md:flex items-center space-x-10">
              <Link 
                href="/billing/plans" 
                className="relative text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold text-base transition-all duration-500 group overflow-hidden"
              >
                <span className="relative z-10 transition-transform duration-300 group-hover:scale-105">Pricing</span>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-100/60 to-slate-200/60 dark:from-gray-800/60 dark:to-gray-700/60 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 -m-2 scale-75 group-hover:scale-100" />
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-full transition-all duration-500 delay-100" />
              </Link>
              
              <Link 
                href="#features" 
                className="relative text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold text-base transition-all duration-500 group overflow-hidden"
              >
                <span className="relative z-10 transition-transform duration-300 group-hover:scale-105">Features</span>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-100/60 to-slate-200/60 dark:from-gray-800/60 dark:to-gray-700/60 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 -m-2 scale-75 group-hover:scale-100" />
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-500 group-hover:w-full transition-all duration-500 delay-100" />
              </Link>
              
              <Link 
                href="#testimonials" 
                className="relative text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold text-base transition-all duration-500 group overflow-hidden"
              >
                <span className="relative z-10 transition-transform duration-300 group-hover:scale-105">Testimonials</span>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-100/60 to-slate-200/60 dark:from-gray-800/60 dark:to-gray-700/60 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 -m-2 scale-75 group-hover:scale-100" />
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 group-hover:w-full transition-all duration-500 delay-100" />
              </Link>
            </nav>
            
            {/* Enhanced Auth CTAs with Better Styling */}
            <div className="relative">
              <AuthHeaderCTAs />
            </div>
          </div>
        </div>
        
        {/* Subtle Bottom Shadow */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-gray-700 to-transparent" />
      </header>

      {/* A/B Tested Hero Section */}
      <ABTestingWrapper
        testId="homepage_hero_2025"
        variants={[
          {
            id: 'default',
            name: 'Original Hero',
            weight: 25,
            component: <EnhancedHeroSection variant="default" />
          },
          {
            id: 'urgency',
            name: 'Urgency Focused',
            weight: 25,
            component: <EnhancedHeroSection variant="urgency" />
          },
          {
            id: 'social_proof',
            name: 'Social Proof',
            weight: 25,
            component: <EnhancedHeroSection variant="social_proof" />
          },
          {
            id: 'value_focused',
            name: 'Value Focused',
            weight: 25,
            component: <EnhancedHeroSection variant="value_focused" />
          }
        ]}
        fallbackVariant="default"
      />

      {/* Enhanced Features Section - 2025 Bento Box Grid Design */}
      <section id="features" className="py-24 relative overflow-hidden">
        {/* Performance-First Background with Subtle Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
        <div className="absolute inset-0" style={{
          backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23000000\" fill-opacity=\"0.02\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"1\"%3E%3C/circle%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"
        }} />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Enhanced Typography System with Premium Visual Hierarchy */}
          <div className="text-center mb-20 relative">
            {/* Floating Badge with Enhanced Visual Treatment */}
            <div className="relative inline-flex items-center bg-gradient-to-r from-blue-50/80 via-white/80 to-blue-50/80 dark:from-blue-900/20 dark:via-gray-800/60 dark:to-blue-900/20 backdrop-blur-xl border border-blue-200/60 dark:border-blue-800/60 rounded-full px-8 py-4 mb-12 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-500 group cursor-pointer">
              {/* Floating Badge Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/15 to-blue-600/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm scale-110" />
              
              {/* Animated Badge Indicator */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse shadow-lg shadow-green-400/30" />
              
              <SparklesIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 relative z-10" />
              <span className="text-base font-bold text-slate-700 dark:text-slate-300 tracking-wide relative z-10 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors duration-300">
                Built for the Six Figure Barber Methodology
              </span>
              
              {/* Premium Badge Highlight */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent rounded-t-full" />
            </div>
            
            {/* Enhanced Headline with Premium Typography Hierarchy */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-8 leading-[1.1] relative">
              {/* Floating Text Shadow for Depth */}
              <div className="absolute inset-0 text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold opacity-[0.15] blur-sm scale-[1.02] pointer-events-none">
                <span className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-100 dark:to-white bg-clip-text text-transparent leading-[1.1]">
                  Everything You Need to
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                  Scale Your Business
                </span>
              </div>
              
              {/* Main Headline with Enhanced Gradients */}
              <span className="bg-gradient-to-br from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-50 dark:to-white bg-clip-text text-transparent leading-[1.1] relative z-10 drop-shadow-sm">
                Everything You Need to
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 dark:from-blue-400 dark:via-purple-400 dark:to-blue-600 bg-clip-text text-transparent relative z-10 drop-shadow-sm animate-gradient bg-300% group-hover:bg-100%">
                Scale Your Business
              </span>
              
              {/* Floating Accent Elements */}
              <div className="absolute -top-8 -right-8 w-16 h-16 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 rounded-full blur-xl animate-pulse hidden lg:block" />
              <div className="absolute -bottom-4 -left-6 w-12 h-12 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full blur-lg animate-pulse delay-1000 hidden lg:block" />
            </h2>
            
            {/* Enhanced Subtitle with Improved Hierarchy */}
            <p className="text-xl md:text-2xl lg:text-3xl text-slate-600 dark:text-slate-300 max-w-4xl mx-auto leading-relaxed font-medium">
              <span className="relative">
                Powerful features designed specifically for 
                <span className="relative mx-2">
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold">barbers</span>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-full" />
                </span>
                and barbershop owners who want to 
                <span className="relative mx-2">
                  <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent font-bold">own their chair</span>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-600/30 to-teal-600/30 rounded-full" />
                </span>
                and build their brand.
              </span>
            </p>
            
            {/* Floating Typography Accent */}
            <div className="absolute top-16 right-4 opacity-20 hidden xl:block pointer-events-none">
              <div className="text-8xl font-black bg-gradient-to-br from-blue-600/10 to-purple-600/10 bg-clip-text text-transparent transform rotate-12">
                6FB
              </div>
            </div>
          </div>

          {/* Enhanced Bento Box Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`group relative overflow-hidden rounded-3xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 ${
                  index === 0 ? 'md:col-span-2 lg:col-span-1' : ''
                } ${
                  index === 2 ? 'lg:col-span-2' : ''
                }`}
                style={{
                  animationDelay: `${index * 100}ms`
                }}
              >
                {/* Enhanced Multi-Layer Glassmorphism Background */}
                <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl border border-white/30 dark:border-gray-700/40 rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/20" />
                
                {/* Secondary Glassmorphism Layer for Depth */}
                <div className="absolute inset-[1px] bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm rounded-3xl" />
                
                {/* Premium Gradient Overlay with Enhanced Depth */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-[0.12] transition-all duration-500 rounded-3xl`} />
                
                {/* Floating Highlight Effect */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/60 dark:via-gray-300/60 to-transparent rounded-t-3xl" />
                
                {/* Enhanced Content Layout */}
                <div className="relative p-8 lg:p-10 h-full flex flex-col">
                  {/* Header Section with Improved Visual Hierarchy */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-shrink-0">
                      <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center shadow-lg shadow-black/10 group-hover:shadow-2xl group-hover:shadow-black/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 border border-white/20 backdrop-blur-sm`}>
                        <feature.icon className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-2xl lg:text-3xl font-bold bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}>
                        {feature.metric}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">improvement</div>
                    </div>
                  </div>
                  
                  {/* Enhanced Typography with Better Spacing */}
                  <div className="flex-grow">
                    <h3 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white mb-4 leading-tight group-hover:text-slate-800 dark:group-hover:text-slate-100 transition-colors">
                      {feature.title}
                    </h3>
                    
                    <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed text-base lg:text-lg">
                      {feature.description}
                    </p>
                    
                    {/* Enhanced Benefits with Better Visual Treatment */}
                    <div className="space-y-3 mb-8">
                      {feature.benefits.map((benefit, benefitIndex) => (
                        <div 
                          key={benefitIndex} 
                          className="flex items-center text-sm lg:text-base text-slate-600 dark:text-slate-300 transform transition-all duration-300"
                          style={{
                            animationDelay: `${(index * 100) + (benefitIndex * 50)}ms`
                          }}
                        >
                          <div className="w-5 h-5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                            <CheckIcon className="w-3 h-3 text-white" />
                          </div>
                          <span className="font-medium">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Enhanced Interactive Element with Premium Glassmorphism */}
                  <div className="mt-auto">
                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                      <Button 
                        variant="outline" 
                        size="lg" 
                        className={`w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-white/40 dark:border-gray-700/40 hover:border-white/60 dark:hover:border-gray-600/60 hover:bg-gradient-to-r hover:from-white/90 hover:to-slate-50/90 dark:hover:from-gray-700/90 dark:hover:to-gray-600/90 hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/30 text-slate-700 dark:text-slate-200 font-bold transition-all duration-300 hover:scale-105 relative overflow-hidden`}
                        onClick={() => track('feature_interest', { feature: feature.title })}
                      >
                        {/* Premium Button Background Effect */}
                        <div className={`absolute inset-0 bg-gradient-to-r ${feature.color} opacity-0 hover:opacity-10 transition-opacity duration-300`} />
                        
                        <span className="relative z-10 flex items-center justify-center">
                          Learn More
                          <SparklesIcon className="w-5 h-5 ml-2 group-hover:rotate-12 transition-transform duration-300" />
                        </span>
                      </Button>
                    </div>
                    
                    {/* Enhanced Interaction Hint with Glassmorphism */}
                    <div className="mt-4 text-center opacity-40 group-hover:opacity-100 transition-all duration-300">
                      <div className="inline-flex items-center bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm border border-white/20 dark:border-gray-700/20 rounded-full px-3 py-1">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2 animate-pulse" />
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Interactive</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Multi-Layer Depth System */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/[0.03] via-transparent to-white/[0.02] dark:from-white/[0.03] dark:via-transparent dark:to-black/[0.02] rounded-3xl pointer-events-none" />
                
                {/* Premium Edge Glow Effect */}
                <div className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-500 bg-gradient-to-r ${feature.color} blur-xl -z-10 scale-95`} style={{ filter: 'blur(20px)' }} />
                
                {/* Floating Interaction Indicator */}
                <div className="absolute top-4 right-4 w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-all duration-300" />
              </div>
            ))}
          </div>
          
          {/* Enhanced Call-to-Action with Sophisticated Micro-Interactions */}
          <div className="text-center mt-16">
            <div className="group inline-flex items-center bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm border border-blue-200/60 dark:border-blue-800/60 rounded-full px-8 py-4 hover:bg-blue-100/80 dark:hover:bg-blue-800/30 hover:border-blue-300/80 dark:hover:border-blue-700/80 transition-all duration-500 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 cursor-pointer relative overflow-hidden">
              {/* Animated Background Shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              
              <TrophyIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
              <span className="text-blue-800 dark:text-blue-200 font-semibold text-lg transition-all duration-300 group-hover:text-blue-900 dark:group-hover:text-blue-100">Join 15,000+ successful barbers</span>
              <span className="ml-3 text-blue-600 dark:text-blue-400 transform transition-all duration-300 group-hover:translate-x-1 group-hover:scale-110">→</span>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Success Metrics Section - 2025 Glassmorphism Design */}
      <section className="py-24 relative overflow-hidden">
        {/* Premium Dark Background with Depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"100\" height=\"100\" viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.03\"%3E%3Cpath d=\"M50 0l50 50-50 50L0 50z\"/%3E%3C/g%3E%3C/svg%3E')"
        }} />
        
        {/* Subtle Animated Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-blue-600/10 animate-pulse" style={{
          animation: 'gradient 8s ease-in-out infinite',
          backgroundSize: '200% 200%'
        }} />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Enhanced Typography with Strategic Hierarchy */}
          <div className="text-center mb-16">
            {/* Premium Badge */}
            <div className="inline-flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-8 py-3 mb-8">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse" />
              <span className="text-white/80 font-medium text-sm tracking-wide uppercase">Live Platform Metrics</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="text-white">Join </span>
              <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent font-extrabold">
                15,000+
              </span>
              <span className="text-white"> Successful Barbers</span>
            </h2>
            
            <p className="text-xl md:text-2xl text-slate-300 max-w-4xl mx-auto leading-relaxed">
              Barbers using BookedBarber are earning 6-figures and building sustainable businesses with the Six Figure Barber methodology
            </p>
          </div>
          
          {/* Enhanced Metrics Grid with Glassmorphism */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-16">
            {[
              {
                icon: TrophyIcon,
                value: '15,000+',
                label: 'Active Barbers',
                subtext: 'Growing daily',
                gradient: 'from-blue-500 to-indigo-600',
                bgGradient: 'from-blue-500/20 to-indigo-600/20'
              },
              {
                icon: BoltIcon,
                value: '2.3M+',
                label: 'Appointments Booked',
                subtext: 'This month',
                gradient: 'from-green-500 to-emerald-600',
                bgGradient: 'from-green-500/20 to-emerald-600/20'
              },
              {
                icon: CreditCardIcon,
                value: '$127M+',
                label: 'Revenue Processed',
                subtext: 'Platform total',
                gradient: 'from-purple-500 to-violet-600',
                bgGradient: 'from-purple-500/20 to-violet-600/20'
              },
              {
                icon: ShieldCheckIcon,
                value: '99.9%',
                label: 'Uptime Guarantee',
                subtext: 'Always reliable',
                gradient: 'from-orange-500 to-red-500',
                bgGradient: 'from-orange-500/20 to-red-500/20'
              }
            ].map((metric, index) => (
              <div key={index} className="group text-center">
                {/* Enhanced Glassmorphism Card with Sophisticated Interactions */}
                <div className="relative p-8 rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all duration-500 hover:scale-105 cursor-pointer overflow-hidden">
                  {/* Animated Background Shimmer Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  
                  {/* Enhanced Background Gradient with Pulse Effect */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${metric.bgGradient} opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-3xl scale-95 group-hover:scale-100`} />
                  
                  <div className="relative">
                    {/* Enhanced Icon with Multi-Layer Effects */}
                    <div className={`bg-gradient-to-br ${metric.gradient} w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-2xl shadow-black/20 group-hover:shadow-3xl relative overflow-hidden`}>
                      {/* Icon Glow Effect */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} opacity-0 group-hover:opacity-50 transition-opacity duration-500 blur-lg scale-150`} />
                      <metric.icon className="w-10 h-10 text-white relative z-10 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    
                    {/* Enhanced Typography with Counter Animation Effect */}
                    <div className={`text-4xl lg:text-5xl font-bold text-white mb-2 bg-gradient-to-r ${metric.gradient} bg-clip-text group-hover:text-transparent transition-all duration-500 transform group-hover:scale-105`}>
                      <span className="inline-block transition-all duration-300 group-hover:animate-pulse">
                        {metric.value}
                      </span>
                    </div>
                    
                    <div className="text-slate-300 font-semibold text-lg mb-1 transition-all duration-300 group-hover:text-white group-hover:scale-105">
                      {metric.label}
                    </div>
                    
                    <div className="text-slate-400 text-sm font-medium opacity-80 transition-all duration-300 group-hover:opacity-100 group-hover:text-slate-300">
                      {metric.subtext}
                    </div>
                  </div>
                  
                  {/* Subtle Depth Effect */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-3xl pointer-events-none" />
                </div>
              </div>
            ))}
          </div>
          
          {/* Enhanced Rating Badge with Sophisticated Micro-Interactions */}
          <div className="text-center">
            <div className="group inline-flex items-center bg-white/15 backdrop-blur-xl border border-white/30 rounded-2xl px-8 py-6 hover:bg-white/20 hover:border-white/40 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-400/20 cursor-pointer relative overflow-hidden">
              {/* Animated Background Shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              
              <div className="flex items-center mr-6 relative z-10">
                {[...Array(5)].map((_, i) => (
                  <StarIcon 
                    key={i} 
                    className="w-6 h-6 text-yellow-400 fill-current group-hover:scale-110 transition-all duration-300 group-hover:rotate-12 group-hover:text-yellow-300" 
                    style={{ 
                      animationDelay: `${i * 100}ms`,
                      transitionDelay: `${i * 50}ms`
                    }}
                  />
                ))}
              </div>
              
              <div className="text-left relative z-10">
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-yellow-400 mr-2 transition-all duration-300 group-hover:text-yellow-300 group-hover:scale-105">4.9</span>
                  <span className="text-white/80 font-medium transition-colors duration-300 group-hover:text-white">/5</span>
                </div>
                <div className="text-slate-300 text-sm font-medium transition-all duration-300 group-hover:text-slate-200">
                  Rated by 2,500+ barbers
                </div>
              </div>
              
              <div className="ml-6 opacity-60 group-hover:opacity-100 transition-all duration-300 relative z-10">
                <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg group-hover:shadow-green-400/30">
                  <CheckIcon className="w-5 h-5 text-white transition-transform duration-300 group-hover:scale-110" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced Custom CSS for Advanced Visual Effects */}
        <style jsx>{`
          @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          
          @keyframes gradient-shift {
            0% { background-position: 0% 0%; }
            25% { background-position: 100% 0%; }
            50% { background-position: 100% 100%; }
            75% { background-position: 0% 100%; }
            100% { background-position: 0% 0%; }
          }
          
          @keyframes floating {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-10px) rotate(1deg); }
            66% { transform: translateY(-5px) rotate(-1deg); }
          }
          
          @keyframes shimmer {
            0% { transform: translateX(-100%) skewX(-12deg); }
            100% { transform: translateX(100%) skewX(-12deg); }
          }
          
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
            50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.4); }
          }
          
          .animate-gradient {
            animation: gradient-shift 8s ease-in-out infinite;
          }
          
          .animate-floating {
            animation: floating 6s ease-in-out infinite;
          }
          
          .animate-pulse-glow {
            animation: pulse-glow 3s ease-in-out infinite;
          }
          
          .bg-300\\% {
            background-size: 300% 300%;
          }
          
          .bg-100\\% {
            background-size: 100% 100%;
          }
          
          .text-shadow-soft {
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          
          .text-shadow-glow {
            text-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
          }
        `}</style>
      </section>

      {/* Enhanced Social Proof Section */}
      <ABTestingWrapper
        testId="social_proof_2025"
        variants={[
          {
            id: 'combined',
            name: 'Combined Stats & Testimonials',
            weight: 40,
            component: <EnhancedSocialProof variant="combined" />
          },
          {
            id: 'testimonials_focus',
            name: 'Testimonials Focus',
            weight: 30,
            component: <EnhancedSocialProof variant="testimonials_focus" />
          },
          {
            id: 'stats_focus',
            name: 'Stats Focus',
            weight: 30,
            component: <EnhancedSocialProof variant="stats_focus" />
          }
        ]}
        fallbackVariant="combined"
      />

      {/* Enhanced Pricing Section - 2025 Premium Design */}
      <section className="py-24 relative overflow-hidden">
        {/* Premium Background with Subtle Texture */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
        <div className="absolute inset-0 dark:hidden" style={{
          backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"80\" height=\"80\" viewBox=\"0 0 80 80\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23000000\" fill-opacity=\"0.02\"%3E%3Cpath d=\"M40 0l40 40-40 40L0 40z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"
        }} />
        <div className="absolute inset-0 hidden dark:block" style={{
          backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"80\" height=\"80\" viewBox=\"0 0 80 80\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.03\"%3E%3Cpath d=\"M40 0l40 40-40 40L0 40z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"
        }} />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Enhanced Typography with Premium Visual Hierarchy */}
          <div className="text-center mb-20 relative">
            {/* Premium Floating Badge with Enhanced Design */}
            <div className="relative inline-flex items-center bg-gradient-to-r from-green-50/80 via-white/80 to-green-50/80 dark:from-green-900/20 dark:via-gray-800/60 dark:to-green-900/20 backdrop-blur-xl border border-green-200/60 dark:border-green-800/60 rounded-full px-10 py-4 mb-12 shadow-lg shadow-green-500/10 hover:shadow-green-500/20 transition-all duration-500 group cursor-pointer">
              {/* Floating Badge Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 via-emerald-600/15 to-green-600/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm scale-110" />
              
              {/* Enhanced Animated Indicator */}
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-400/40" />
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse delay-300 shadow-lg shadow-emerald-400/40" />
              </div>
              
              <ShieldCheckIcon className="w-6 h-6 text-green-600 dark:text-green-400 mr-3 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 relative z-10" />
              <span className="text-base font-bold text-slate-700 dark:text-slate-300 tracking-wide relative z-10 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors duration-300">
                ROI Guaranteed • 6FB Methodology Included
              </span>
              
              {/* Premium Badge Accent */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-400/60 to-transparent rounded-t-full" />
            </div>
            
            {/* Enhanced Headline with Sophisticated Typography */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-8 leading-[1.1] relative">
              {/* Floating Text Shadow for Depth */}
              <div className="absolute inset-0 text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold opacity-[0.12] blur-sm scale-[1.02] pointer-events-none">
                <span className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-100 dark:to-white bg-clip-text text-transparent leading-[1.1]">
                  Simple, Transparent
                </span>
                <br />
                <span className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 bg-clip-text text-transparent">
                  Pricing
                </span>
              </div>
              
              {/* Main Headline with Enhanced Visual Treatment */}
              <span className="bg-gradient-to-br from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-50 dark:to-white bg-clip-text text-transparent leading-[1.1] relative z-10 drop-shadow-sm">
                Simple, Transparent
              </span>
              <br />
              <span className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 dark:from-green-400 dark:via-emerald-400 dark:to-green-600 bg-clip-text text-transparent relative z-10 drop-shadow-sm">
                Pricing
              </span>
              
              {/* Floating Currency Accent */}
              <div className="absolute -top-6 -right-6 text-6xl opacity-10 font-black text-green-600 transform rotate-12 hidden lg:block pointer-events-none">
                $
              </div>
            </h2>
            
            {/* Enhanced Subtitle with Key Benefits Highlighted */}
            <p className="text-xl md:text-2xl lg:text-3xl text-slate-600 dark:text-slate-300 max-w-4xl mx-auto leading-relaxed font-medium">
              <span className="relative">
                Choose the plan that fits your business. 
                <span className="relative mx-2">
                  <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-bold">Upgrade</span>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-600/30 to-emerald-600/30 rounded-full" />
                </span>
                or 
                <span className="relative mx-2">
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold">downgrade</span>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-full" />
                </span>
                anytime with no long-term commitments.
              </span>
            </p>
            
            {/* Floating Guarantee Badge */}
            <div className="absolute top-20 left-8 opacity-15 hidden xl:block pointer-events-none">
              <div className="text-6xl font-black bg-gradient-to-br from-green-600/20 to-emerald-600/20 bg-clip-text text-transparent transform -rotate-12">
                100%
              </div>
              <div className="text-xs font-bold text-green-600/40 transform -rotate-12 text-center">
                GUARANTEED
              </div>
            </div>
          </div>

          {/* Enhanced Pricing Grid with Bento Box Layout */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            {Object.entries(plans).map(([key, plan]) => {
              const isPopular = 'popular' in plan && plan.popular
              const isSelected = selectedPlan === key
              
              return (
                <div
                  key={key}
                  className={`group relative rounded-3xl transition-all duration-500 cursor-pointer hover:scale-[1.02] overflow-hidden ${
                    isPopular ? 'scale-105 md:scale-110' : ''
                  } ${
                    isSelected ? 'scale-105 ring-4 ring-blue-500/20' : ''
                  }`}
                  onClick={() => setSelectedPlan(key as any)}
                >
                  {/* Enhanced Glassmorphism Card Background with Micro-Interactions */}
                  <div className={`absolute inset-0 backdrop-blur-xl rounded-3xl border transition-all duration-500 group-hover:backdrop-blur-2xl ${
                    isPopular 
                      ? 'bg-gradient-to-br from-blue-500/10 to-purple-600/10 border-blue-500/30 shadow-2xl shadow-blue-500/20 group-hover:from-blue-500/15 group-hover:to-purple-600/15 group-hover:border-blue-500/40 group-hover:shadow-blue-500/30' 
                      : 'bg-white/70 dark:bg-gray-800/70 border-slate-200/60 dark:border-gray-700/30 hover:border-slate-300/80 dark:hover:border-gray-600/50 group-hover:bg-white/80 dark:group-hover:bg-gray-800/80'
                  }`} />
                  
                  {/* Animated Background Shimmer Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  
                  {/* Enhanced Premium Popular Badge with Micro-Interactions */}
                  {isPopular && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20">
                      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl border border-white/20 backdrop-blur-sm group-hover:scale-105 group-hover:shadow-3xl transition-all duration-300 relative overflow-hidden">
                        {/* Badge Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        
                        <span className="flex items-center relative z-10">
                          <TrophyIcon className="w-4 h-4 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-all duration-300" />
                          <span className="group-hover:scale-105 transition-transform duration-300">Most Popular</span>
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Enhanced Content Layout */}
                  <div className="relative z-10 p-8 lg:p-10 h-full flex flex-col">
                    {/* Header Section */}
                    <div className="text-center mb-8">
                      <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-3">
                        {plan.name}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 text-lg mb-8 leading-relaxed">
                        {plan.description}
                      </p>
                      
                      {/* Enhanced Pricing Display */}
                      <div className="mb-8">
                        {typeof plan.price === 'number' ? (
                          <div className="flex items-end justify-center">
                            <span className="text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white leading-none">
                              ${plan.price}
                            </span>
                            <div className="ml-3 pb-2 text-left">
                              <div className="text-slate-600 dark:text-slate-400 text-base font-medium">/month</div>
                              <div className="text-slate-500 dark:text-slate-500 text-sm">billed monthly</div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white">
                            {plan.price}
                          </div>
                        )}
                        
                        {/* Value Indicator */}
                        {isPopular && (
                          <div className="mt-4">
                            <span className="inline-flex items-center bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-full text-sm font-semibold">
                              <BoltIcon className="w-4 h-4 mr-1" />
                              Best Value
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Enhanced Features List */}
                    <div className="flex-grow mb-8">
                      <ul className="space-y-4">
                        {plan.features.map((feature, index) => (
                          <li 
                            key={index} 
                            className="flex items-start transition-all duration-300 hover:translate-x-1" 
                            style={{ transitionDelay: `${index * 50}ms` }}
                          >
                            <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mt-0.5 mr-4 shadow-sm">
                              <CheckIcon className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-slate-700 dark:text-slate-300 text-base leading-relaxed font-medium">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Enhanced CTA Button */}
                    <div className="mt-auto">
                      <Link href="/register" onClick={() => track('pricing_plan_selected', { plan: key })}>
                        <Button 
                          variant={isPopular ? 'default' : 'outline'} 
                          size="lg"
                          className={`w-full py-4 text-lg font-bold transition-all duration-300 rounded-2xl ${
                            isPopular 
                              ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 hover:from-blue-700 hover:via-purple-700 hover:to-blue-800 shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 text-white border-0' 
                              : 'bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-2 border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600 hover:bg-white/80 dark:hover:bg-gray-700/80 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {isPopular ? (
                            <span className="flex items-center justify-center">
                              <BoltIcon className="w-5 h-5 mr-2" />
                              Start Free Trial
                            </span>
                          ) : (
                            'Start Free Trial'
                          )}
                        </Button>
                      </Link>
                      
                      {/* Enhanced Guarantee */}
                      <div className="mt-6 text-center">
                        <div className="inline-flex items-center text-sm text-slate-500 dark:text-slate-400 font-medium">
                          <ShieldCheckIcon className="w-5 h-5 mr-2 text-green-500" />
                          30-day money-back guarantee
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Subtle Depth Enhancement */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/[0.02] to-transparent dark:from-white/[0.02] rounded-3xl pointer-events-none" />
                </div>
              )
            })}
          </div>
          
          {/* Enhanced Value Proposition Footer */}
          <div className="text-center">
            <div className="inline-flex items-center bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm border border-blue-200/60 dark:border-blue-800/60 rounded-2xl px-8 py-6">
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <SparklesIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2" />
                  <span className="text-blue-800 dark:text-blue-200 font-semibold">14-day free trial</span>
                </div>
                
                <div className="w-px h-6 bg-blue-300 dark:bg-blue-700" />
                
                <div className="flex items-center">
                  <CheckIcon className="w-6 h-6 text-green-600 dark:text-green-400 mr-2" />
                  <span className="text-blue-800 dark:text-blue-200 font-semibold">No setup fees</span>
                </div>
                
                <div className="w-px h-6 bg-blue-300 dark:bg-blue-700" />
                
                <div className="flex items-center">
                  <ArrowPathIcon className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-2" />
                  <span className="text-blue-800 dark:text-blue-200 font-semibold">Cancel anytime</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <ABTestingWrapper
        testId="final_cta_2025"
        variants={[
          {
            id: 'urgency',
            name: 'Urgency Focused',
            weight: 30,
            component: <EnhancedCTASection variant="urgency" size="standard" />
          },
          {
            id: 'value',
            name: 'Value Proposition',
            weight: 25,
            component: <EnhancedCTASection variant="value" size="standard" />
          },
          {
            id: 'social_proof',
            name: 'Social Proof',
            weight: 25,
            component: <EnhancedCTASection variant="social_proof" size="standard" />
          },
          {
            id: 'risk_reversal',
            name: 'Risk Reversal',
            weight: 20,
            component: <EnhancedCTASection variant="risk_reversal" size="standard" />
          }
        ]}
        fallbackVariant="urgency"
      />

      {/* Enhanced Footer - 2025 Premium Design */}
      <footer className="relative overflow-hidden">
        {/* Premium Background with Subtle Texture */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0" style={{
          backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.02\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"1\"%3E%3C/circle%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"
        }} />
        
        {/* Subtle Top Border */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
        
        <div className="relative py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Enhanced Grid Layout */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">
              {/* Enhanced Brand Section with Sophisticated Interactions */}
              <div className="md:col-span-2 lg:col-span-1">
                <div className="group transition-all duration-500 hover:scale-105 inline-block mb-6 relative">
                  <div className="absolute -inset-3 bg-gradient-to-r from-blue-600/0 via-purple-600/10 to-blue-600/0 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-500 blur-sm" />
                  <div className="relative">
                    <LogoFull variant="color" size="lg" href="#" />
                  </div>
                </div>
                
                <p className="text-slate-300 text-lg leading-relaxed mb-6 max-w-sm">
                  The command center for barbers who want to own their chair, own their brand.
                </p>
                
                {/* Enhanced Social Proof with Micro-Interactions */}
                <div className="flex items-center space-x-4">
                  <div className="group flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all duration-300 cursor-pointer">
                    <div className="flex -space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon 
                          key={i} 
                          className="w-4 h-4 text-yellow-400 fill-current group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" 
                          style={{ transitionDelay: `${i * 50}ms` }}
                        />
                      ))}
                    </div>
                    <span className="ml-2 text-white text-sm font-semibold group-hover:scale-105 transition-transform duration-300">4.9</span>
                  </div>
                  
                  <div className="text-slate-400 text-sm hover:text-slate-300 transition-colors duration-300 cursor-pointer">
                    Trusted by 15K+ barbers
                  </div>
                </div>
              </div>
              
              {/* Enhanced Navigation Sections */}
              {[
                {
                  title: 'Product',
                  links: [
                    { label: 'Free Trial', href: '/register', icon: BoltIcon },
                    { label: 'Features', href: '#features', icon: SparklesIcon },
                    { label: 'Pricing', href: '/billing/plans', icon: CreditCardIcon },
                    { label: 'Login', href: '/login', icon: UserGroupIcon }
                  ]
                },
                {
                  title: 'Support',
                  links: [
                    { label: 'Documentation', href: '#', icon: null },
                    { label: 'Contact Us', href: '#', icon: null },
                    { label: 'FAQs', href: '#', icon: null },
                    { label: 'Status', href: '#', icon: ShieldCheckIcon }
                  ]
                },
                {
                  title: 'Legal',
                  links: [
                    { label: 'Privacy Policy', href: '#', icon: null },
                    { label: 'Terms of Service', href: '#', icon: null },
                    { label: 'Cookie Policy', href: '#', icon: null }
                  ]
                }
              ].map((section, sectionIndex) => (
                <div key={sectionIndex}>
                  {/* Enhanced Section Headers */}
                  <h3 className="text-white font-bold text-lg mb-6 relative">
                    {section.title}
                    <div className="absolute -bottom-2 left-0 w-8 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                  </h3>
                  
                  {/* Enhanced Link Lists */}
                  <ul className="space-y-4">
                    {section.links.map((link, linkIndex) => (
                      <li key={linkIndex}>
                        <Link 
                          href={link.href} 
                          className="group flex items-center text-slate-300 hover:text-white transition-all duration-300 text-base relative overflow-hidden rounded-lg p-2 -m-2 hover:bg-white/5"
                        >
                          {link.icon && (
                            <link.icon className="w-4 h-4 mr-3 text-slate-400 group-hover:text-blue-400 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                          )}
                          <span className="group-hover:translate-x-1 transition-transform duration-300 relative z-10">
                            {link.label}
                          </span>
                          {/* Subtle hover background */}
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-600/5 to-blue-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            
            {/* Enhanced Bottom Section */}
            <div className="mt-16 pt-8 border-t border-slate-700/50">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                {/* Enhanced Copyright */}
                <div className="flex items-center space-x-6">
                  <p className="text-slate-400 text-base">
                    &copy; 2025 Booked Barber. All rights reserved.
                  </p>
                  
                  <div className="hidden md:flex items-center space-x-4 text-slate-500">
                    <div className="flex items-center">
                      <ShieldCheckIcon className="w-4 h-4 mr-1" />
                      <span className="text-sm">SOC 2 Compliant</span>
                    </div>
                    
                    <div className="w-px h-4 bg-slate-600" />
                    
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                      <span className="text-sm">99.9% Uptime</span>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Platform Badge with Sophisticated Micro-Interactions */}
                <div className="group flex items-center bg-slate-800/60 backdrop-blur-sm border border-slate-700/60 rounded-full px-6 py-3 hover:bg-slate-700/70 hover:border-slate-600/70 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer relative overflow-hidden">
                  {/* Animated Background Shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  
                  <SparklesIcon className="w-5 h-5 text-blue-400 mr-2 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 relative z-10" />
                  <span className="text-slate-300 font-medium text-sm group-hover:text-slate-200 transition-colors duration-300 relative z-10">
                    Built for the Six Figure Barber methodology
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Subtle Depth Enhancement */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
      </footer>

      {/* Enhanced Mobile CTA */}
      <ABTestingWrapper
        testId="mobile_cta_2025"
        variants={[
          {
            id: 'standard',
            name: 'Standard Mobile CTA',
            weight: 30,
            component: <EnhancedMobileCTA variant="standard" showOnScroll={true} scrollThreshold={0.3} />
          },
          {
            id: 'urgency',
            name: 'Urgency Mobile CTA',
            weight: 30,
            component: <EnhancedMobileCTA variant="urgency" showOnScroll={true} scrollThreshold={0.3} />
          },
          {
            id: 'value',
            name: 'Value Mobile CTA',
            weight: 25,
            component: <EnhancedMobileCTA variant="value" showOnScroll={true} scrollThreshold={0.3} />
          },
          {
            id: 'minimal',
            name: 'Minimal Mobile CTA',
            weight: 15,
            component: <EnhancedMobileCTA variant="minimal" showOnScroll={true} scrollThreshold={0.4} />
          }
        ]}
        fallbackVariant="standard"
      />
      
      {/* A/B Testing Debug Panel (Development Only) */}
      <ABTestDebugPanel />
      
    </main>
  )
}