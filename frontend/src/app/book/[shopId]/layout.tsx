import { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface BookingLayoutProps {
  children: React.ReactNode
  params: { shopId: string }
}

export async function generateMetadata({ params }: { params: { shopId: string } }): Promise<Metadata> {
  try {
    // For server-side rendering, we need to make a direct API call
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const response = await fetch(`${apiBaseUrl}/api/v1/booking/public/shops/${params.shopId}`)

    if (!response.ok) {
      throw new Error('Failed to fetch location')
    }

    const location = await response.json()

    return {
      title: `Book Appointment - ${location.name} | Professional Barbershop`,
      description: `Book your appointment at ${location.name}. Professional barbershop services in ${location.city}, ${location.state}. Easy online booking, skilled barbers, and great service.`,
      keywords: [
        'barbershop',
        'appointment booking',
        'haircut',
        'barber',
        location.city,
        location.state,
        location.name,
        'men\'s grooming',
        'professional barber services'
      ],
      openGraph: {
        title: `Book at ${location.name} - Professional Barbershop`,
        description: `Book your appointment at ${location.name}. Professional barbershop services in ${location.city}, ${location.state}.`,
        type: 'website',
        locale: 'en_US',
        siteName: 'Six FB Booking',
        images: [
          {
            url: '/images/barbershop-og.jpg', // Add actual image
            width: 1200,
            height: 630,
            alt: `${location.name} - Professional Barbershop`
          }
        ]
      },
      twitter: {
        card: 'summary_large_image',
        title: `Book at ${location.name} - Professional Barbershop`,
        description: `Book your appointment at ${location.name}. Professional barbershop services in ${location.city}, ${location.state}.`,
        images: ['/images/barbershop-twitter.jpg'] // Add actual image
      },
      alternates: {
        canonical: `/book/${params.shopId}`
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1
        }
      },
      other: {
        'business:contact_data:street_address': location.address,
        'business:contact_data:locality': location.city,
        'business:contact_data:region': location.state,
        'business:contact_data:postal_code': location.zip_code || '',
        'business:contact_data:country_name': 'United States'
      }
    }
  } catch (error) {
    return {
      title: 'Book Appointment | Professional Barbershop',
      description: 'Book your appointment at our professional barbershop. Easy online booking, skilled barbers, and great service.',
      robots: {
        index: false,
        follow: false
      }
    }
  }
}

export default function BookingLayout({ children, params }: BookingLayoutProps) {
  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            '@id': `https://yourdomain.com/book/${params.shopId}`,
            name: 'Professional Barbershop',
            description: 'Professional barbershop services with online booking',
            url: `https://yourdomain.com/book/${params.shopId}`,
            telephone: '+1-555-0123', // Dynamic from location data
            address: {
              '@type': 'PostalAddress',
              streetAddress: '123 Main Street', // Dynamic from location data
              addressLocality: 'City', // Dynamic from location data
              addressRegion: 'State', // Dynamic from location data
              postalCode: '12345', // Dynamic from location data
              addressCountry: 'US'
            },
            geo: {
              '@type': 'GeoCoordinates',
              latitude: '40.7128', // Dynamic from location data
              longitude: '-74.0060' // Dynamic from location data
            },
            openingHours: [
              'Mo-Fr 09:00-20:00',
              'Sa 09:00-18:00',
              'Su 10:00-17:00'
            ], // Dynamic from business hours
            priceRange: '$$',
            acceptsReservations: true,
            hasOfferCatalog: {
              '@type': 'OfferCatalog',
              name: 'Barbershop Services',
              itemListElement: [
                {
                  '@type': 'Offer',
                  itemOffered: {
                    '@type': 'Service',
                    name: 'Haircut',
                    description: 'Professional haircut service'
                  }
                },
                {
                  '@type': 'Offer',
                  itemOffered: {
                    '@type': 'Service',
                    name: 'Beard Trim',
                    description: 'Professional beard trimming service'
                  }
                }
              ]
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.8',
              reviewCount: '150'
            }
          })
        }}
      />
      {children}
    </>
  )
}
