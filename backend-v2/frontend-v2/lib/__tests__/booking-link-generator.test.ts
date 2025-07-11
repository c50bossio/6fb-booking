/**
 * Booking Link Generator Tests
 * 
 * Comprehensive test suite for the booking link generation utilities
 */

import {
  BookingLinkGenerator,
  generateBookingURL,
  parseBookingURL,
  validateBookingParams,
  generateCommonBookingLinks,
  generateCampaignBookingLinks,
  URLEncoder,
  SimpleURLShortener,
} from '../booking-link-generator'

import {
  BookingLinkParams,
  ServiceInfo,
  BarberInfo,
  ValidationConstraints,
} from '../../types/booking-links'

// Mock data
const mockServices: ServiceInfo[] = [
  {
    id: 1,
    name: 'Haircut',
    slug: 'haircut',
    duration: 30,
    price: 30,
    category: 'hair',
    isActive: true,
  },
  {
    id: 2,
    name: 'Shave',
    slug: 'shave',
    duration: 20,
    price: 20,
    category: 'shave',
    isActive: true,
  },
  {
    id: 3,
    name: 'Haircut & Shave',
    slug: 'haircut-shave',
    duration: 45,
    price: 45,
    category: 'combo',
    isActive: true,
  },
]

const mockBarbers: BarberInfo[] = [
  {
    id: 1,
    name: 'John Doe',
    slug: 'john-doe',
    email: 'john@example.com',
    isActive: true,
    services: [1, 2, 3],
    timezone: 'America/New_York',
  },
  {
    id: 2,
    name: 'Jane Smith',
    slug: 'jane-smith',
    email: 'jane@example.com',
    isActive: true,
    services: [1, 3],
    timezone: 'America/New_York',
  },
]

