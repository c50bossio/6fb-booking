'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckIcon, StarIcon, CurrencyDollarIcon, TrophyIcon } from '@heroicons/react/24/outline'

export default function PricingPage() {
  const plans = [
    {
      name: "Individual Barber",
      price: "$97",
      description: "Perfect for independent barbers ready to build their six-figure business",
      badge: "Most Popular",
      features: [
        "Personal booking calendar & client management",
        "Automated payment processing & invoicing", 
        "Six Figure Barber methodology integration",
        "Client retention & loyalty tools",
        "Revenue tracking & business analytics",
        "SMS & email automation",
        "Mobile-optimized booking page",
        "24/7 customer support"
      ],
      cta: "Start Your Six-Figure Journey",
      highlight: true,
      features_note: "Most popular choice for independent barbers"
    },
    {
      name: "Barbershop Owner", 
      price: "$197",
      description: "For shop owners managing multiple barbers and scaling operations",
      badge: "Best Value",
      features: [
        "Everything in Individual Barber",
        "Multi-barber scheduling & management",
        "Staff performance analytics",
        "Advanced client segmentation", 
        "Automated marketing campaigns",
        "Financial reporting & insights",
        "Inventory management integration",
        "Custom branding & white-label options",
        "Priority phone support"
      ],
      cta: "Scale Your Business",
      highlight: false,
      features_note: "Includes multi-barber management tools"
    },
    {
      name: "Enterprise Multi-Location",
      price: "$397", 
      description: "For barbershop chains and franchise owners building empires",
      badge: "Maximum Growth",
      features: [
        "Everything in Barbershop Owner",
        "Unlimited locations & staff",
        "Franchise management tools",
        "Advanced business intelligence",
        "Custom integrations & API access",
        "Dedicated account manager",
        "On-site training & setup",
        "Custom reporting dashboards",
        "Enterprise-grade security"
      ],
      cta: "Build Your Empire", 
      highlight: false,
      features_note: "For multi-location operations and franchises"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-white">BOOKEDBARBER</div>
              <div className="text-xs text-gray-400">OWN THE CHAIR. OWN THE BRAND.</div>
            </Link>
            <nav className="hidden md:flex space-x-8">
              <Link href="/" className="text-gray-300 hover:text-white transition-colors">Home</Link>
              <Link href="/pricing" className="text-teal-400 font-semibold">Pricing</Link>
              <Link href="/features" className="text-gray-300 hover:text-white transition-colors">Features</Link>
              <Link href="/testimonials" className="text-gray-300 hover:text-white transition-colors">Testimonials</Link>
              <Link href="/login" className="text-gray-300 hover:text-white transition-colors">Login</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 text-center">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Simple, <span className="text-teal-400">Transparent Pricing</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Choose the plan that fits your business size. All plans include core booking and 
              business management features. <strong className="text-teal-400">14-day free trial</strong> available.
            </p>
            
            {/* Key Benefits */}
            <div className="flex flex-wrap justify-center gap-8 mb-12">
              <div className="flex items-center space-x-2 text-green-400">
                <CurrencyDollarIcon className="w-6 h-6" />
                <span>No Setup Fees</span>
              </div>
              <div className="flex items-center space-x-2 text-blue-400">
                <TrophyIcon className="w-6 h-6" />
                <span>Cancel Anytime</span>
              </div>
              <div className="flex items-center space-x-2 text-purple-400">
                <StarIcon className="w-6 h-6" />
                <span>1,200+ Active Users</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {plans.map((plan, index) => (
              <Card 
                key={plan.name} 
                className={`relative ${
                  plan.highlight 
                    ? 'border-2 border-teal-400 bg-gray-800/80 scale-105' 
                    : 'border border-gray-600 bg-gray-800/50'
                } backdrop-blur-sm`}
              >
                {plan.highlight && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-teal-400 text-gray-900">
                    {plan.badge}
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl font-bold text-white mb-2">{plan.name}</CardTitle>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-teal-400">{plan.price}</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                  <CardDescription className="text-gray-300 text-base">
                    {plan.description}
                  </CardDescription>
                  <div className="mt-4 p-3 bg-blue-900/30 rounded-lg border border-blue-700">
                    <div className="text-blue-400 font-semibold text-sm">Includes 14-day free trial</div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start space-x-3">
                      <CheckIcon className="w-5 h-5 text-teal-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </CardContent>

                <CardFooter className="pt-8">
                  <Button 
                    asChild
                    className={`w-full ${
                      plan.highlight
                        ? 'bg-teal-400 hover:bg-teal-500 text-gray-900'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                    size="lg"
                  >
                    <Link href="/register">
                      {plan.cta}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Value Comparison Section */}
      <section className="py-20 bg-gray-800/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-8">What's Included in Every Plan</h2>
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="bg-gray-700/50 p-6 rounded-lg">
                <div className="text-3xl font-bold text-green-400 mb-2">14 Days</div>
                <div className="text-gray-300">Free trial period</div>
              </div>
              <div className="bg-gray-700/50 p-6 rounded-lg">
                <div className="text-3xl font-bold text-blue-400 mb-2">24/7</div>
                <div className="text-gray-300">Customer support</div>
              </div>
              <div className="bg-gray-700/50 p-6 rounded-lg">
                <div className="text-3xl font-bold text-purple-400 mb-2">0%</div>
                <div className="text-gray-300">Transaction fees</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-white text-center mb-12">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-gray-800/50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-white mb-3">Is there a free trial?</h3>
              <p className="text-gray-300">Yes! Every plan includes a 14-day free trial with full access to all features. No credit card required to start.</p>
            </div>
            <div className="bg-gray-800/50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-white mb-3">What's included in the Six Figure Barber methodology?</h3>
              <p className="text-gray-300">Our platform implements the proven Six Figure Barber system including premium positioning, value-based pricing, client relationship management, and business scaling strategies.</p>
            </div>
            <div className="bg-gray-800/50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-white mb-3">Can I change plans anytime?</h3>
              <p className="text-gray-300">Absolutely! You can upgrade or downgrade your plan at any time. Changes take effect immediately and we'll prorate any billing differences.</p>
            </div>
            <div className="bg-gray-800/50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-white mb-3">What if the platform doesn't work for me?</h3>
              <p className="text-gray-300">You can cancel your subscription at any time during or after the free trial. We offer month-to-month billing with no long-term contracts required.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-teal-600 to-teal-800">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Start Your Free Trial Today</h2>
          <p className="text-xl text-teal-100 mb-8">Try BookedBarber risk-free for 14 days. No credit card required to start.</p>
          <Button asChild size="lg" className="bg-white text-teal-800 hover:bg-gray-100 font-bold px-8 py-4">
            <Link href="/register">Start Your 14-Day Free Trial</Link>
          </Button>
          <div className="mt-4 text-teal-200 text-sm">
            No credit card required • Setup in 2 minutes • Cancel anytime
          </div>
        </div>
      </section>
    </div>
  )
}