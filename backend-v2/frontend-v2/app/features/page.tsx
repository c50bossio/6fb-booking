'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CalendarIcon, 
  CreditCardIcon, 
  ChartBarIcon, 
  UserGroupIcon,
  DevicePhoneMobileIcon,
  BellIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  ClockIcon,
  StarIcon,
  TrophyIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline'

export default function FeaturesPage() {
  const featureCategories = [
    {
      title: "Revenue Optimization",
      description: "Tools designed to maximize your income using Six Figure Barber principles",
      icon: CurrencyDollarIcon,
      color: "text-green-400",
      features: [
        {
          name: "Smart Pricing Engine",
          description: "Automatically optimize your service prices based on demand, competition, and Six Figure Barber value-based pricing strategies."
        },
        {
          name: "Upselling Automation", 
          description: "Intelligent suggestions for additional services and products to increase average transaction value."
        },
        {
          name: "Revenue Analytics",
          description: "Track revenue trends, identify your most profitable services, and forecast business growth."
        },
        {
          name: "Commission Tracking",
          description: "Automatically calculate and track commissions for booth rental and employee compensation."
        }
      ]
    },
    {
      title: "Client Relationship Management",
      description: "Build lasting relationships that drive repeat business and referrals",
      icon: UserGroupIcon,
      color: "text-blue-400", 
      features: [
        {
          name: "Client Profiles & History",
          description: "Comprehensive client records including preferences, service history, and personal notes for personalized experiences."
        },
        {
          name: "Automated Follow-ups",
          description: "Smart SMS and email campaigns to maintain client engagement and encourage rebooking."
        },
        {
          name: "Loyalty Programs",
          description: "Built-in rewards system to incentivize repeat visits and increase client lifetime value."
        },
        {
          name: "Referral Tracking",
          description: "Track and reward client referrals to grow your business through word-of-mouth marketing."
        }
      ]
    },
    {
      title: "Booking & Scheduling",
      description: "Streamlined scheduling that works 24/7 to fill your calendar",
      icon: CalendarIcon,
      color: "text-purple-400",
      features: [
        {
          name: "24/7 Online Booking",
          description: "Custom booking pages that let clients schedule appointments anytime, reducing phone interruptions."
        },
        {
          name: "Smart Availability",
          description: "Intelligent scheduling that maximizes your booking density and minimizes gaps in your calendar."
        },
        {
          name: "Multi-Service Booking",
          description: "Allow clients to book multiple services and add-ons in a single session."
        },
        {
          name: "Waitlist Management",
          description: "Automatically fill cancellations with waitlisted clients to maximize revenue."
        }
      ]
    },
    {
      title: "Payment Processing", 
      description: "Secure, automated payments that improve cash flow",
      icon: CreditCardIcon,
      color: "text-teal-400",
      features: [
        {
          name: "Contactless Payments",
          description: "Accept payments via card, mobile wallet, and contactless methods for client convenience."
        },
        {
          name: "Automatic Invoicing",
          description: "Generate and send professional invoices automatically for all services rendered."
        },
        {
          name: "Payment Plans",
          description: "Offer flexible payment options for high-value services to increase booking conversion."
        },
        {
          name: "Tip Management",
          description: "Digital tip processing with automatic distribution for staff members."
        }
      ]
    },
    {
      title: "Business Analytics",
      description: "Data-driven insights to scale your six-figure business",
      icon: ChartBarIcon,
      color: "text-yellow-400",
      features: [
        {
          name: "Revenue Dashboard",
          description: "Real-time insights into daily, weekly, and monthly revenue with trend analysis."
        },
        {
          name: "Client Retention Metrics",
          description: "Track client retention rates and identify opportunities to improve loyalty."
        },
        {
          name: "Service Performance",
          description: "Analyze which services generate the most revenue and profit margins."
        },
        {
          name: "Growth Forecasting",
          description: "Predictive analytics to help plan business expansion and investment decisions."
        }
      ]
    },
    {
      title: "Marketing & Growth",
      description: "Automated marketing tools to attract and retain premium clients",
      icon: RocketLaunchIcon,
      color: "text-red-400",
      features: [
        {
          name: "Email & SMS Campaigns",
          description: "Automated marketing sequences to nurture leads and encourage repeat bookings."
        },
        {
          name: "Social Media Integration",
          description: "Sync with social platforms to showcase your work and attract new clients."
        },
        {
          name: "Review Management",
          description: "Automated review requests and reputation management to build social proof."
        },
        {
          name: "Google My Business Sync",
          description: "Keep your business information updated across Google services automatically."
        }
      ]
    }
  ]

  const benefits = [
    {
      icon: ClockIcon,
      title: "Save 15+ Hours Weekly",
      description: "Automate scheduling, payments, and admin tasks to focus on what you do best - barbering."
    },
    {
      icon: TrophyIcon, 
      title: "Increase Revenue 47%",
      description: "Our clients see an average 47% revenue increase within 90 days using our optimization tools."
    },
    {
      icon: StarIcon,
      title: "Improve Client Retention",
      description: "Build stronger relationships with automated follow-ups and personalized service tracking."
    },
    {
      icon: ShieldCheckIcon,
      title: "Enterprise Security", 
      description: "Bank-level security protects your business and client data with 99.9% uptime guarantee."
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
              <Link href="/pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</Link>
              <Link href="/features" className="text-teal-400 font-semibold">Features</Link>
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
            <Badge className="mb-6 bg-teal-400 text-gray-900 px-4 py-2">
              Six Figure Barber Platform
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Everything You Need to <span className="text-teal-400">Scale Your Business</span>
            </h1>
            <p className="text-xl text-gray-300 mb-12">
              Our comprehensive platform combines proven business tools with the 
              <strong className="text-teal-400"> Six Figure Barber methodology</strong> to transform
              your barbershop into a premium, scalable business.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Overview */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {benefits.map((benefit, index) => (
              <Card key={index} className="border border-gray-600 bg-gray-800/50 backdrop-blur-sm text-center">
                <CardHeader>
                  <benefit.icon className="w-12 h-12 text-teal-400 mx-auto mb-4" />
                  <CardTitle className="text-white text-lg">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-sm">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Categories */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="space-y-20">
            {featureCategories.map((category, categoryIndex) => (
              <div key={categoryIndex} className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                  <category.icon className={`w-16 h-16 ${category.color} mx-auto mb-6`} />
                  <h2 className="text-4xl font-bold text-white mb-4">{category.title}</h2>
                  <p className="text-xl text-gray-300 max-w-2xl mx-auto">{category.description}</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {category.features.map((feature, featureIndex) => (
                    <Card key={featureIndex} className="border border-gray-600 bg-gray-800/30 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-white text-lg flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${category.color.replace('text-', 'bg-')}`}></div>
                          <span>{feature.name}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-300">{feature.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile App Section */}
      <section className="py-20 bg-gray-800/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <DevicePhoneMobileIcon className="w-16 h-16 text-teal-400 mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-white mb-6">Mobile-First Design</h2>
            <p className="text-xl text-gray-300 mb-8">
              Manage your business on the go with our mobile-optimized platform. 
              Everything works perfectly on your phone or tablet.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gray-700/50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">Responsive Design</h3>
                <p className="text-gray-300 text-sm">Full functionality on any device, anywhere, anytime</p>
              </div>
              <div className="bg-gray-700/50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">Offline Capability</h3>
                <p className="text-gray-300 text-sm">Core features work even when you're offline</p>
              </div>
              <div className="bg-gray-700/50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">Touch Optimized</h3>
                <p className="text-gray-300 text-sm">Designed for touch interactions and mobile workflows</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-white mb-6">Seamless Integrations</h2>
            <p className="text-xl text-gray-300 mb-12">
              Connect with the tools you already use to create a unified business ecosystem.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                "Google Calendar", "QuickBooks", "Stripe", "Mailchimp", 
                "Instagram", "Facebook", "Google My Business", "Yelp"
              ].map((integration, index) => (
                <div key={index} className="bg-gray-800/50 p-4 rounded-lg">
                  <div className="text-white font-semibold">{integration}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-20 bg-gray-800/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <ShieldCheckIcon className="w-16 h-16 text-green-400 mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-white mb-6">Enterprise-Grade Security</h2>
            <p className="text-xl text-gray-300 mb-12">
              Your business and client data is protected with the highest security standards.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400 mb-2">256-bit</div>
                <div className="text-gray-300 text-sm">SSL Encryption</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400 mb-2">99.9%</div>
                <div className="text-gray-300 text-sm">Uptime SLA</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400 mb-2">PCI</div>
                <div className="text-gray-300 text-sm">Compliant</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400 mb-2">24/7</div>
                <div className="text-gray-300 text-sm">Monitoring</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-teal-600 to-teal-800">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Transform Your Business?</h2>
          <p className="text-xl text-teal-100 mb-8">
            See how these powerful features can help you build your six-figure barbering business
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white text-teal-800 hover:bg-gray-100 font-bold px-8 py-4">
              <Link href="/register">Start Your Free Trial</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-teal-800 px-8 py-4">
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
          <div className="mt-6 text-teal-200 text-sm">
            14-day free trial • No credit card required • Setup in minutes
          </div>
        </div>
      </section>
    </div>
  )
}