describe('BookingLinkGenerator', () => {
  let generator: BookingLinkGenerator

  beforeEach(() => {
    generator = new BookingLinkGenerator()
    generator.setServices(mockServices)
    generator.setBarbers(mockBarbers)
  })

  describe('generateURL', () => {
    it('should generate basic booking URL', () => {
      const url = generator.generateURL({})
      expect(url).toBe('https://bookedbarber.com/{slug}')
    })

    it('should generate URL with service parameter', () => {
      const url = generator.generateURL({ service: 'haircut' })
      expect(url).toBe('https://bookedbarber.com/{slug}?service=haircut')
    })

    it('should generate URL with multiple parameters', () => {
      const params: BookingLinkParams = {
        service: 'haircut',
        barber: 'john-doe',
        date: '2025-07-01',
        time: '10:00',
      }
      const url = generator.generateURL(params)
      expect(url).toContain('service=haircut')
      expect(url).toContain('barber=john-doe')
      expect(url).toContain('date=2025-07-01')
      expect(url).toContain('time=10%3A00')
    })

    it('should handle array parameters', () => {
      const params: BookingLinkParams = {
        service: ['haircut', 'shave'],
        barber: ['john-doe', 'jane-smith'],
      }
      const url = generator.generateURL(params)
      expect(url).toContain('service=haircut%2Cshave')
      expect(url).toContain('barber=john-doe%2Cjane-smith')
    })

    it('should omit empty parameters by default', () => {
      const params: BookingLinkParams = {
        service: 'haircut',
        barber: '',
        date: undefined,
      }
      const url = generator.generateURL(params)
      expect(url).toBe('https://bookedbarber.com/{slug}?service=haircut')
    })

    it('should include empty parameters when requested', () => {
      const params: BookingLinkParams = {
        service: 'haircut',
        barber: '',
      }
      const url = generator.generateURL(params, { omitEmpty: false })
      expect(url).toContain('barber=')
    })

    it('should handle UTM parameters', () => {
      const params: BookingLinkParams = {
        service: 'haircut',
        utm_source: 'facebook',
        utm_medium: 'social',
        utm_campaign: 'summer2025',
      }
      const url = generator.generateURL(params)
      expect(url).toContain('utm_source=facebook')
      expect(url).toContain('utm_medium=social')
      expect(url).toContain('utm_campaign=summer2025')
    })

    it('should handle date ranges', () => {
      const params: BookingLinkParams = {
        dateRange: '2025-07-01,2025-07-07',
      }
      const url = generator.generateURL(params)
      expect(url).toContain('dateRange=2025-07-01%2C2025-07-07')
    })

    it('should handle custom fields', () => {
      const params: BookingLinkParams = {
        service: 'haircut',
        custom: {
          referrer: 'friend',
          promo: 'SAVE20',
        },
      }
      const url = generator.generateURL(params)
      expect(url).toContain('custom=')
    })
  })

  describe('parseURL', () => {
    it('should parse basic URL', () => {
      const url = 'https://bookedbarber.com/{slug}'
      const parsed = generator.parseURL(url)
      expect(parsed.baseUrl).toBe('https://bookedbarber.com/{slug}')
      expect(parsed.params).toEqual({})
      expect(parsed.isValid).toBe(true)
    })

    it('should parse URL with parameters', () => {
      const url = 'https://bookedbarber.com/{slug}?service=haircut&barber=john-doe&date=2025-07-01&time=10:00'
      const parsed = generator.parseURL(url)
      expect(parsed.params.service).toBe('haircut')
      expect(parsed.params.barber).toBe('john-doe')
      expect(parsed.params.date).toBe('2025-07-01')
      expect(parsed.params.time).toBe('10:00')
    })

    it('should parse array parameters', () => {
      const url = 'https://bookedbarber.com/{slug}?service=haircut%2Cshave'
      const parsed = generator.parseURL(url)
      expect(parsed.params.service).toEqual(['haircut', 'shave'])
    })

    it('should handle URL with hash', () => {
      const url = 'https://bookedbarber.com/{slug}?service=haircut#step2'
      const parsed = generator.parseURL(url)
      expect(parsed.params.service).toBe('haircut')
      expect(parsed.hash).toBe('step2')
    })

    it('should handle malformed URLs', () => {
      const url = 'not-a-valid-url'
      const parsed = generator.parseURL(url)
      expect(parsed.isValid).toBe(false)
      expect(parsed.errors).toContain('Invalid URL format')
    })

    it('should parse numeric parameters', () => {
      const url = 'https://bookedbarber.com/{slug}?serviceId=1&duration=30&leadTime=24'
      const parsed = generator.parseURL(url)
      expect(parsed.params.serviceId).toBe(1)
      expect(parsed.params.duration).toBe(30)
      expect(parsed.params.leadTime).toBe(24)
    })

    it('should parse boolean parameters', () => {
      const url = 'https://bookedbarber.com/{slug}?recurring=true&quickBook=false'
      const parsed = generator.parseURL(url)
      expect(parsed.params.recurring).toBe(true)
      expect(parsed.params.quickBook).toBe(false)
    })
  })

  describe('validateParams', () => {
    it('should validate valid parameters', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30) // 30 days from now
      
      const params: BookingLinkParams = {
        service: 'haircut',
        barber: 'john-doe',
        date: futureDate.toISOString().split('T')[0], // YYYY-MM-DD format
        time: '10:00',
      }
      const result = generator.validateParams(params)
      
      // Debug: log errors if validation fails
      if (!result.isValid) {
        console.log('Validation errors:', result.errors)
      }
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate service existence', () => {
      const params: BookingLinkParams = {
        service: 'nonexistent-service',
      }
      const result = generator.validateParams(params)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Service does not exist: nonexistent-service')
    })

    it('should validate barber existence', () => {
      const params: BookingLinkParams = {
        barber: 'nonexistent-barber',
      }
      const result = generator.validateParams(params)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Barber does not exist: nonexistent-barber')
    })

    it('should validate date format', () => {
      const params: BookingLinkParams = {
        date: 'invalid-date',
      }
      const result = generator.validateParams(params)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid date format: invalid-date')
    })

    it('should validate future dates', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 30) // 30 days ago
      
      const params: BookingLinkParams = {
        date: pastDate.toISOString().split('T')[0], // YYYY-MM-DD format
      }
      const result = generator.validateParams(params)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(`Date must be in the future: ${pastDate.toISOString().split('T')[0]}`)
    })

    it('should validate time format', () => {
      const params: BookingLinkParams = {
        time: '25:00', // Invalid hour
      }
      const result = generator.validateParams(params)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid time format: 25:00')
    })

    it('should validate email format', () => {
      const params: BookingLinkParams = {
        email: 'invalid-email',
      }
      const result = generator.validateParams(params)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid email format: invalid-email')
    })

    it('should validate phone format', () => {
      const params: BookingLinkParams = {
        phone: 'invalid-phone',
      }
      const result = generator.validateParams(params)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid phone format: invalid-phone')
    })

    it('should validate date range', () => {
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 30) // 30 days from now
      const startDate = new Date()
      startDate.setDate(startDate.getDate() + 35) // 35 days from now (after end date)
      
      const dateRange = `${startDate.toISOString().split('T')[0]},${endDate.toISOString().split('T')[0]}`
      
      const params: BookingLinkParams = {
        dateRange, // End before start
      }
      const result = generator.validateParams(params)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(`Start date must be before end date: ${dateRange}`)
    })

    it('should validate duration limits', () => {
      const params: BookingLinkParams = {
        duration: 500, // Too long
      }
      const result = generator.validateParams(params)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Duration must be between 5 and 480 minutes')
    })

    it('should validate required parameters', () => {
      const params: BookingLinkParams = {
        service: 'haircut',
      }
      const constraints: ValidationConstraints = {
        required: ['service', 'date', 'time'],
      }
      const result = generator.validateParams(params, constraints)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain("Required parameter 'date' is missing")
      expect(result.errors).toContain("Required parameter 'time' is missing")
    })

    it('should generate warnings for conflicting parameters', () => {
      const params: BookingLinkParams = {
        quickBook: true,
        date: '2025-07-01',
        time: '10:00',
      }
      const result = generator.validateParams(params)
      expect(result.warnings).toContain('Quick book is enabled but specific date/time provided')
    })

    it('should warn about barber-service compatibility', () => {
      const params: BookingLinkParams = {
        service: 'shave',
        barber: 'jane-smith', // Jane doesn't offer shave service
      }
      const result = generator.validateParams(params)
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('generateCommonLinks', () => {
    it('should generate common link variations', () => {
      const links = generator.generateCommonLinks()
      expect(links.basic).toBe('https://bookedbarber.com/{slug}')
      expect(links.quickBook).toContain('quickBook=true')
      expect(links.service_haircut).toContain('service=haircut')
      expect(links['barber_john-doe']).toContain('barber=john-doe')
      expect(links.thisWeek).toContain('dateRange=')
      expect(links.nextWeek).toContain('dateRange=')
    })

    it('should apply base parameters to all links', () => {
      const baseParams: BookingLinkParams = {
        utm_source: 'website',
      }
      const links = generator.generateCommonLinks(baseParams)
      Object.values(links).forEach(link => {
        if (link.includes('?')) {
          expect(link).toContain('utm_source=website')
        }
      })
    })
  })

  describe('generateCampaignLinks', () => {
    it('should generate campaign-specific links', () => {
      const links = generator.generateCampaignLinks('summer2025')
      expect(links.facebook).toContain('campaign=summer2025')
      expect(links.facebook).toContain('utm_source=facebook')
      expect(links.instagram).toContain('utm_source=instagram')
      expect(links.google).toContain('utm_source=google')
      expect(links.email).toContain('utm_source=email')
      expect(links.sms).toContain('utm_source=sms')
    })
  })

  describe('createTemplate', () => {
    it('should create a booking link template', () => {
      const params: BookingLinkParams = {
        service: 'haircut',
        utm_source: 'facebook',
      }
      const template = generator.createTemplate(
        'Facebook Haircut Campaign',
        'Link for Facebook ads promoting haircuts',
        params,
        'marketing'
      )
      expect(template.name).toBe('Facebook Haircut Campaign')
      expect(template.category).toBe('marketing')
      expect(template.params).toEqual(params)
      expect(template.isActive).toBe(true)
      expect(template.id).toBeDefined()
    })
  })
})

