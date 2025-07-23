'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  TrophyIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon,
  UserGroupIcon,
  LightBulbIcon,
  ScissorsIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const principles = [
  {
    icon: CurrencyDollarIcon,
    title: "Value-Based Pricing",
    description: "Price services based on the value delivered to clients, not time spent"
  },
  {
    icon: UserGroupIcon,
    title: "Client Relationship Focus", 
    description: "Build long-term relationships that drive repeat business and referrals"
  },
  {
    icon: TrophyIcon,
    title: "Premium Positioning",
    description: "Position yourself as a premium service provider, not a commodity"
  },
  {
    icon: ChartBarIcon,
    title: "Business Systems",
    description: "Implement scalable systems that work without constant oversight"
  },
  {
    icon: LightBulbIcon,
    title: "Continuous Innovation",
    description: "Constantly evolve services and offerings to stay ahead of competition"
  }
]

const stats = [
  {
    icon: TrophyIcon,
    value: "10,000+",
    label: "Successful Barbers"
  },
  {
    icon: CurrencyDollarIcon,
    value: "$150K+",
    label: "Average Annual Revenue"
  },
  {
    icon: StarIcon,
    value: "98%",
    label: "Client Satisfaction"
  },
  {
    icon: ChartBarIcon,
    value: "300%",
    label: "Average Growth"
  }
]

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div 
            className="text-center"
            initial="initial"
            animate="animate"
            variants={fadeInUp}
          >
            <motion.h1 
              className="text-4xl md:text-6xl font-bold mb-6"
              variants={fadeInUp}
            >
              <span className="text-yellow-400">OWN</span> THE CHAIR.<br/>
              <span className="text-yellow-400">OWN</span> THE BRAND.<br/>
              <span className="text-yellow-400">OWN</span> THE FUTURE.
            </motion.h1>
            <motion.p 
              className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed"
              variants={fadeInUp}
            >
              BookedBarber is built on the proven Six Figure Barber methodology—transforming 
              traditional barbering into a scalable, profitable business model capable of 
              generating six-figure annual revenues.
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* Mission Statement */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
              Our Mission
            </h2>
            <div className="max-w-4xl mx-auto">
              <p className="text-xl text-gray-700 leading-relaxed mb-8">
                We believe barbers are not just service providers—they are <strong>entrepreneurs</strong>, 
                <strong> artists</strong>, and <strong>business owners</strong>. Our platform empowers 
                barbers to transform their craft from a traditional trade into a scalable, 
                profitable business that creates lasting value for both barbers and their clients.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  <ScissorsIcon className="w-5 h-5 mr-2" />
                  Craftsmanship
                </Badge>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  <TrophyIcon className="w-5 h-5 mr-2" />
                  Excellence
                </Badge>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  <ChartBarIcon className="w-5 h-5 mr-2" />
                  Growth
                </Badge>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  <LightBulbIcon className="w-5 h-5 mr-2" />
                  Innovation
                </Badge>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Success Stats */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Proven Results
            </h2>
            <p className="text-xl text-gray-600">
              Our methodology has helped thousands of barbers achieve financial success
            </p>
          </motion.div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                className="text-center"
              >
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-yellow-200 hover:border-yellow-400 transition-colors">
                  <stat.icon className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-gray-600 font-medium">
                    {stat.label}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Core Principles */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Six Figure Barber Principles
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Every feature of BookedBarber is designed around these proven business principles 
              that transform traditional barbering into a thriving enterprise
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {principles.map((principle, index) => (
              <motion.div
                key={principle.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow border-l-4 border-l-yellow-400">
                  <CardHeader>
                    <principle.icon className="w-12 h-12 text-yellow-600 mb-4" />
                    <CardTitle className="text-xl font-bold text-gray-900">
                      {principle.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed">
                      {principle.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Platform Features */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Built for Success
            </h2>
            <p className="text-xl text-gray-600">
              Every feature is designed to support the Six Figure Barber methodology
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="text-center h-full">
                <CardHeader>
                  <ChartBarIcon className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    Revenue Optimization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">
                    Advanced analytics, dynamic pricing, and service mix optimization 
                    to maximize your revenue per client and overall profitability.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.6 }}
            >
              <Card className="text-center h-full">
                <CardHeader>
                  <UserGroupIcon className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    Client Relationship Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">
                    Comprehensive client profiles, automated communications, and 
                    personalized service tracking to build lasting relationships.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <Card className="text-center h-full">
                <CardHeader>
                  <LightBulbIcon className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    Business Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">
                    Real-time insights, performance tracking, and growth analytics 
                    to make data-driven decisions and scale your business.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="py-16 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Build Your <span className="text-yellow-400">Six Figure</span> Business?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Join thousands of successful barbers who have transformed their careers 
              with the proven Six Figure Barber methodology.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
                <Link href="/register">
                  Start Your Journey Today
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-black">
                <Link href="/book">
                  Schedule a Demo
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}