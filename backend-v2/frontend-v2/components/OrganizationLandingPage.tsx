"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CalendarDays, Scissors, Star, MapPin } from 'lucide-react'

interface OrganizationLandingPageProps {
  slug: string
}

export default function OrganizationLandingPage({ slug }: OrganizationLandingPageProps) {
  // This would typically fetch organization data based on slug
  const organizationData = {
    name: `${slug.charAt(0).toUpperCase() + slug.slice(1)} Barbershop`,
    description: "Professional barbering services with the Six Figure Barber methodology",
    services: [
      { name: "Classic Cut", price: "$35", duration: "30 min" },
      { name: "Beard Trim", price: "$20", duration: "15 min" },
      { name: "Full Service", price: "$50", duration: "45 min" }
    ],
    rating: 4.8,
    reviewCount: 127,
    location: "Downtown Location",
    hours: "Mon-Sat: 9AM-7PM, Sun: 10AM-5PM"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Scissors className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              {organizationData.name}
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">
            {organizationData.description}
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{organizationData.rating}</span>
              <span>({organizationData.reviewCount} reviews)</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{organizationData.location}</span>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {organizationData.services.map((service, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {service.name}
                  <Badge variant="secondary">{service.duration}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary">{service.price}</span>
                  <Button>Book Now</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-8 text-center">
            <CalendarDays className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Ready to Book Your Appointment?</h2>
            <p className="text-lg mb-6 opacity-90">
              Experience the Six Figure Barber difference. Professional service, premium results.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary">
                Book Online
              </Button>
              <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                Call Now
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Business Hours */}
        <div className="mt-12 text-center">
          <h3 className="text-lg font-semibold mb-2">Business Hours</h3>
          <p className="text-gray-600 dark:text-gray-400">{organizationData.hours}</p>
        </div>
      </div>
    </div>
  )
}