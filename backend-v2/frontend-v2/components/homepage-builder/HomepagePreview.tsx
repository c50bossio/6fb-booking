"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Star, Phone, Mail, MapPin, Clock, ExternalLink } from 'lucide-react'

import { HomepageBuilderConfig } from './HomepageBuilderContext'

interface HomepagePreviewProps {
  config: HomepageBuilderConfig
  deviceMode?: 'desktop' | 'tablet' | 'mobile'
  showFrame?: boolean
}

export function HomepagePreview({ config, deviceMode = 'desktop', showFrame = false }: HomepagePreviewProps) {
  const visibleSections = config.sections
    .filter(section => section.visible)
    .sort((a, b) => a.order - b.order)

  const renderHeroSection = (section: any) => {
    const heroConfig = section.hero
    if (!heroConfig) return null

    return (
      <section 
        className="relative min-h-screen flex items-center justify-center text-white overflow-hidden"
        style={{
          backgroundColor: heroConfig.background_color || config.branding.background_color,
          fontFamily: config.branding.font_family
        }}
      >
        {/* Background */}
        {heroConfig.background_media_url && heroConfig.background_type === 'image' && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroConfig.background_media_url})` }}
          />
        )}
        
        {/* Overlay */}
        <div 
          className="absolute inset-0 bg-black"
          style={{ opacity: heroConfig.overlay_opacity }}
        />

        {/* Content */}
        <div className={`relative z-10 max-w-4xl mx-auto px-6 text-${heroConfig.text_alignment}`}>
          {heroConfig.title && (
            <h1 
              className="text-5xl md:text-7xl font-bold mb-6"
              style={{ 
                fontFamily: config.branding.heading_font || config.branding.font_family,
                color: config.branding.text_color
              }}
            >
              {heroConfig.title}
            </h1>
          )}
          
          {heroConfig.subtitle && (
            <h2 className="text-xl md:text-2xl mb-8 opacity-90">
              {heroConfig.subtitle}
            </h2>
          )}
          
          {heroConfig.description && (
            <p className="text-lg mb-12 opacity-80 max-w-2xl mx-auto">
              {heroConfig.description}
            </p>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              style={{
                backgroundColor: config.branding.primary_color,
                color: config.branding.text_color,
                borderRadius: 
                  config.branding.border_radius === 'none' ? '0px' :
                  config.branding.border_radius === 'small' ? '2px' :
                  config.branding.border_radius === 'medium' ? '6px' :
                  config.branding.border_radius === 'large' ? '12px' :
                  config.branding.border_radius === 'full' ? '9999px' : '6px'
              }}
            >
              {heroConfig.cta_text}
            </Button>
            {heroConfig.cta_secondary_text && (
              <Button 
                variant="outline" 
                size="lg"
                style={{
                  borderColor: config.branding.accent_color,
                  color: config.branding.accent_color
                }}
              >
                {heroConfig.cta_secondary_text}
              </Button>
            )}
          </div>

          {/* Quick Stats */}
          {heroConfig.show_quick_stats && (
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: config.branding.accent_color }}>500+</div>
                <div className="text-sm opacity-80">Happy Clients</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: config.branding.accent_color }}>5+</div>
                <div className="text-sm opacity-80">Years Experience</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: config.branding.accent_color }}>4.9</div>
                <div className="text-sm opacity-80">Average Rating</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: config.branding.accent_color }}>24/7</div>
                <div className="text-sm opacity-80">Online Booking</div>
              </div>
            </div>
          )}

          {/* Rating */}
          {heroConfig.show_rating && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-sm opacity-90">4.9/5 from 127 reviews</span>
            </div>
          )}
        </div>
      </section>
    )
  }

  const renderServicesSection = (section: any) => {
    const servicesConfig = section.services
    if (!servicesConfig) return null

    const mockServices = [
      { name: 'Classic Cut', price: 30, duration: 30, description: 'Traditional barbershop haircut' },
      { name: 'Beard Trim', price: 20, duration: 20, description: 'Professional beard shaping' },
      { name: 'Hot Towel Shave', price: 40, duration: 45, description: 'Luxurious traditional shave' },
      { name: 'Hair & Beard Combo', price: 45, duration: 50, description: 'Complete grooming package' }
    ]

    return (
      <section className="py-20 px-6" style={{ backgroundColor: '#fafafa' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 
              className="text-4xl font-bold mb-4"
              style={{ 
                fontFamily: config.branding.heading_font || config.branding.font_family,
                color: config.branding.primary_color
              }}
            >
              {servicesConfig.title}
            </h2>
            {servicesConfig.description && (
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {servicesConfig.description}
              </p>
            )}
          </div>

          <div className={`grid gap-8 ${
            servicesConfig.layout === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' :
            servicesConfig.layout === 'two_column' ? 'grid-cols-1 md:grid-cols-2' :
            'grid-cols-1'
          }`}>
            {mockServices.slice(0, servicesConfig.max_services_display).map((service, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-2" style={{ color: config.branding.primary_color }}>
                    {service.name}
                  </h3>
                  {servicesConfig.show_description && (
                    <p className="text-gray-600 mb-4">{service.description}</p>
                  )}
                  <div className="flex justify-between items-center mb-4">
                    {servicesConfig.show_pricing && (
                      <span className="text-2xl font-bold" style={{ color: config.branding.accent_color }}>
                        ${service.price}
                      </span>
                    )}
                    {servicesConfig.show_duration && (
                      <span className="text-sm text-gray-500">{service.duration} min</span>
                    )}
                  </div>
                  {servicesConfig.enable_service_booking && (
                    <Button 
                      className="w-full"
                      style={{
                        backgroundColor: config.branding.primary_color,
                        color: config.branding.text_color
                      }}
                    >
                      Book Now
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    )
  }

  const renderAboutSection = (section: any) => {
    const aboutConfig = section.about
    if (!aboutConfig) return null

    return (
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className={`grid gap-12 ${aboutConfig.layout === 'two_column' ? 'lg:grid-cols-2' : 'grid-cols-1'} items-center`}>
            <div>
              <h2 
                className="text-4xl font-bold mb-6"
                style={{ 
                  fontFamily: config.branding.heading_font || config.branding.font_family,
                  color: config.branding.primary_color
                }}
              >
                {aboutConfig.title}
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                {aboutConfig.content || "We are a premier barbershop committed to providing exceptional grooming services. Our skilled barbers combine traditional techniques with modern styles to deliver the perfect cut every time."}
              </p>
              
              {aboutConfig.highlight_stats.length > 0 && (
                <div className="grid grid-cols-2 gap-6">
                  {aboutConfig.highlight_stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <div className="text-3xl font-bold mb-2" style={{ color: config.branding.accent_color }}>
                        {stat.value}
                      </div>
                      <div className="text-sm text-gray-600">{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {aboutConfig.image_url && (
              <div>
                <img 
                  src={aboutConfig.image_url} 
                  alt="About us" 
                  className="w-full h-96 object-cover rounded-lg shadow-lg"
                />
              </div>
            )}
          </div>
        </div>
      </section>
    )
  }

  const renderTestimonialsSection = (section: any) => {
    const testimonialsConfig = section.testimonials
    if (!testimonialsConfig) return null

    const mockTestimonials = [
      { name: 'Mike Johnson', rating: 5, text: 'Best haircut I\'ve ever had! Professional and friendly service every time.', photo: null },
      { name: 'Sarah Williams', rating: 5, text: 'Amazing attention to detail. I always leave feeling confident and looking great!', photo: null },
      { name: 'David Brown', rating: 5, text: 'Consistently excellent service. The barbers really know their craft.', photo: null }
    ]

    return (
      <section className="py-20 px-6" style={{ backgroundColor: '#f8f9fa' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 
              className="text-4xl font-bold mb-4"
              style={{ 
                fontFamily: config.branding.heading_font || config.branding.font_family,
                color: config.branding.primary_color
              }}
            >
              {testimonialsConfig.title}
            </h2>
          </div>

          <div className={`grid gap-8 ${
            testimonialsConfig.layout === 'grid' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'
          }`}>
            {mockTestimonials.slice(0, testimonialsConfig.max_testimonials).map((testimonial, index) => (
              <Card key={index} className="text-center">
                <CardContent className="p-6">
                  {testimonialsConfig.show_rating_stars && (
                    <div className="flex justify-center mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  )}
                  <p className="text-gray-600 mb-4 italic">"{testimonial.text}"</p>
                  <div className="flex items-center justify-center gap-3">
                    {testimonialsConfig.show_reviewer_photos && (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">{testimonial.name.charAt(0)}</span>
                      </div>
                    )}
                    <span className="font-medium" style={{ color: config.branding.primary_color }}>
                      {testimonial.name}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    )
  }

  const renderContactSection = (section: any) => {
    const contactConfig = section.contact
    if (!contactConfig) return null

    return (
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 
              className="text-4xl font-bold mb-4"
              style={{ 
                fontFamily: config.branding.heading_font || config.branding.font_family,
                color: config.branding.primary_color
              }}
            >
              {contactConfig.title}
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              {contactConfig.show_address && (
                <div className="flex items-start gap-4">
                  <MapPin className="h-6 w-6 mt-1" style={{ color: config.branding.accent_color }} />
                  <div>
                    <h3 className="font-semibold mb-1">Address</h3>
                    <p className="text-gray-600">123 Main Street<br />Downtown, City 12345</p>
                  </div>
                </div>
              )}

              {contactConfig.show_phone && (
                <div className="flex items-start gap-4">
                  <Phone className="h-6 w-6 mt-1" style={{ color: config.branding.accent_color }} />
                  <div>
                    <h3 className="font-semibold mb-1">Phone</h3>
                    <p className="text-gray-600">(555) 123-4567</p>
                  </div>
                </div>
              )}

              {contactConfig.show_email && (
                <div className="flex items-start gap-4">
                  <Mail className="h-6 w-6 mt-1" style={{ color: config.branding.accent_color }} />
                  <div>
                    <h3 className="font-semibold mb-1">Email</h3>
                    <p className="text-gray-600">info@yourbarbershop.com</p>
                  </div>
                </div>
              )}

              {contactConfig.show_hours && (
                <div className="flex items-start gap-4">
                  <Clock className="h-6 w-6 mt-1" style={{ color: config.branding.accent_color }} />
                  <div>
                    <h3 className="font-semibold mb-1">Hours</h3>
                    <div className="text-gray-600">
                      <p>Mon - Fri: 9:00 AM - 7:00 PM</p>
                      <p>Saturday: 8:00 AM - 6:00 PM</p>
                      <p>Sunday: 10:00 AM - 4:00 PM</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {contactConfig.show_map && (
              <div className="bg-gray-200 rounded-lg h-80 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MapPin className="h-12 w-12 mx-auto mb-2" />
                  <p>Interactive Map</p>
                  <p className="text-sm">({contactConfig.map_style} style)</p>
                </div>
              </div>
            )}
          </div>

          {contactConfig.show_contact_form && (
            <div className="mt-16 max-w-2xl mx-auto">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-2xl font-semibold mb-6 text-center">Send us a message</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <input className="border rounded px-3 py-2" placeholder="Name" />
                      <input className="border rounded px-3 py-2" placeholder="Email" />
                    </div>
                    <textarea className="w-full border rounded px-3 py-2" rows={4} placeholder="Message" />
                    <Button 
                      className="w-full"
                      style={{
                        backgroundColor: config.branding.primary_color,
                        color: config.branding.text_color
                      }}
                    >
                      Send Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>
    )
  }

  const renderGallerySection = (section: any) => {
    const galleryConfig = section.gallery
    if (!galleryConfig) return null

    const mockImages = [
      'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400',
      'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400',
      'https://images.unsplash.com/photo-1622286346003-c8b4ee72e8d8?w=400',
      'https://images.unsplash.com/photo-1603001368725-2dc43d5b7cc1?w=400',
      'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=400',
      'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400'
    ]

    return (
      <section className="py-20 px-6" style={{ backgroundColor: '#f8f9fa' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 
              className="text-4xl font-bold mb-4"
              style={{ 
                fontFamily: config.branding.heading_font || config.branding.font_family,
                color: config.branding.primary_color
              }}
            >
              {galleryConfig.title}
            </h2>
            {galleryConfig.description && (
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {galleryConfig.description}
              </p>
            )}
          </div>

          <div className={`grid gap-4 ${
            galleryConfig.layout === 'grid' ? 'grid-cols-2 md:grid-cols-3' :
            galleryConfig.layout === 'masonry' ? 'columns-2 md:columns-3' :
            'grid-cols-1'
          }`}>
            {mockImages.slice(0, galleryConfig.max_images).map((image, index) => (
              <div key={index} className="relative overflow-hidden rounded-lg group cursor-pointer">
                <img 
                  src={image} 
                  alt={`Gallery image ${index + 1}`}
                  className="w-full h-60 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {galleryConfig.enable_lightbox && (
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                    <ExternalLink className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className={`w-full h-full ${showFrame ? 'border rounded-lg overflow-hidden' : ''}`}>
      <div 
        className="w-full min-h-full"
        style={{ 
          fontFamily: config.branding.font_family,
          fontSize: deviceMode === 'mobile' ? '14px' : deviceMode === 'tablet' ? '15px' : '16px'
        }}
      >
        {visibleSections.map((section, index) => {
          switch (section.section_type) {
            case 'hero':
              return <div key={index}>{renderHeroSection(section)}</div>
            case 'services':
              return <div key={index}>{renderServicesSection(section)}</div>
            case 'about':
              return <div key={index}>{renderAboutSection(section)}</div>
            case 'testimonials':
              return <div key={index}>{renderTestimonialsSection(section)}</div>
            case 'contact':
              return <div key={index}>{renderContactSection(section)}</div>
            case 'gallery':
              return <div key={index}>{renderGallerySection(section)}</div>
            default:
              return null
          }
        })}
        
        {visibleSections.length === 0 && (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">No sections enabled</h2>
              <p className="text-gray-600">Add and configure sections to see your homepage preview</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}