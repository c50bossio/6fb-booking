'use client'

import { useState } from 'react'

interface CTASectionProps {
  className?: string
}

export default function CTASection({ className = '' }: CTASectionProps) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    // For now, just show success message
    alert('Thanks! We\'ll send you early access when available.')
    setEmail('')
    setIsSubmitting(false)
  }

  return (
    <section className={`py-16 bg-slate-800 ${className}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to Build Your Six-Figure Career?
        </h2>
        <p className="text-xl text-white mb-8">
          Join 1,200+ barbers using our platform to transform their business and income.
        </p>

        <form onSubmit={handleEmailSubmit} className="max-w-md mx-auto">
          <div className="flex">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 rounded-l-lg border-0 focus:ring-2 focus:ring-slate-400 disabled:opacity-50 transition-opacity duration-200"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-white text-slate-700 px-6 py-3 rounded-r-lg font-semibold hover:bg-gray-50 disabled:opacity-50 transition-all duration-200 transform hover:scale-105 active:scale-95"
            >
              {isSubmitting ? 'Submitting...' : 'Get Started'}
            </button>
          </div>
        </form>

        <p className="text-slate-200 text-sm mt-4 font-medium">
          30-day free trial • No credit card required • Cancel anytime
        </p>
      </div>
    </section>
  )
}
