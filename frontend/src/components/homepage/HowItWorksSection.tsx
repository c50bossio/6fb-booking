'use client'

import React from 'react'

interface Step {
  number: number
  title: string
  description: string
}

const steps: Step[] = [
  {
    number: 1,
    title: 'Create Your Account',
    description: 'Sign up and connect your bank account with Stripe Express in under 5 minutes'
  },
  {
    number: 2,
    title: 'Set Your Rates',
    description: 'Choose your compensation model and customize rates for different services and clients'
  },
  {
    number: 3,
    title: 'Start Earning',
    description: 'Track appointments, see real-time earnings, and get paid automatically on your schedule'
  }
]

interface StepCardProps {
  step: Step
}

const StepCard = React.memo(({ step }: StepCardProps) => (
  <div className="text-center group">
    <div className="bg-slate-700 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-lg font-bold transition-transform duration-200 group-hover:scale-110">
      {step.number}
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">
      {step.title}
    </h3>
    <p className="text-gray-700 font-medium leading-relaxed">
      {step.description}
    </p>
  </div>
))

StepCard.displayName = 'StepCard'

interface HowItWorksSectionProps {
  className?: string
}

const HowItWorksSection = React.memo(({ className = '' }: HowItWorksSectionProps) => {
  return (
    <section className={`py-16 bg-white ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Simple Setup, Powerful Results
          </h2>
          <p className="text-xl max-w-2xl mx-auto text-gray-700 font-medium">
            Get started in minutes and see immediate impact on your business
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <StepCard key={step.number} step={step} />
          ))}
        </div>
      </div>
    </section>
  )
})

HowItWorksSection.displayName = 'HowItWorksSection'

export default HowItWorksSection
