'use client';

import React from 'react';
import Link from 'next/link';
import { CheckIcon } from '@heroicons/react/24/outline';

// TypeScript interfaces for type safety
interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  popular: boolean;
}

interface PricingCardProps {
  plan: PricingPlan;
}

// Pricing data extracted from page-complex.tsx
const pricingPlans: PricingPlan[] = [
  {
    name: 'Starter',
    price: '$29',
    period: '/month',
    description: 'Perfect for new barbers getting started',
    features: [
      'Automated weekly payouts',
      'Basic commission tracking',
      'Appointment management',
      'Email notifications',
      'Client history tracking',
      'Mobile app access',
      'Standard support'
    ],
    buttonText: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Professional',
    price: '$49',
    period: '/month',
    description: 'For established barbers maximizing earnings',
    features: [
      'Everything in Starter',
      'Instant payouts (30 minutes)',
      'Advanced analytics & insights',
      'Time-based rate variations',
      'VIP client pricing',
      'Multi-location support',
      'Auto rate escalation',
      'Priority support'
    ],
    buttonText: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Shop Owner',
    price: '$99',
    period: '/month',
    description: 'Complete solution for shop owners',
    features: [
      'Everything in Professional',
      'Unlimited barber accounts',
      'Shop revenue analytics',
      'Payment splitting system',
      'Staff performance tracking',
      'Custom compensation plans',
      'SMS notifications',
      'Dedicated account manager'
    ],
    buttonText: 'Start Free Trial',
    popular: false,
  },
];

// Memoized PricingCard component for performance
const PricingCard = React.memo<PricingCardProps>(({ plan }) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-lg p-8 relative transition-all duration-300 hover:shadow-xl hover:scale-105 ${
        plan.popular ? 'ring-2 ring-slate-600' : ''
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-slate-700 text-white px-4 py-2 rounded-full text-sm font-semibold">
            Most Popular
          </span>
        </div>
      )}

      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
        <p className="mb-4 text-gray-700 font-medium">{plan.description}</p>
        <div className="flex items-baseline justify-center">
          <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
          <span className="ml-1 text-gray-800 font-semibold">{plan.period}</span>
        </div>
      </div>

      <ul className="space-y-4 mb-8">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <CheckIcon className="h-5 w-5 text-teal-600 mt-1 mr-3 flex-shrink-0" />
            <span className="text-gray-800 font-medium">{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/signup"
        className={`w-full py-3 px-4 rounded-lg font-semibold text-center block transition-all duration-200 ${
          plan.popular
            ? 'bg-slate-700 text-white hover:bg-slate-800 hover:shadow-md'
            : 'bg-gray-100 text-gray-900 hover:bg-gray-200 hover:shadow-md'
        }`}
      >
        {plan.buttonText}
      </Link>
    </div>
  );
});

PricingCard.displayName = 'PricingCard';

// Main PricingSection component
const PricingSection = React.memo(() => {
  return (
    <section id="pricing" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h2>
          <p className="text-xl text-black font-medium">
            Start with a 30-day free trial. No credit card required.
          </p>
        </div>

        {/* Responsive 3-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingPlans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </div>

        {/* Contact section */}
        <div className="text-center mt-12">
          <p className="text-gray-800 font-medium">
            Questions?{' '}
            <Link
              href="#contact"
              className="text-black font-semibold hover:underline transition-all duration-200"
            >
              Contact our sales team
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
});

PricingSection.displayName = 'PricingSection';

export default PricingSection;