describe('Utility Functions', () => {
  describe('generateBookingURL', () => {
    it('should generate URL with default base URL', () => {
      const url = generateBookingURL({ service: 'haircut' })
      expect(url).toBe('https://bookedbarber.com/{slug}?service=haircut')
    })

    it('should generate URL with custom base URL', () => {
      const url = generateBookingURL(
        { service: 'haircut' },
        'https://custom.domain.com/book'
      )
      expect(url).toBe('https://custom.domain.com/book?service=haircut')
    })
  })

  describe('parseBookingURL', () => {
    it('should parse URL and return parameters', () => {
      const url = 'https://bookedbarber.com/{slug}?service=haircut&barber=john-doe'
      const parsed = parseBookingURL(url)
      expect(parsed.params.service).toBe('haircut')
      expect(parsed.params.barber).toBe('john-doe')
    })
  })

  describe('validateBookingParams', () => {
    it('should validate parameters without service/barber data', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30) // 30 days from now
      
      const params: BookingLinkParams = {
        date: futureDate.toISOString().split('T')[0],
        time: '10:00',
        email: 'test@example.com',
      }
      const result = validateBookingParams(params)
      expect(result.isValid).toBe(true)
    })
  })

  describe('generateCommonBookingLinks', () => {
    it('should generate common links', () => {
      const links = generateCommonBookingLinks()
      expect(links.basic).toBe('https://bookedbarber.com/{slug}')
      expect(links.quickBook).toContain('quickBook=true')
    })
  })

  describe('generateCampaignBookingLinks', () => {
    it('should generate campaign links', () => {
      const links = generateCampaignBookingLinks('test-campaign')
      expect(links.facebook).toContain('campaign=test-campaign')
      expect(links.facebook).toContain('utm_source=facebook')
    })
  })
})

