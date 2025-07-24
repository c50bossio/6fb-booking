import { Metadata } from 'next'

interface SEOProps {
  title?: string
  description?: string
  keywords?: string[]
  author?: string
  image?: string
  url?: string
  type?: 'website' | 'article' | 'profile' | 'product'
  publishedTime?: string
  modifiedTime?: string
  section?: string
  tags?: string[]
  locale?: string
  alternateLocales?: string[]
  noindex?: boolean
  nofollow?: boolean
  canonical?: string
  jsonLd?: any
}

const DEFAULT_TITLE = 'Booked Barber - Own The Chair. Own The Brand.'
const DEFAULT_DESCRIPTION = 'Professional booking and business management platform for barbershops. Built on the Six Figure Barber methodology. Maximize revenue, build your brand, and grow your business.'
const DEFAULT_KEYWORDS = [
  'barbershop booking',
  'barber appointment',
  'barbershop management',
  'six figure barber',
  'barber business',
  'booking platform',
  'appointment scheduling',
  'barber software',
  'salon management',
  'booked barber'
]
const DEFAULT_AUTHOR = 'Booked Barber Team'
const DEFAULT_IMAGE = '/images/og-image.png'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bookedbarber.com'

export function generateMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  author = DEFAULT_AUTHOR,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  publishedTime,
  modifiedTime,
  section,
  tags = [],
  locale = 'en_US',
  alternateLocales = [],
  noindex = false,
  nofollow = false,
  canonical,
  jsonLd
}: SEOProps): Metadata {
  const fullTitle = title ? `${title} | Booked Barber` : DEFAULT_TITLE
  const fullUrl = url ? `${SITE_URL}${url}` : SITE_URL
  const fullImage = image.startsWith('http') ? image : `${SITE_URL}${image}`
  const canonicalUrl = canonical || fullUrl

  // Combine default and custom keywords
  const allKeywords = Array.from(new Set([...keywords, ...DEFAULT_KEYWORDS]))

  return {
    title: fullTitle,
    description,
    keywords: allKeywords.join(', '),
    authors: [{ name: author }],
    creator: 'Booked Barber',
    publisher: 'Booked Barber',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: canonicalUrl,
      languages: alternateLocales.reduce((acc, locale) => {
        acc[locale] = `${fullUrl}?lang=${locale}`
        return acc
      }, {} as Record<string, string>)
    },
    openGraph: {
      title: fullTitle,
      description,
      url: fullUrl,
      siteName: 'Booked Barber',
      images: [
        {
          url: fullImage,
          width: 1200,
          height: 630,
          alt: fullTitle,
        }
      ],
      locale,
      type,
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(section && { section }),
      ...(tags.length > 0 && { tags }),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [fullImage],
      creator: '@bookedbarber',
      site: '@bookedbarber',
    },
    robots: {
      index: !noindex,
      follow: !nofollow,
      googleBot: {
        index: !noindex,
        follow: !nofollow,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
      yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
      yahoo: process.env.NEXT_PUBLIC_YAHOO_VERIFICATION,
    },
    category: 'Business Software',
    classification: 'Business/Barbershop Management',
    ...(jsonLd && {
      other: {
        'application-name': 'Booked Barber',
        'msapplication-TileColor': '#000000',
        'msapplication-TileImage': '/mstile-144x144.png',
        'msapplication-config': '/browserconfig.xml',
      }
    })
  }
}

// JSON-LD structured data generator
export function generateJsonLd(type: string, data: any) {
  const baseOrganization = {
    '@type': 'Organization',
    name: 'Booked Barber',
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo.png`,
    sameAs: [
      'https://twitter.com/bookedbarber',
      'https://facebook.com/bookedbarber',
      'https://instagram.com/bookedbarber',
      'https://linkedin.com/company/bookedbarber'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-800-BOOKED',
      contactType: 'customer service',
      availableLanguage: ['English'],
      areaServed: 'US',
    }
  }

  switch (type) {
    case 'website':
      return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Booked Barber',
        url: SITE_URL,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        },
        publisher: baseOrganization
      }

    case 'software':
      return {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Booked Barber',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '29',
          priceCurrency: 'USD',
          priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          ratingCount: '1247',
          bestRating: '5',
          worstRating: '1'
        },
        ...data
      }

    case 'faq':
      return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: data.questions?.map((q: any) => ({
          '@type': 'Question',
          name: q.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: q.answer
          }
        })) || []
      }

    case 'breadcrumb':
      return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: data.items?.map((item: any, index: number) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: `${SITE_URL}${item.url}`
        })) || []
      }

    case 'local-business':
      return {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: data.name,
        image: data.image,
        '@id': data.id || SITE_URL,
        url: data.url || SITE_URL,
        telephone: data.phone,
        priceRange: data.priceRange || '$$',
        address: {
          '@type': 'PostalAddress',
          streetAddress: data.streetAddress,
          addressLocality: data.city,
          addressRegion: data.state,
          postalCode: data.zip,
          addressCountry: 'US'
        },
        geo: data.geo || {},
        openingHoursSpecification: data.hours || [],
        ...data
      }

    default:
      return {
        '@context': 'https://schema.org',
        ...data
      }
  }
}

// Social media meta tags component
export function SocialMetaTags({ 
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url = SITE_URL,
  type = 'website'
}: SEOProps) {
  const fullImage = image.startsWith('http') ? image : `${SITE_URL}${image}`
  
  return (
    <>
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Booked Barber" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
      <meta name="twitter:site" content="@bookedbarber" />
      
      {/* LinkedIn */}
      <meta property="og:linkedin:title" content={title} />
      <meta property="og:linkedin:description" content={description} />
      
      {/* Pinterest */}
      <meta property="og:pinterest:title" content={title} />
      <meta property="og:pinterest:description" content={description} />
    </>
  )
}

// Structured data script component
export function StructuredData({ data }: { data: any }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}