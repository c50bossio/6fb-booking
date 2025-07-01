// Simple test to verify our booking link generator works
const { generateBookingURL, parseBookingURL, validateBookingParams } = require('./lib/booking-link-generator.ts')

console.log('Testing Booking Link Generator...')

try {
  // Test URL generation
  const url = generateBookingURL({
    service: 'haircut',
    barber: 'john-doe',
    date: '2025-07-01',
    time: '10:00',
    utm_source: 'test'
  })
  
  console.log('✅ Generated URL:', url)
  
  // Test URL parsing
  const parsed = parseBookingURL(url)
  console.log('✅ Parsed URL:', JSON.stringify(parsed, null, 2))
  
  // Test validation
  const validation = validateBookingParams({
    service: 'haircut',
    date: '2025-07-01',
    time: '10:00',
    email: 'test@example.com'
  })
  
  console.log('✅ Validation:', JSON.stringify(validation, null, 2))
  
  console.log('\n🎉 All tests passed!')
  
} catch (error) {
  console.error('❌ Test failed:', error.message)
}