describe('URLEncoder', () => {
  describe('encodeParams', () => {
    it('should encode simple parameters', () => {
      const params = {
        service: 'haircut',
        barber: 'john doe',
      }
      const encoded = URLEncoder.encodeParams(params)
      expect(encoded).toBe('service=haircut&barber=john%20doe')
    })

    it('should encode array parameters', () => {
      const params = {
        services: ['haircut', 'shave'],
      }
      const encoded = URLEncoder.encodeParams(params)
      expect(encoded).toBe('services=haircut%2Cshave')
    })

    it('should skip null and undefined values', () => {
      const params = {
        service: 'haircut',
        barber: null,
        date: undefined,
      }
      const encoded = URLEncoder.encodeParams(params)
      expect(encoded).toBe('service=haircut')
    })
  })

  describe('decodeParams', () => {
    it('should decode simple parameters', () => {
      const queryString = 'service=haircut&barber=john%20doe'
      const decoded = URLEncoder.decodeParams(queryString)
      expect(decoded.service).toBe('haircut')
      expect(decoded.barber).toBe('john doe')
    })

    it('should decode array parameters', () => {
      const queryString = 'services=haircut%2Cshave'
      const decoded = URLEncoder.decodeParams(queryString)
      expect(decoded.services).toEqual(['haircut', 'shave'])
    })
  })

  describe('sanitizeParams', () => {
    it('should remove dangerous characters', () => {
      const params = {
        'service<script>': 'haircut"test',
        normal: 'safe-value',
      }
      const sanitized = URLEncoder.sanitizeParams(params)
      expect(sanitized.servicescript).toBe('haircuttest')
      expect(sanitized.normal).toBe('safe-value')
    })

    it('should handle array values', () => {
      const params = {
        services: ['haircut<script>', 'safe-service'],
      }
      const sanitized = URLEncoder.sanitizeParams(params)
      expect(sanitized.services).toEqual(['haircutscript', 'safe-service'])
    })
  })
})

describe('SimpleURLShortener', () => {
  let shortener: SimpleURLShortener

  beforeEach(() => {
    shortener = new SimpleURLShortener()
  })

  describe('shorten', () => {
    it('should generate short URL', async () => {
      const longUrl = 'https://bookedbarber.com/{slug}?service=haircut&barber=john-doe&date=2025-07-01'
      const shortUrl = await shortener.shorten(longUrl)
      expect(shortUrl).toMatch(/^https:\/\/short\.6fb\.app\/[a-z0-9]+$/)
    })

    it('should use custom slug when provided', async () => {
      const longUrl = 'https://bookedbarber.com/{slug}?service=haircut'
      const shortUrl = await shortener.shorten(longUrl, { customSlug: 'haircut-promo' })
      expect(shortUrl).toBe('https://short.6fb.app/haircut-promo')
    })
  })

  describe('expand', () => {
    it('should return the short URL as placeholder', async () => {
      const shortUrl = 'https://short.6fb.app/abc123'
      const expanded = await shortener.expand(shortUrl)
      expect(expanded).toBe(shortUrl)
    })
  })

  describe('getAnalytics', () => {
    it('should return default analytics', async () => {
      const shortUrl = 'https://short.6fb.app/abc123'
      const analytics = await shortener.getAnalytics(shortUrl)
      expect(analytics.clicks).toBe(0)
      expect(analytics.conversions).toBe(0)
      expect(analytics.conversionRate).toBe(0)
    })
  })
})

describe('Integration Tests', () => {
  it('should handle complete booking flow with all parameters', () => {
    const generator = new BookingLinkGenerator()
    generator.setServices(mockServices)
    generator.setBarbers(mockBarbers)

    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30) // 30 days from now

    const params: BookingLinkParams = {
      service: 'haircut',
      barber: 'john-doe',
      date: futureDate.toISOString().split('T')[0],
      time: '10:00',
      duration: 30,
      name: 'John Customer',
      email: 'john@customer.com',
      phone: '+1234567890',
      utm_source: 'facebook',
      utm_medium: 'social',
      utm_campaign: 'summer2025',
      ref: 'friend-referral',
    }

    // Generate URL
    const url = generator.generateURL(params)
    expect(url).toContain('service=haircut')
    expect(url).toContain('barber=john-doe')
    expect(url).toContain('utm_source=facebook')

    // Parse URL back
    const parsed = generator.parseURL(url)
    expect(parsed.params.service).toBe('haircut')
    expect(parsed.params.barber).toBe('john-doe')
    expect(parsed.params.utm_source).toBe('facebook')

    // Validate parameters
    const validation = generator.validateParams(parsed.params)
    expect(validation.isValid).toBe(true)
  })

  it('should handle URL round-trip with complex parameters', () => {
    const generator = new BookingLinkGenerator()
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() + 30) // 30 days from now
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 36) // 36 days from now
    const dateRange = `${startDate.toISOString().split('T')[0]},${endDate.toISOString().split('T')[0]}`
    
    const originalParams: BookingLinkParams = {
      service: ['haircut', 'shave'],
      dateRange,
      timeRange: '09:00,17:00',
      leadTime: 24,
      maxAdvance: 30,
      recurring: true,
      frequency: 'weekly',
      custom: {
        promo: 'SAVE20',
        referrer: 'friend',
      },
    }

    const url = generator.generateURL(originalParams)
    const parsed = generator.parseURL(url)

    // Check that key parameters survived the round trip
    expect(parsed.params.service).toEqual(['haircut', 'shave'])
    expect(parsed.params.dateRange).toBe(dateRange)
    expect(parsed.params.recurring).toBe(true)
    expect(parsed.params.leadTime).toBe(24)
  })
})